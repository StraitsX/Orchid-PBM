// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./ERC20Helper.sol";
import "./PBMTokenManager.sol";
import "./IPBM.sol";

contract PBM is ERC1155, Ownable, Pausable, IPBM {
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

    struct UserBalance {
        uint256 walletBalance;
        uint256 availableBalance;
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

    function createOrder(
        address customerWalletAddr,
        uint256 tokenId,
        string memory orderId,
        uint256 orderValue,
        address fundDisbursementAddr
    ) external whenNotPaused onlyWhitelisted {
        require(customerWalletAddr != address(0), "Invalid customer address");
        require(orderValue > 0, "Invalid order value");
        require(fundDisbursementAddr != address(0), "Invalid fund disbursement address");

        bytes32 orderIdHash = keccak256(abi.encodePacked(orderId));
        // must protect this, this ensures cannot call createOrder multiple times
        require(orders[orderIdHash].orderValue == 0, "Order with this ID already exists");
        // move the user's currentBalance into the order list
        // create Orders with the order_id, and how much this order_id cost.
        // update UserBalance[user][token_id]; currentBalance
        UserBalance storage userBalance = userBalances[customerWalletAddr][tokenId];
        require(userBalance.availableBalance >= orderValue, "Insufficient available funds");

        orders[orderIdHash] = Order(orderValue, orderId, customerWalletAddr, fundDisbursementAddr, OrderStatus.PENDING);

        userBalance.availableBalance -= orderValue;

        emit OrderCreated(customerWalletAddr, orderId, orderValue, fundDisbursementAddr);
    }

    function cancelOrder(
        string memory orderId,
        uint256 tokenId
    ) external whenNotPaused onlyWhitelisted orderExists(orderId) {
        bytes32 orderIdHash = keccak256(abi.encodePacked(orderId));
        require(orders[orderIdHash].status == OrderStatus.PENDING, "This order is no longer pending");
        uint256 order_value = orders[orderIdHash].orderValue;

        UserBalance storage userBalance = userBalances[_msgSender()][tokenId];
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
     * IMPT: Before minting, the caller should approve the contract address to spend ERC-20 tokens on behalf of the caller.
     *       This can be done by calling the `approve` or `increaseMinterAllowance` functions of the ERC-20 contract and specifying `_spender` to be the PBM contract address. 
             Ref : https://eips.ethereum.org/EIPS/eip-20

       WARNING: Any contracts that externally call these mint() and batchMint() functions should implement some sort of reentrancy guard procedure (such as OpenZeppelin's ReentrancyGuard).
     *
     * Requirements:
     *
     * - contract must not be paused
     * - tokens must not be expired
     * - `tokenId` should be a valid id that has already been created
     * - caller should have the necessary amount of the ERC-20 tokens required to mint
     * - caller should have approved the PBM contract to spend the ERC-20 tokens
     * - receiver should not be blacklisted
     */

    function mint(uint256 tokenId, uint256 amount, address userAddress) public override whenNotPaused onlyOwner {
        // do we need to check whether user address already holds the account/tokenId?
        // block mint to user alr holds the account/tokenId
        require(balanceOf(userAddress, tokenId) == 0, "Address already holds this account");
        require(userAddress != address(0), "Invalid user address");
        require(amount == 1, "Amount can only be 1");

        // get token value here checks if the tokenId is created alr
        uint256 spotAmount = PBMTokenManager(pbmTokenManager).getTokenValue(tokenId);

        UserBalance storage userBalance = userBalances[userAddress][tokenId];
        userBalance.walletBalance += spotAmount;
        userBalance.availableBalance += spotAmount;

        ERC20Helper.safeTransferFrom(spotToken, _msgSender(), address(this), spotAmount);
        emit FundsAdded(userAddress, spotAmount);

        _mint(userAddress, tokenId, amount, "");
    }

    // instead of minting multiple token ids to a single address
    // mintBatch here would mint one token id (account) to multiple user addresses
    function mintBatch(uint256 tokenId, uint256 amount, address[] memory userAddresses) public whenNotPaused onlyOwner {
        // get token value here checks if the tokenId is created alr
        uint256 spotAmount = PBMTokenManager(pbmTokenManager).getTokenValue(tokenId);
        uint256 usersCount = userAddresses.length;
        uint256 totalSpotAmount = spotAmount * usersCount;
        ERC20Helper.safeTransferFrom(spotToken, _msgSender(), address(this), totalSpotAmount);

        // Loop over each address and mint
        for (uint256 i = 0; i < usersCount; i++) {
            address userAddress = userAddresses[i];
            require(balanceOf(userAddress, tokenId) == 0, "Address already holds this account");
            require(userAddress != address(0), "Invalid user address");
            require(amount == 1, "Amount can only be 1 for each token");

            UserBalance storage userBalance = userBalances[userAddress][tokenId];
            userBalance.walletBalance += spotAmount;
            userBalance.availableBalance += spotAmount;
            _mint(userAddress, tokenId, amount, "");
            emit FundsAdded(userAddress, spotAmount);
        }
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

    function serialise(uint256 num) internal pure returns (uint256[] memory) {
        uint256[] memory array = new uint256[](1);
        array[0] = num;
        return array;
    }

    event OrderCreated(address customer, string orderId, uint256 orderValue, address fundDisbursementAddress);
    event OrderRedeemed(address customer, string orderId);
    event OrderCanceled(string orderId);
    event FundsAdded(address customer, uint256 spotAmount);
}
