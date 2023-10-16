// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./ERC20Helper.sol";
import "./PBMTokenManager.sol";
import "./IPBM.sol";

contract PBM is ERC1155, Ownable, Pausable, ReentrancyGuard, IPBM {
    // undelrying ERC-20 tokens
    address public spotToken = address(0);
    // address of the token manager
    address public pbmTokenManager = address(0);

    // tracks contract initialisation
    bool internal initialised = false;
    // time of expiry ( epoch )
    uint256 public contractExpiry;

    constructor() ERC1155("") {
        pbmTokenManager = address(new PBMTokenManager());
    }

    function initialise(address _spotToken, uint256 _expiry) external override onlyOwner {
        require(!initialised, "PBM: Already initialised");
        require(Address.isContract(_spotToken), "Invalid spot token");
        spotToken = _spotToken;
        contractExpiry = _expiry;
        initialised = true;
    }

    enum OrderStatus {
        PENDING,
        REDEEMED,
        CANCELLED
    }

    struct Order {
        uint256 orderValue; // how much this order cost.
        string orderId;
        address customerWallet;
        address fundDisbursementAddress; // need this to check upon redemption
        OrderStatus status;
    }

    // user_address -> token_id -> UserBalance
    // token_id being the account number
    // user_address is the user’s identifier
    mapping(address => mapping(uint256 => UserBalance)) private userBalances;

    function getUserBalance(
        address user,
        uint256 tokenId
    ) public view whenNotPaused returns (UserBalance memory userBalance) {
        UserBalance memory userBal = userBalances[user][tokenId];
        return userBal;
    }

    // order id hash => order mapping
    mapping(bytes32 => Order) public orders;

    // whitelist mapping
    mapping(address => bool) public whitelist;

    modifier onlyWhitelisted() {
        require(whitelist[_msgSender()], "You are not authorized to call this function");
        _;
    }

    modifier orderExists(string memory orderId) {
        bytes32 orderIdHash = keccak256(abi.encodePacked(orderId));
        require(orders[orderIdHash].orderValue > 0, "Order with this ID does not exist");
        _;
    }

    function addToWhitelist(address account) external onlyOwner {
        whitelist[account] = true;
    }

    function removeFromWhitelist(address account) external onlyOwner {
        whitelist[account] = false;
    }

    /**
     * @dev See {IPBM-createOrder}.
     *
     * Note: user needs to call setApprovalForAll() to approve the caller to create order on behalf of user

     * Requirements:
     *
     * - caller must be token owner or approved to create order on behalf of user
     * - `customerWalletAddr` must not be the zero address.
     * - `fundDisbursementAddr` must not be the zero address.
     * - `orderValue` must be greater than 0
     * - `orderId` must be unique
     * - user must have sufficient available balance
     * - contract must not be paused
     */
    function createOrder(
        address customerWalletAddr,
        uint256 tokenId,
        string memory orderId,
        uint256 orderValue,
        address fundDisbursementAddr
    ) external whenNotPaused {
        require(
            customerWalletAddr == _msgSender() || isApprovedForAll(customerWalletAddr, _msgSender()),
            "Caller is not token owner or approved to create order on behalf of user"
        );
        _createOrder(customerWalletAddr, tokenId, orderId, orderValue, fundDisbursementAddr);
    }

    /**
     * @dev See {IPBM-createOrderGrab}.
     *
     * Note: createOrderGrab doesn't require user approval to create order on behalf of user
     *       instead if can only be called by whitelisted wallets

     * Requirements:
     *
     * - only whitelisted wallets can call this function
     * - `customerWalletAddr` must not be the zero address.
     * - `fundDisbursementAddr` must not be the zero address.
     * - `orderValue` must be greater than 0
     * - `orderId` must be unique
     * - user must have sufficient available balance
     * - contract must not be paused
     */
    function createOrderGrab(
        address grabWalletAddr,
        uint256 tokenId,
        string memory orderId,
        uint256 orderValue,
        address fundDisbursementAddr
    ) external whenNotPaused onlyWhitelisted {
        _createOrder(grabWalletAddr, tokenId, orderId, orderValue, fundDisbursementAddr);
    }

    function _createOrder(
        address walletAddr,
        uint256 tokenId,
        string memory orderId,
        uint256 orderValue,
        address fundDisbursementAddr
    ) private {
        require(walletAddr != address(0), "Invalid customer address");
        require(orderValue > 0, "Invalid order value");
        require(fundDisbursementAddr != address(0), "Invalid fund disbursement address");

        bytes32 orderIdHash = keccak256(abi.encodePacked(orderId));
        require(orders[orderIdHash].orderValue == 0, "Order with this ID already exists");

        UserBalance storage userBalance = userBalances[walletAddr][tokenId];
        require(userBalance.availableBalance >= orderValue, "Insufficient available funds");

        orders[orderIdHash] = Order(orderValue, orderId, walletAddr, fundDisbursementAddr, OrderStatus.PENDING);

        userBalance.availableBalance -= orderValue;

        emit OrderCreated(walletAddr, orderId, orderValue, fundDisbursementAddr);
    }

    function cancelOrder(
        string memory orderId,
        uint256 tokenId
    ) external whenNotPaused onlyWhitelisted orderExists(orderId) {
        bytes32 orderIdHash = keccak256(abi.encodePacked(orderId));
        require(orders[orderIdHash].status == OrderStatus.PENDING, "This order is no longer pending");
        uint256 order_value = orders[orderIdHash].orderValue;

        UserBalance storage userBalance = userBalances[orders[orderIdHash].customerWallet][tokenId];
        require(
            userBalance.walletBalance >= (userBalance.availableBalance + order_value),
            "Avail balance can never be greater than walletBalance"
        );
        require(userBalance.walletBalance > 0, "Invalid user balance.");

        // increase the availableBalance.
        // essentially in pay and cancel pay, we only touch the availableBalance.
        // wallet balance is only edited in the event of p2p transfer, or successful redeem.
        orders[orderIdHash].status = OrderStatus.CANCELLED;
        userBalance.availableBalance += order_value;
        emit OrderCanceled(orderId);
    }

    // update order status
    // credit merchant wallet
    // TBD: do we need to check if fundDisbursementAddress is a merchant?
    function redeemOrder(
        string memory orderId,
        uint256 tokenId,
        address userWallet
    ) external whenNotPaused onlyWhitelisted orderExists(orderId) {
        bytes32 orderIdHash = keccak256(abi.encodePacked(orderId));
        // this check is very important, to prevent this function() from being called more than once.
        require(orders[orderIdHash].status == OrderStatus.PENDING, "This order is no longer pending");
        uint256 order_value = orders[orderIdHash].orderValue;
        UserBalance storage userBalance = userBalances[userWallet][tokenId];
        require(userBalance.walletBalance >= order_value, "Insufficient wallet balance");

        require(
            userBalance.walletBalance >= userBalance.availableBalance,
            "Something is wrong, availableBalance must be deducted first"
        );
        userBalance.walletBalance -= order_value;

        orders[orderIdHash].status = OrderStatus.REDEEMED;

        ERC20Helper.safeTransfer(spotToken, orders[orderIdHash].fundDisbursementAddress, order_value);

        // burn the token after order redemption
        _burn(userWallet, tokenId, 1);
        emit OrderRedeemed(userWallet, orderId);
    }

    /**
     * @dev See {IPBM-createPBMTokenType}.
     *
     * Requirements:
     *
     * - caller must be owner
     * - contract must not be expired
     * - `tokenExpiry` must be less than contract expiry
     * - `amount` should not be 0
     */

    function createPBMTokenType(
        uint256 spotAmount,
        uint256 tokenExpiry,
        string memory tokenURI,
        string memory postExpiryURI
    ) external override onlyOwner {
        PBMTokenManager(pbmTokenManager).createTokenType(
            spotAmount,
            tokenExpiry,
            tokenURI,
            postExpiryURI,
            contractExpiry
        );
    }

    /**
     * @dev See {IPBM-mint}.
     *
     *  WARNING: Any contracts that externally call these mint() and batchMint() functions should implement some sort of reentrancy guard procedure (such as OpenZeppelin's ReentrancyGuard).
     *
     * Requirements:
     *
     * - contract must not be paused
     * - tokens must not be expired
     * - `tokenId` should be a valid id that has already been created
     * - when recipient is not whitelisted and does not have the token id, the amount should be 1
     */

    function mint(uint256 tokenId, uint256 amount, address recipientAddress) public override whenNotPaused onlyOwner {
        // do we need to check whether user address already holds the account/tokenId?
        // block mint to user alr holds the account/tokenId
        require(recipientAddress != address(0), "Invalid user address");
        require(
            balanceOf(recipientAddress, tokenId) == 0 || whitelist[recipientAddress] == true,
            "Recipient address is not whitelisted or already holds this account"
        );

        _mint(recipientAddress, tokenId, amount, "");
    }

    // instead of minting multiple token ids to a single address
    // mintBatch here would mint one token id (account) to multiple user addresses
    function mintBatch(
        uint256 tokenId,
        uint256 amount,
        address[] memory recipientAddresses
    ) public whenNotPaused onlyOwner {
        uint256 recipientCount = recipientAddresses.length;

        // Loop over each address and mint
        for (uint256 i = 0; i < recipientCount; i++) {
            address recipientAddress = recipientAddresses[i];
            require(recipientAddress != address(0), "Invalid recipient address");
            require(
                balanceOf(recipientAddress, tokenId) == 0 || whitelist[recipientAddress] == true,
                "Recipient address is not whitelisted or already holds this account"
            );
            _mint(recipientAddress, tokenId, amount, "");
        }
    }

    /**
     * @dev See {IPBM-addUserBalance}.
     *
     *  WARNING: Any contracts that externally call these mint() and batchMint() functions should implement some sort of reentrancy guard procedure (such as OpenZeppelin's ReentrancyGuard).
     *
     * Requirements:
     *
     * - contract must not be paused
     * - tokens must not be expired
     * - `tokenId` should be a valid id that has already been created
     * - recipient should have the token id
     * - `spotAmount` should be greater than 0
     */
    // spotAmount is the amount of spotToken to be transferred from caller to this contract
    // spotAmount = walletBalance * amountOfUserAddresses
    function addUserBalance(
        uint256 tokenId,
        uint256 spotAmount,
        address recipientAddress
    ) external whenNotPaused onlyOwner {
        require(recipientAddress != address(0), "Invalid recipient address");
        require(spotAmount > 0, "Invalid spot amount");
        require(balanceOf(recipientAddress, tokenId) > 0, "Recipient does not have the token id");
        // transfer spotToken from caller to this contract
        ERC20Helper.safeTransferFrom(spotToken, _msgSender(), address(this), spotAmount);

        // update user balance
        UserBalance storage userBalance = userBalances[recipientAddress][tokenId];
        userBalance.walletBalance += spotAmount;
        userBalance.availableBalance += spotAmount;
        emit FundsAdded(recipientAddress, spotAmount);
    }

    /**
     * @dev See {IPBM-safeTransferFrom}.
     *
     * IMPT: This function doesn't actually transfer the underlying ERC20 tokens. Instead, it only updates the user balances within this contract.
     *       And should only be used for whitelisted wallets to airdrop to user wallets.
     * Note:
     *
     * 1) orchestrator to airdrop to user addresses
     * 2) P2P transfer is disabled for non whitelisted wallets
     *
     * - transferAmount here is the amount of underlying ERC20 tokens instead of the amount of PBM tokens
     *
     * Requirements:
     *
     * - contract must not be paused.
     * - `transferAmount` in the _safeTransferFrom should be exactly 10 and is referring to underlying ERC20 token.
     * - sender (`from` address) should have a positive available balance.
     * - recipient (`to` address) should not be the zero address.
     * - caller must be whitelisted.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        uint256 transferAmount,
        bytes memory data
    ) public override(ERC1155, IPBM) whenNotPaused onlyWhitelisted nonReentrant {
        require(to != address(0), "Invalid recipient address");
        require(from == _msgSender() || isApprovedForAll(from, _msgSender()), "Caller is not token owner or approved");
        require(userBalances[from][tokenId].availableBalance >= transferAmount, "Invalid available balance");
        // redundant check
        require(userBalances[from][tokenId].walletBalance >= transferAmount, "Invalid wallet balance");

        // if to user has no token id and from user is whitelisted call _safeTransferFrom and update userBalances
        if (balanceOf(to, tokenId) == 0) {
            _safeTransferFrom(from, to, tokenId, 1, data);
        }
        updateUserBalances(from, to, tokenId, transferAmount);
    }

    /**
     * @dev See {IPBM-safeBatchTransferFrom}.
     *
     * IMPT: This function doesn't actually transfer the underlying ERC20 tokens. Instead, it only updates the user balances within this contract.
     *
     * Note:
     * - this function is very unlikely to be used.
     *
     * Requirements:
     *
     * - contract must not be paused.
     * - sender (`from` address) should have a positive available balance for each tokenId.
     * - recipient (`to` address) should not be the zero address.
     * - caller must be whitelisted.
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory tokenIds,
        uint256[] memory transferAmounts,
        bytes memory data
    ) public override(ERC1155, IPBM) whenNotPaused onlyWhitelisted nonReentrant {
        require(to != address(0), "Invalid recipient address");
        require(from == _msgSender() || isApprovedForAll(from, _msgSender()), "Caller is not token owner or approved");
        require(tokenIds.length == transferAmounts.length, "TokenIDs and amounts length mismatch");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            uint256 transferAmount = transferAmounts[i];
            require(userBalances[from][tokenId].availableBalance >= transferAmount, "Invalid available balance");
            require(userBalances[from][tokenId].walletBalance >= transferAmount, "Invalid wallet balance");

            // if to user has no token id and from user is whitelisted call _safeTransferFrom and update userBalances
            if (balanceOf(to, tokenId) == 0) {
                _safeTransferFrom(from, to, tokenId, 1, data);
            }
            updateUserBalances(from, to, tokenId, transferAmount);
        }
    }

    function updateUserBalances(address from, address to, uint256 tokenId, uint256 transferAmount) private {
        userBalances[from][tokenId].walletBalance -= transferAmount;
        userBalances[from][tokenId].availableBalance -= transferAmount;

        userBalances[to][tokenId].walletBalance += transferAmount;
        userBalances[to][tokenId].availableBalance += transferAmount;

        emit UserBalanceUpdated(
            from,
            tokenId,
            userBalances[from][tokenId].walletBalance,
            userBalances[from][tokenId].availableBalance
        );
        emit UserBalanceUpdated(
            to,
            tokenId,
            userBalances[to][tokenId].walletBalance,
            userBalances[to][tokenId].availableBalance
        );
    }

    /**
     * @dev See {IPBM-revokePBM}.
     * Requirements:
     *
     * - caller must be the owner of the contract
     * - token must be expired
     */

    function revokePBM() external onlyOwner whenNotPaused {
        ERC20 erc20 = ERC20(spotToken);
        uint256 valueOfTokens = erc20.balanceOf(address(this));
        ERC20Helper.safeTransfer(address(erc20), owner(), valueOfTokens);

        emit PBMrevokeWithdraw(_msgSender(), spotToken, valueOfTokens);
    }

    /**
     * @dev See {IPBM-getTokenDetails}.
     *
     */
    function getTokenDetails(uint256 tokenId) external view override returns (uint256, uint256) {
        return PBMTokenManager(pbmTokenManager).getTokenDetails(tokenId);
    }

    /**
     * @dev See {IPBM-uri}.
     *
     */
    function uri(uint256 tokenId) public view override(ERC1155, IPBM) returns (string memory) {
        return PBMTokenManager(pbmTokenManager).uri(tokenId);
    }

    /**
     * @dev see {Pausable _pause}
     *
     * Requirements :
     * - caller should be owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev see {Pausable _unpause}
     *
     * Requirements :
     * - caller should be owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    event OrderCreated(address customer, string orderId, uint256 orderValue, address fundDisbursementAddress);
    event OrderRedeemed(address customer, string orderId);
    event OrderCanceled(string orderId);
    event FundsAdded(address customer, uint256 spotAmount);
    event UserBalanceUpdated(
        address indexed user,
        uint256 tokenId,
        uint256 newWalletBalance,
        uint256 newAvailableBalance
    );
}
