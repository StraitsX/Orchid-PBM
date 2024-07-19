// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { INoahPaymentStateMachine } from "./INoahPaymentStateMachine.sol";
import { INoahPBMTreasury } from "./INoahPBMTreasury.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../pbm/ERC20Helper.sol";
import "../pbm/IPBM.sol";

/**
 * TODO TEST Cases listing:
 */

contract NoahPaymentManager is Ownable, Pausable, AccessControl, INoahPaymentStateMachine, INoahPBMTreasury, ReentrancyGuard {
    /////////////////// INoahPBMTreasury functions  //////////////////////////

    // Keeps track of the liability to each Campaign PBM Contract. Campain PBM is responsible for accounting.
    // pbmContract address => {ERC20Token1 => Amt, ERC20Token2 => Amt}
    mapping(address => mapping(address => uint256)) internal pbmTokenBalance;
    // Keeps track of pending balances
    mapping(address => mapping(address => uint256)) internal pendingPBMTokenBalance;

    enum PaymentStatus { NOT_CREATED, PENDING, COMPLETED, CANCELLED, REFUNDED, PARTIAL_REFUNDED }

    // Pending payment details struct
    struct Payment {
        address campaignPBM;
        address to;
        address erc20Token;
        uint256 erc20TokenValue;
        uint256 refundedValue;
        PaymentStatus status;
    }

    // Keeps track of erc20 token value of each paymentUniqueID
    // paymentUniqueID is a keccak256 hash of from address and sourceReferenceID
    // paymentUniqueID => Payment
    mapping(bytes32 => Payment) internal paymentList;

    bytes32 public constant NOAH_CRAWLER_ROLE = keccak256("NOAH_PAYMENT_CRAWLER");

    // tracks contract initialisation
    bool internal initialised = false;

    // reserve storage slots. Useful in the future if
    // subclasses of this contract is used and modification to the base logic requires state management
    address public slot1Reserved = address(0);
    address public slot2Reserved = address(0);
    address public slot3Reserved = address(0);
    address public slot4Reserved = address(0);
    address public slot5Reserved = address(0);
    address public slot6Reserved = address(0);
    address public slot7Reserved = address(0);
    address public slot8Reserved = address(0);
    address public slot9Reserved = address(0);
    address public slot10Reserved = address(0);

    constructor() {
        // Allows Owner to be role base access control manager
        _grantRole(DEFAULT_ADMIN_ROLE, owner());
    }

    function initialise() external {
        require(!initialised, "Noah PBM: Already initialised");
        initialised = true;
    }


    /// @notice Internal function to deposit ERC20 tokens for a campaign PBM address
    function _internalDepositForPBMAddress(
        address creditForPBM,
        address erc20token,
        uint256 value
    ) internal {
        require(Address.isContract(creditForPBM), "Invalid PBM contract address");
        require(Address.isContract(erc20token), "Invalid ERC20 token address");
        require(value > 0, "token value must be more than 0");

        // Take money from the sender.
        ERC20Helper.safeTransferFrom(erc20token, _msgSender(), address(this), value);

        // call increaseTreasuryBalance to credit this token to the rightful PBM contract owner
        _increaseTreasuryBalance(creditForPBM, erc20token, value);
    }

    /// @notice A campaign PBM would call or rely on this function to pull money from a minter's wallet
    /// and credit it to a PBM Contract address. Sender must authorised this smart contract to pull ERC20 tokens.
    function depositForPBMAddress(
        address creditForPBM,
        address erc20token,
        uint256 value
    ) public override whenNotPaused nonReentrant {
        _internalDepositForPBMAddress(creditForPBM, erc20token, value);
    }

    /**
     * Call this function to withdraw money that is allocated to a PBM to the owner's address.
     * This is similar to recovery functions, but specific to a particular campaign PBM
     */
    function withdrawFromPBMAddress(
        address withdrawFromPBM,
        address to,
        address erc20token,
        uint256 value
    ) external override nonReentrant {
        require(Address.isContract(withdrawFromPBM), "Invalid PBM contract address");
        require(Address.isContract(erc20token), "Invalid ERC20 token address");
        require(value > 0, "token value must be more than 0");
        require(
            pbmTokenBalance[withdrawFromPBM][erc20token] >= value,
            "Cannot withdraw more than what a campaignPBM possess"
        );

        require(
            withdrawFromPBM == _msgSender() || _msgSender() == owner(),
            "Caller must either be from the campaign PBM itself, or the Owner of NoahPaymentManager"
        );

        // Take money from the PBM allocation and give it to the destination address.
        ERC20Helper.safeTransfer(erc20token, to, value);
        _decreaseTreasuryBalance(withdrawFromPBM, erc20token, value);
    }

    /// See {INoahPBMTreasury}, Caller must be owner
    function recoverERC20Tokens(address erc20token, uint256 value) external override onlyOwner {
        require(Address.isContract(erc20token), "Invalid ERC20 contract address");
        require(value > 0, "token value must be more than 0");

        ERC20 erc20 = ERC20(erc20token);
        ERC20Helper.safeTransfer(address(erc20), owner(), value);
    }

    /// See {INoahPBMTreasury}, Caller must be owner
    function recoverAllERC20Tokens(address erc20token) external override onlyOwner {
        require(Address.isContract(erc20token), "Invalid ERC20 contract address");

        ERC20 erc20 = ERC20(erc20token);
        ERC20Helper.safeTransfer(address(erc20), owner(), erc20.balanceOf(address(this)));
    }

    /// @notice Swap token on behalf of a campaign pbm contract.
    /// A campaing PBM can swap USDC to XSGD per txn, or in bulk to
    /// increase the size of the XSGD holdings on this contract to meet payment obligations
    function swap(address pbmContract, address fromToken, address toToken) public whenNotPaused {
        // require(Address.isContract(pbmContract), "Invalid PBM contract address");
        // Call uniswap smart contract.
    }

    function getPBMCampaignTokenBalance(address pbmAddress, address erc20token) external view returns (uint256 value) {
        require(Address.isContract(pbmAddress), "Invalid PBM contract address");
        require(Address.isContract(erc20token), "Invalid ERC20 contract address");

        return pbmTokenBalance[pbmAddress][erc20token];
    }

    /// @notice PBM campaign treasury balance = pbmTokenBalance + pendingPBMTokenBalance
    function getPBMCampaignTreasuryBalance(
        address pbmAddress,
        address erc20token
    ) external view returns (uint256 value) {
        require(Address.isContract(pbmAddress), "Invalid PBM contract address");
        require(Address.isContract(erc20token), "Invalid ERC20 contract address");

        return pendingPBMTokenBalance[pbmAddress][erc20token] + pbmTokenBalance[pbmAddress][erc20token];
    }

    /// @dev Returns the pending payment details of a sourceReferenceID
    function getPayment(address from, string memory sourceReferenceID) public view returns (address, uint256, uint256, PaymentStatus) {
        // Generate the unique payment ID
        bytes32 paymentUniqueID = _generatePaymentUniqueID(from, sourceReferenceID);
        Payment memory payment = paymentList[paymentUniqueID];
        return (payment.erc20Token, payment.erc20TokenValue, payment.refundedValue, payment.status);
    }

    function _increaseTreasuryBalance(address campaignPBM, address erc20token, uint256 value) internal whenNotPaused {
        require(Address.isContract(campaignPBM), "Invalid PBM contract address");
        require(Address.isContract(erc20token), "Invalid ERC20 contract address");
        require(value > 0, "token value must be more than 0");

        pbmTokenBalance[campaignPBM][erc20token] += value;
        emit TreasuryBalanceIncrease(campaignPBM, erc20token, value);
    }

    function _decreaseTreasuryBalance(address campaignPBM, address erc20token, uint256 value) internal whenNotPaused {
        require(Address.isContract(campaignPBM), "Invalid PBM contract address");
        require(Address.isContract(erc20token), "Invalid ERC20 contract address");
        require(value > 0, "token value must be more than 0");

        pbmTokenBalance[campaignPBM][erc20token] -= value;
        emit TreasuryBalanceDecrease(campaignPBM, erc20token, value);
    }

    function _markCompleteTreasuryBalance(
        address campaignPBM,
        address erc20Token,
        uint256 erc20TokenValue
    ) internal whenNotPaused {
        require(Address.isContract(campaignPBM), "Invalid PBM contract address");
        require(Address.isContract(erc20Token), "Invalid ERC20 contract address");
        require(erc20TokenValue > 0, "token value must be more than 0");

        pendingPBMTokenBalance[campaignPBM][erc20Token] -= erc20TokenValue;
        emit TreasuryPendingBalanceDecrease(campaignPBM, erc20Token, erc20TokenValue);
    }

    function _markPendingTreasuryBalance(
        address campaignPBM,
        address erc20Token,
        uint256 erc20TokenValue
    ) internal whenNotPaused {
        require(Address.isContract(campaignPBM), "Invalid PBM contract address");
        require(Address.isContract(erc20Token), "Invalid ERC20 contract address");
        require(erc20TokenValue > 0, "token value must be more than 0");

        // Move funds to pending balance ledger
        pbmTokenBalance[campaignPBM][erc20Token] -= erc20TokenValue;
        emit TreasuryBalanceDecrease(campaignPBM, erc20Token, erc20TokenValue);

        pendingPBMTokenBalance[campaignPBM][erc20Token] += erc20TokenValue;
        emit TreasuryPendingBalanceIncrease(campaignPBM, erc20Token, erc20TokenValue);
    }

    function _revertPendingTreasuryBalance(
        address campaignPBM,
        address erc20Token,
        uint256 erc20TokenValue
    ) internal whenNotPaused {
        require(Address.isContract(campaignPBM), "Invalid PBM contract address");
        require(Address.isContract(erc20Token), "Invalid ERC20 contract address");
        require(erc20TokenValue > 0, "token value must be more than 0");

        // Move funds back from pending balance ledger
        pbmTokenBalance[campaignPBM][erc20Token] += erc20TokenValue;
        emit TreasuryBalanceIncrease(campaignPBM, erc20Token, erc20TokenValue);

        pendingPBMTokenBalance[campaignPBM][erc20Token] -= erc20TokenValue;
        emit TreasuryPendingBalanceDecrease(campaignPBM, erc20Token, erc20TokenValue);
    }

    function _generatePaymentUniqueID(address from, string memory sourceReferenceID) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(from, sourceReferenceID));
    }

    function _addToPaymentList(
        bytes32 paymentUniqueID,
        address campaignPBM,
        address to,
        address erc20Token,
        uint256 erc20TokenValue
    ) internal {
        require(paymentUniqueID != bytes32(0), "Payment unique ID cannot be empty");
        require(Address.isContract(erc20Token), "Must be a valid ERC20 smart contract");
        require(Address.isContract(campaignPBM), "Must be a valid smart contract");
        require(erc20TokenValue > 0, "token value must be more than 0");

        paymentList[paymentUniqueID] = Payment({
            campaignPBM: campaignPBM,
            to: to,
            erc20Token: erc20Token,
            erc20TokenValue: erc20TokenValue,
            refundedValue: 0,
            status: PaymentStatus.PENDING
        });
    }

    /////////////////// INoahPaymentStateMachine functions  //////////////////////////

    /// @notice called by campaign PBM to attempt a payment request to a merchant wallet.
    /// Token used can be anytype of token that is accepted by the merchant. Tokens will be lost
    /// if sending a token that is not accepted by the merchant.
    function createPayment(
        address from,
        address to,
        address erc20Token,
        uint256 erc20TokenValue,
        string memory sourceReferenceID,
        bytes memory metadata
    ) public whenNotPaused {
        address campaignPBM = _msgSender();
        require(Address.isContract(campaignPBM), "Must be from a smart contract");
        require(Address.isContract(erc20Token), "Must be a valid ERC20 smart contract");
        require(erc20TokenValue > 0, "Token value should be more than 0");
        // Ensure that only campaign PBM can spend its own money
        require(pbmTokenBalance[campaignPBM][erc20Token] >= erc20TokenValue, "ERC20: transfer amount exceeds balance");

        require(bytes(sourceReferenceID).length != 0, "Source Reference ID cannot be empty");

        // Generate the unique payment ID from from address and sourceReferenceID
        bytes32 paymentUniqueID = _generatePaymentUniqueID(from, sourceReferenceID);
        // Check whether the uniquePaymentID already exists in paymentList
        require(paymentList[paymentUniqueID].status == PaymentStatus.NOT_CREATED, "Payment request already exists");

        _markPendingTreasuryBalance(campaignPBM, erc20Token, erc20TokenValue);
        _addToPaymentList(
            paymentUniqueID,
            campaignPBM,
            to,
            erc20Token,
            erc20TokenValue
        );

        // Inform Oracle to make payments
        emit MerchantPaymentCreated(campaignPBM, from, to, erc20Token, erc20TokenValue, sourceReferenceID, metadata);
    }

    /**
     * @notice Called by Noah oracle to complete a payment
     **/
    function completePayment(
        address from,
        string memory sourceReferenceID,
        bytes memory metadata
    ) public whenNotPaused nonReentrant{
        require(hasRole(NOAH_CRAWLER_ROLE, _msgSender()));
        require(bytes(sourceReferenceID).length != 0, "Source Reference ID cannot be empty");

        // Generate the unique payment ID from from address and sourceReferenceID
        bytes32 paymentUniqueID = _generatePaymentUniqueID(from, sourceReferenceID);
        // Retrieve the pending payment details
        Payment memory payment = paymentList[paymentUniqueID];

        require(Address.isContract(payment.campaignPBM), "Must be a valid smart contract");
        require(Address.isContract(payment.erc20Token), "Must be a valid ERC20 smart contract");
        require(payment.status == PaymentStatus.PENDING, "Payment must be in pending state");

        require(
            pendingPBMTokenBalance[payment.campaignPBM][payment.erc20Token] >= payment.erc20TokenValue,
            "ERC20: payment transfer amount exceeds available pending balance"
        );

        // Update internal balance sheet
        _markCompleteTreasuryBalance(payment.campaignPBM, payment.erc20Token, payment.erc20TokenValue);

        // ERC20 token movement: Disburse the custodied ERC20 tokens from this smart contract to destination.
        ERC20Helper.safeTransfer(payment.erc20Token, payment.to, payment.erc20TokenValue);

        // Set the pending payment to completed to mark paymentUniqueID as completed
        payment.status = PaymentStatus.COMPLETED;

        emit MerchantPaymentCompleted(
            payment.campaignPBM,
            from,
            payment.to,
            payment.erc20Token,
            payment.erc20TokenValue,
            sourceReferenceID,
            metadata
        );
    }

    /**
     * @notice Called by Noah Oracle to void a payment.
     * Useful in the event when payment cant be processed such as
     * where acquirer is down, or an invalid sourceReferenceID is used.
     *
     * Funds will be re-credited and a retry is allowed on the next block mined
     **/
    function cancelPayment(address from, string memory sourceReferenceID, bytes memory metadata) public whenNotPaused nonReentrant{
        require(bytes(sourceReferenceID).length != 0, "Source Reference ID cannot be empty");
        // Generate the unique payment ID from from address and sourceReferenceID
        bytes32 paymentUniqueID = _generatePaymentUniqueID(from, sourceReferenceID);
        // Retrieve the pending payment details
        Payment memory payment = paymentList[paymentUniqueID];

        require(hasRole(NOAH_CRAWLER_ROLE, _msgSender()));
        require(Address.isContract(payment.campaignPBM), "Must be a valid smart contract");

        require(Address.isContract(payment.erc20Token), "Must be a valid ERC20 smart contract");
        require(payment.status == PaymentStatus.PENDING, "Payment must be in pending state");

        // inform campaign pbm to refund PBM back to user. no money movement has occurred
        IPBM(payment.campaignPBM).revertPaymentForCancel(from, sourceReferenceID);

        // Ensure funds are re-credited back
        _revertPendingTreasuryBalance(payment.campaignPBM, payment.erc20Token, payment.erc20TokenValue);

        // Set the pending payment to cancelled
        paymentList[paymentUniqueID].status = PaymentStatus.CANCELLED;

        // Emit payment cancel for accounting purposes
        emit MerchantPaymentCancelled(
            payment.campaignPBM,
            from,
            payment.to,
            payment.erc20Token,
            payment.erc20TokenValue,
            sourceReferenceID,
            metadata
        );
    }

    // Called by noah servers to refund a payment.
    // This should be similar to minting new pbm, except that its a refund type.
    function refundPayment(
        address from,
        string memory sourceReferenceID,
        string memory refundUniqueId,
        uint256 refundValue,
        bytes memory metadata
    ) public whenNotPaused nonReentrant{
        require(bytes(sourceReferenceID).length != 0, "Source Reference ID cannot be empty");
        require(bytes(refundUniqueId).length != 0, "Refund Unique ID cannot be empty");
        require(hasRole(NOAH_CRAWLER_ROLE, _msgSender()));

        // Generate the unique payment ID from from address and sourceReferenceID
        bytes32 paymentUniqueID = _generatePaymentUniqueID(from, sourceReferenceID);
        // Retrieve the pending payment details
        Payment memory payment = paymentList[paymentUniqueID];

        require(Address.isContract(payment.campaignPBM), "Must be a valid smart contract");
        require(Address.isContract(payment.erc20Token), "Must be a valid ERC20 smart contract");

        require(payment.status == PaymentStatus.COMPLETED || payment.status == PaymentStatus.PARTIAL_REFUNDED, "Payment must be COMPLETED or PARTIAL_REFUNDED before refunding");
        require(refundValue > 0, "Refund value must be more than 0");
        require(refundValue <= (payment.erc20TokenValue - payment.refundedValue), "Refund value must be less than or equal to remaining paid value");

        // deposit for campaignPBM
        // Directly call the internal function to avoid reentrancy guard
        _internalDepositForPBMAddress(payment.campaignPBM, payment.erc20Token, refundValue);

        // mint back the tokens
        IPBM(payment.campaignPBM).revertPaymentForRefund(from, sourceReferenceID, refundValue);
        // update refundedValue
        payment.refundedValue += refundValue;
        // update payment status
        if ((refundValue + payment.refundedValue) == payment.erc20TokenValue) {
            payment.status = PaymentStatus.REFUNDED;
        } else {
            payment.status = PaymentStatus.PARTIAL_REFUNDED;
        }

        emit MerchantPaymentRefunded(
            payment.campaignPBM,
            from,
            payment.to,
            payment.erc20Token,
            refundValue,
            sourceReferenceID,
            refundUniqueId,
            metadata
        );
    }

    /**
     * @dev see {INoahPaymentStateMachine-PaymentDirectCreated}
     */
    function createDirectPayment(
        address from,
        address to,
        address erc20Token,
        uint256 erc20TokenValue,
        bytes memory metadata
    ) public whenNotPaused nonReentrant{
        address campaignPBM = _msgSender();
        require(Address.isContract(campaignPBM), "Must be from a smart contract");
        require(Address.isContract(erc20Token), "Must be a valid ERC20 smart contract");
        require(erc20TokenValue > 0, "Token value should be more than 0");
        // Ensure that only campaign PBM can spend its own money
        require(pbmTokenBalance[campaignPBM][erc20Token] >= erc20TokenValue, "ERC20: transfer amount exceeds balance");

        // Subtract from main balance directly to be sent out immediately.
        _decreaseTreasuryBalance(campaignPBM, erc20Token, erc20TokenValue);

        // ERC20 token movement: Disburse the custodied ERC20 tokens from this smart contract to destination.
        ERC20Helper.safeTransfer(erc20Token, to, erc20TokenValue);

        emit MerchantPaymentDirect(campaignPBM, from, to, erc20Token, erc20TokenValue, metadata);
    }
}
