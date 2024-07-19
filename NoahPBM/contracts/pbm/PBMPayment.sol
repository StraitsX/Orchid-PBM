// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./ERC20Helper.sol";
import "./PBMTokenManager.sol";
import "./IPBM.sol";
import "../compliance/IPBMMerchantAddressList.sol";
import "../paymentmanager/NoahPaymentManager.sol";

/// @title A payment PBM relies on an external smart contract to manage the underlying ERC-20 tokens.
contract PBMPayment is ERC1155, Ownable, Pausable, IPBM, ReentrancyGuard {
    // address of the token manager. Token manager is incharge of managing the wrapped ERC-20 tokens
    address public pbmTokenManager = address(0);

    // address of the PBM-Addresslist which will define compliance or business logic behaviours.
    address public pbmAddressList = address(0);

    // address of the NoahPayment Manager to manage the token custody on behalf of this smartcontract
    address public noahPaymentManager = address(0);

    // tracks contract initialisation
    bool internal initialised = false;

    // time of expiry ( epoch )
    uint256 public contractExpiry;

    struct Payment {
        uint256[] tokenIds;
        uint256[] amounts;
        uint256 totalValue;
        uint256 refundedValue;
    }
    // sourceReferenceID => paymentIDAmount
    mapping(string => Payment) public paymentList;

    constructor() ERC1155("") {
        pbmTokenManager = address(new PBMTokenManager());
    }

    /// @notice Sets up basic information for the campaign PBM
    /// @param _expiry Global contract wide expiry ( in epoch )
    /// @param _pbmAddressList address of the PBMAddressList smartcontract for determining merchant targets.
    /// @param _noahPaymentManager address of the noahpayment manager oracle smart contract
    function initialise(uint256 _expiry, address _pbmAddressList, address _noahPaymentManager) external onlyOwner {
        require(!initialised, "PBM: Already initialised");
        require(Address.isContract(_pbmAddressList), "Invalid pbm address list");

        contractExpiry = _expiry;
        pbmAddressList = _pbmAddressList;
        noahPaymentManager = _noahPaymentManager;

        initialised = true;
    }

    function _addToPaymentList(
        string memory sourceReferenceID,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        uint256 totalValue
    ) internal {
        require(paymentList[sourceReferenceID].totalValue == 0, "Payment already exists");
        require(tokenIds.length == amounts.length, "Unequal ids and amounts supplied");
        require(totalValue > 0, "Total value should be greater than 0");
        paymentList[sourceReferenceID] = Payment(tokenIds, amounts, totalValue, 0);
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
     * - `spotType` should be either "XSGD" or "DSGD"
     */
    function createPBMTokenType(
        string memory companyName,
        address spotAddress,
        uint256 spotAmount,
        string memory spotType,
        uint256 tokenExpiry,
        address creator,
        string memory tokenURI,
        string memory postExpiryURI
    ) external override onlyOwner {
        PBMTokenManager(pbmTokenManager).createTokenType(
            companyName,
            spotAddress,
            spotAmount,
            spotType,
            tokenExpiry,
            creator,
            tokenURI,
            postExpiryURI,
            contractExpiry
        );
    }

    /**
     * @dev This function is used to mint PBM that is not fully backed by an underlying token.
     * Only owner can do this, since the existence of this function represents the ability to initiate
     * payments on NoahPBM
     */
    function mintUnbackedPBM(uint256 tokenId, uint256 amount, address receiver) external onlyOwner {
        require(!IPBMMerchantAddressList(pbmAddressList).isBlacklisted(receiver), "PBM: 'to' address blacklisted");
        PBMTokenManager(pbmTokenManager).increaseBalanceSupply(serialise(tokenId), serialise(amount));
        _mint(receiver, tokenId, amount, "");
    }

    /**
     * @dev See {IPBM-mint}.
     *     
     * IMPT: Before minting, the caller should approve the contract address to spend ERC-20 tokens on behalf of the caller.
     *       This can be done by calling the `approve` or `increaseMinterAllowance` functions of the ERC-20 contract and specifying `_spender` to be the PBM contract address. 
             Ref : https://eips.ethereum.org/EIPS/eip-20

     *  WARNING: 
     *  Any contracts that externally call these mint() and batchMint() functions should implement some sort of reentrancy guard procedure (such as OpenZeppelin's ReentrancyGuard).
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
    function mint(uint256 tokenId, uint256 amount, address receiver) external override whenNotPaused nonReentrant{
        require(!IPBMMerchantAddressList(pbmAddressList).isBlacklisted(receiver), "PBM: 'to' address blacklisted");
        uint256 valueOfNewTokens = amount * getTokenValue(tokenId);

        //Transfer the spot token from the user to this contract to wrap it
        address spotToken = getSpotAddress(tokenId);
        ERC20Helper.safeTransferFrom(spotToken, msg.sender, address(this), valueOfNewTokens);

        // Instruct noahpayment manager to pull money from this PBM smart contract and custody it.
        ERC20 erc20 = ERC20(spotToken);
        erc20.approve(noahPaymentManager, valueOfNewTokens);
        NoahPaymentManager(noahPaymentManager).depositForPBMAddress(address(this), spotToken, valueOfNewTokens);

        // Mint the PBM ERC1155
        PBMTokenManager(pbmTokenManager).increaseBalanceSupply(serialise(tokenId), serialise(amount));
        _mint(receiver, tokenId, amount, "");
    }

    /**
     * @dev See {IPBM-batchMint}.
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
     * - `tokenIds` should all be valid ids that have already been created
     * - `tokenIds` and `amounts` list need to have the same number of values
     * - caller should have the necessary amount of the ERC-20 tokens required to mint
     * - caller should have approved the PBM contract to spend the ERC-20 tokens
     * - receiver should not be blacklisted
     */
    function batchMint(
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        address receiver
    ) external override whenNotPaused nonReentrant{
        require(!IPBMMerchantAddressList(pbmAddressList).isBlacklisted(receiver), "PBM: 'to' address blacklisted");
        require(tokenIds.length == amounts.length, "Unequal ids and amounts supplied");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            uint256 amount = amounts[i];
            uint256 valueOfNewTokens = amount * getTokenValue(tokenId);

            // Get spotToken address based on tokenId
            address spotToken = getSpotAddress(tokenId);

            //Transfer the spot token from the user to this contract to wrap it
            ERC20Helper.safeTransferFrom(spotToken, msg.sender, address(this), valueOfNewTokens);

            // Instruct noahpayment manager to pull money from this PBM smart contract and custody it.
            ERC20 erc20 = ERC20(spotToken);
            erc20.approve(noahPaymentManager, valueOfNewTokens);
            NoahPaymentManager(noahPaymentManager).depositForPBMAddress(address(this), spotToken, valueOfNewTokens);

            // Increase balance supply
            PBMTokenManager(pbmTokenManager).increaseBalanceSupply(serialise(tokenId), serialise(amount));
        }

        _mintBatch(receiver, tokenIds, amounts, "");
    }

    /**
     * @dev Creates a payment request via NoahpaymentManager to
     * initiate an ERC20 token transfer to merchant.
     * @param from Wallet to deduct PBM From
     * @param to PBM payment address. Must be a merchant address.
     * @param id PBM Token Id
     * @param amount Number of PBM to send
     * @param sourceReferenceID payment source unique identifier.
     * Must be guaranteed to be unique globally across all chains to allow oracle fallback to another
     * chain if necessary
     * @param data metadata to include
     */
    function requestPayment(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        string memory sourceReferenceID,
        bytes memory data
    ) external whenNotPaused nonReentrant {
        _validateTransfer(from, to);
        require(
            IPBMMerchantAddressList(pbmAddressList).isMerchant(to),
            "Payments can only be made to a merchant address."
        );

        uint256 valueOfTokens = amount * getTokenValue(id);

        // Initiate payment of ERC20 tokens
        address spotToken = getSpotAddress(id);
        // Add to payment list
        _addToPaymentList(sourceReferenceID, serialise(id), serialise(amount), valueOfTokens);

        NoahPaymentManager(noahPaymentManager).createPayment(
            from,
            to,
            spotToken,
            valueOfTokens,
            sourceReferenceID,
            data
        );

        // Burn PBM ERC1155 Tokens
        _burn(from, id, amount);
        PBMTokenManager(pbmTokenManager).decreaseBalanceSupply(serialise(id), serialise(amount));

        emit MerchantPayment(from, to, serialise(id), serialise(amount), spotToken, valueOfTokens);
    }

    /**
     * @dev Creates a payment request via NoahpaymentManager to initiate an ERC20 token transfer to merchant.
     * Call this function to combine different PBM types token ids to create a payment.
     */
    function requestBatchPayment(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        string memory sourceReferenceID,
        bytes memory data
    ) external whenNotPaused nonReentrant {
        _validateTransfer(from, to);
        require(
            IPBMMerchantAddressList(pbmAddressList).isMerchant(to),
            "Payments can only be made to a merchant address."
        );
        require(ids.length == amounts.length, "Unequal ids and amounts supplied");

        uint256 sumOfTokens = 0;

        // ensure underlying spot token are fungible.
        address commonTokenAddress = address(0);

        for (uint256 i = 0; i < ids.length; i++) {
            uint256 tokenId = ids[i];
            address underlyingSpotToken = getSpotAddress(tokenId);

            if (i == 0) {
                commonTokenAddress = underlyingSpotToken;
            }

            require(
                commonTokenAddress == underlyingSpotToken,
                "Batched tokens must all share the same underlying spot token type. Swap underlying if required first"
            );

            uint256 amount = amounts[i];
            uint256 valueOfTokens = amount * getTokenValue(tokenId);
            sumOfTokens += valueOfTokens;
        }

        // Add to payment list
        _addToPaymentList(sourceReferenceID, ids, amounts, sumOfTokens);

        _burnBatch(from, ids, amounts);
        PBMTokenManager(pbmTokenManager).decreaseBalanceSupply(ids, amounts);
        NoahPaymentManager(noahPaymentManager).createPayment(
            from,
            to,
            commonTokenAddress,
            sumOfTokens,
            sourceReferenceID,
            data
        );

        emit MerchantPayment(from, to, ids, amounts, commonTokenAddress, sumOfTokens);
    }

    /**
     * @dev See {IPBM-revertPaymentForCancel}.
     * Called by noah payment manager to revert the payment process when canceling payment.
     * no underlying ERC20 tokens movement will be done.
     */
    function revertPaymentForCancel(address mintTo, string memory sourceReferenceID) external {
        // check if caller is noah payment manager
        require(msg.sender == noahPaymentManager, "PBM: Only noah payment manager can revert payment");
        Payment memory payment = paymentList[sourceReferenceID];

        // Mint back the PBM ERC1155 without underlying ERC20 tokens movement
        PBMTokenManager(pbmTokenManager).increaseBalanceSupply(payment.tokenIds, payment.amounts);
        _mintBatch(mintTo, payment.tokenIds, payment.amounts, "");
    }

    /**
     * @dev See {IPBM-revertPaymentForRefund}.
     * Called by noah payment manager to revert the payment process when refund a payment.
     * no underlying ERC20 tokens movement will be done.
     */
    function revertPaymentForRefund(address mintTo, string memory sourceReferenceID, uint256 refundValue) external {
        // check if caller is noah payment manager
        require(msg.sender == noahPaymentManager, "PBM: Only noah payment manager can revert payment");
        Payment memory payment = paymentList[sourceReferenceID];
        require(refundValue <= (payment.totalValue - payment.refundedValue), "PBM: Refund value exceeds remaining value");

        if (refundValue == payment.totalValue) {
            // full refund
            // Mint back the PBM ERC1155 without underlying ERC20 tokens movement
            PBMTokenManager(pbmTokenManager).increaseBalanceSupply(payment.tokenIds, payment.amounts);
            _mintBatch(mintTo, payment.tokenIds, payment.amounts, "");
        } else {
            // partial refund
            // assume token id 0 will always be $0.01 in XSGD (10000) and partial refund only refund in token id 0
            require(getTokenValue(0) == 10000, "PBM: Token id 0 is not $0.01 in XSGD");
            uint256 tokenAmount = refundValue / 10000;

            // Mint back the PBM ERC1155 without underlying ERC20 tokens movement
            PBMTokenManager(pbmTokenManager).increaseBalanceSupply(serialise(0), serialise(tokenAmount));
            _mint(mintTo, 0, tokenAmount, "");
        }

        // update refundedValue
        paymentList[sourceReferenceID].refundedValue += refundValue;
    }

    /**
     * @dev See {IPBM-safeTransferFrom}.
     *
     *
     * Requirements:
     *
     * - contract must not be paused
     * - tokens must not be expired
     * - `tokenId` should be a valid ids that has already been created
     * - caller should have the PBMs that are being transferred (or)
     *          caller should have the approval to spend the PBMs on behalf of the owner (`from` addresss)
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override(ERC1155, IPBM) whenNotPaused nonReentrant {
        _validateTransfer(from, to);

        if (IPBMMerchantAddressList(pbmAddressList).isMerchant(to)) {
            uint256 valueOfTokens = amount * getTokenValue(id);

            // Burn PBM ERC1155 Tokens
            _burn(from, id, amount);
            PBMTokenManager(pbmTokenManager).decreaseBalanceSupply(serialise(id), serialise(amount));

            // Initiate payment of ERC20 tokens
            address spotToken = getSpotAddress(id);
            NoahPaymentManager(noahPaymentManager).createDirectPayment(from, to, spotToken, valueOfTokens, data);

            emit MerchantPayment(from, to, serialise(id), serialise(amount), spotToken, valueOfTokens);
        } else {
            _safeTransferFrom(from, to, id, amount, data);
        }
    }

    /**
     * @dev See {IPBM-safeBatchTransferFrom}.
     *
     *
     * Requirements:
     *
     * - contract must not be paused
     * - tokens must not be expired
     * - `tokenIds` should all be  valid ids that has already been created
     * - `tokenIds` and `amounts` list need to have the same number of values
     * - caller should have the PBMs that are being transferred (or)
     *          caller should have the approval to spend the PBMs on behalf of the owner (`from` addresss)
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public override(ERC1155, IPBM) whenNotPaused nonReentrant {
        _validateTransfer(from, to);
        require(ids.length == amounts.length, "Unequal ids and amounts supplied");

        if (IPBMMerchantAddressList(pbmAddressList).isMerchant(to)) {
            uint256 sumOfTokens = 0;

            // ensure underlying spot token are fungible.
            address commonTokenAddress = address(0);

            for (uint256 i = 0; i < ids.length; i++) {
                uint256 tokenId = ids[i];
                address underlyingSpotToken = getSpotAddress(tokenId);

                if (i == 0) {
                    commonTokenAddress = underlyingSpotToken;
                }

                require(
                    commonTokenAddress == underlyingSpotToken,
                    "Batched tokens must all share the same underlying spot token type. Swap underlying if required first"
                );

                uint256 amount = amounts[i];
                uint256 valueOfTokens = amount * getTokenValue(tokenId);
                sumOfTokens += valueOfTokens;
            }

            _burnBatch(from, ids, amounts);
            PBMTokenManager(pbmTokenManager).decreaseBalanceSupply(ids, amounts);
            NoahPaymentManager(noahPaymentManager).createDirectPayment(from, to, commonTokenAddress, sumOfTokens, data);

            emit MerchantPayment(from, to, ids, amounts, commonTokenAddress, sumOfTokens);
        } else {
            _safeBatchTransferFrom(from, to, ids, amounts, data);
        }
    }

    function _validateTransfer(address from, address to) internal {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: caller is not token owner nor approved"
        );
        require(!IPBMMerchantAddressList(pbmAddressList).isBlacklisted(to), "PBM: 'to' address blacklisted");
    }

    /**
     * @dev See {IPBM-revokePBM}.
     *
     * Requirements:
     *`
     * - `tokenId` should be a valid ids that has already been created
     * - caller must be the creator of the tokenType
     * - token must be expired
     *
     * Note that the refund target is the PBM original creator.
     * Hence anyone who minted the tokenId PBM and is not the original
     * creator would not be refunded upon token revoked
     */
    function revokePBM(uint256 tokenId) external override whenNotPaused nonReentrant {
        uint256 valueOfTokens = PBMTokenManager(pbmTokenManager).getPBMRevokeValue(tokenId);

        // Revoke + Verify msg.sender is the creator of the PBM
        PBMTokenManager(pbmTokenManager).revokePBM(tokenId, msg.sender);

        address spotToken = getSpotAddress(tokenId);

        // transfering ERC20 tokens back to the creator
        NoahPaymentManager(noahPaymentManager).withdrawFromPBMAddress(
            address(this),
            msg.sender,
            spotToken,
            valueOfTokens
        );

        emit PBMrevokeWithdraw(msg.sender, tokenId, spotToken, valueOfTokens);
    }

    /**
     * @dev See {IPBM-getTokenDetails}.
     *
     */
    function getTokenDetails(
        uint256 tokenId
    ) external view override returns (string memory, uint256, uint256, address) {
        return PBMTokenManager(pbmTokenManager).getTokenDetails(tokenId);
    }

    /**
     * @dev See {IPBM-getTokenValue}.
     *
     */
    function getTokenValue(uint256 tokenId) public view override returns (uint256) {
        return PBMTokenManager(pbmTokenManager).getTokenValue(tokenId);
    }

    /**
     * @dev See {IPBM-balanceOf}.
     */
    function balanceOf(address account, uint256 tokenId) public view override returns (uint256) {
        require(account != address(0), "ERC1155: balance query for the zero address");
        if (PBMTokenManager(pbmTokenManager).areTokensValid(serialise(tokenId))) {
            return super.balanceOf(account, tokenId);
        } else {
            return 0;
        }
    }

    /**
     * @dev See {IPBM-getSpotAddress}.
     *
     */
    function getSpotAddress(uint256 tokenId) public view override returns (address) {
        return PBMTokenManager(pbmTokenManager).getSpotAddress(tokenId);
    }

    /**
     * @dev See {IPBM-uri}.
     *
     */
    function uri(uint256 tokenId) public view override(ERC1155, IPBM) returns (string memory) {
        return PBMTokenManager(pbmTokenManager).uri(tokenId);
    }

    // @dev recoverAllERC20 is a function to recover all the balance of a specific ERC20 token from the PBM contract
    // @param _token ERC20 token address
    // requirements:
    // - caller must be the owner
    function recoverAllERC20(address _token) public onlyOwner {
        ERC20 erc20 = ERC20(_token);
        NoahPaymentManager(noahPaymentManager).withdrawFromPBMAddress(
            address(this),
            owner(),
            address(erc20),
            erc20.balanceOf(address(this))
        );
    }

    // @dev recoverERC20 is a function to recover specific amount of a
    // ERC20 token from the NoahPaymentManager contract
    // @param _token ERC20 token address
    // @param amount amount of ERC20 token to recover
    // requirements:
    // - caller must be the owner
    function recoverERC20(address _token, uint256 amount) public onlyOwner {
        ERC20 erc20 = ERC20(_token);
        NoahPaymentManager(noahPaymentManager).withdrawFromPBMAddress(address(this), owner(), address(erc20), amount);
    }

    // @dev see { PBMTokenManager - updateTokenExpiry}
    // requirements:
    // - caller must be the owner
    function updateTokenExpiry(uint256 tokenId, uint256 expiry) external onlyOwner {
        PBMTokenManager(pbmTokenManager).updateTokenExpiry(tokenId, expiry);
    }

    // @dev see { PBMTokenManager - updateTokenURI}
    // requirements:
    // - caller must be the owner
    function updateTokenURI(uint256 tokenId, string memory tokenURI) external onlyOwner {
        PBMTokenManager(pbmTokenManager).updateTokenURI(tokenId, tokenURI);
    }

    // @dev see { PBMTokenManager - updatePostExpiryURI}
    // requirements:
    // - caller must be the owner
    function updatePostExpiryURI(uint256 tokenId, string memory postExpiryURI) external onlyOwner {
        PBMTokenManager(pbmTokenManager).updatePostExpiryURI(tokenId, postExpiryURI);
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
}
