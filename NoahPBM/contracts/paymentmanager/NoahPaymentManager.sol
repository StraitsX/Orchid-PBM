// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {INoahPaymentStateMachine} from "./INoahPaymentStateMachine.sol";
import {INoahPBMTreasury} from "./INoahPBMTreasury.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../pbm/ERC20Helper.sol";

/**
 * TODO TEST Cases listing:
 */

contract NoahPaymentManager is
    Ownable,
    Pausable,
    AccessControl,
    INoahPaymentStateMachine,
    INoahPBMTreasury
{

    /////////////////// INoahPBMTreasury functions  //////////////////////////

    // Keeps track of the liability to each Campaign PBM Contract. Campain PBM is responsible for accounting.
    // pbmContract address => {ERC20Token1 => Amt, ERC20Token2 => Amt}
    mapping(address => mapping(address => uint256)) internal pbmTokenBalance;
    // Keeps track of pending balances
    mapping(address => mapping(address => uint256)) internal pendingPBMTokenBalance;

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

    /// @notice A campaign PBM would call or rely on this function to pull money from a minter's wallet
    /// and credit it to a PBM Contract address. Sender must authorised this smart contract to pull ERC20 tokens.
    function depositForPBMAddress(
        address creditForPBM,
        address erc20token,
        uint256 value
    ) external override whenNotPaused {
        require(Address.isContract(creditForPBM), "Invalid PBM contract address");
        require(Address.isContract(erc20token), "Invalid ERC20 token address");
        require(value > 0, "token value must be more than 0");

        // Take money from the sender.
        ERC20Helper.safeTransferFrom(
            erc20token,
            _msgSender(),
            address(this),
            value
        );

        // call increaseTrasuryBalance to credit this token to the rightful PBM contract owner
        _increaseTrasuryBalance(creditForPBM, erc20token, value);
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
    ) external override {
        require(Address.isContract(withdrawFromPBM), "Invalid PBM contract address");
        require(Address.isContract(erc20token), "Invalid ERC20 token address");
        require(value > 0, "token value must be more than 0");
        require(pbmTokenBalance[withdrawFromPBM][erc20token] > value, "Cannot withdraw more than what a campaignPBM possess");

        require(
            withdrawFromPBM == _msgSender() || _msgSender() == owner(),
            "Caller must either be from the campaign PBM itself, or the Owner of NoahPaymentManager"
        );

        // Take money from the PBM allocation and give it to the destination address.
        ERC20Helper.safeTransfer(erc20token, to, value);
        _decreaseTrasuryBalance(withdrawFromPBM, erc20token, value);
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
    function swap(
        address pbmContract,
        address fromToken,
        address toToken
    ) public whenNotPaused {
        // require(Address.isContract(pbmContract), "Invalid PBM contract address");

        // Call uniswap smart contract.
    }

    function getPBMCampaignTokenBalance(
        address pbmAddress,
        address erc20token
    ) external view returns (uint256 value) {
        require(Address.isContract(pbmAddress), "Invalid PBM contract address");
        require(Address.isContract(erc20token), "Invalid ERC20 contract address");

        return pbmTokenBalance[pbmAddress][erc20token];
    }

    function _increaseTrasuryBalance(
        address campaignPBM,
        address erc20token,
        uint256 value
    ) internal whenNotPaused {
        require(Address.isContract(campaignPBM), "Invalid PBM contract address");
        require(Address.isContract(erc20token), "Invalid ERC20 contract address");
        require(value > 0, "token value must be more than 0");

        pbmTokenBalance[campaignPBM][erc20token] += value;
        emit TreasuryBalanceIncrease(campaignPBM, erc20token, value);
    }

    function _decreaseTrasuryBalance(
        address campaignPBM,
        address erc20token,
        uint256 value
    ) internal whenNotPaused {
        require(Address.isContract(campaignPBM), "Invalid PBM contract address");
        require(Address.isContract(erc20token), "Invalid ERC20 contract address");
        require(value > 0, "token value must be more than 0");

        pbmTokenBalance[campaignPBM][erc20token] -= value;
        emit TreasuryBalanceDecrease(campaignPBM, erc20token, value);

    }

    function _markCompleteTreasuryBalanace(
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

    function _markPendingTreasuryBalanace(
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

    function _revertPendingTreasuryBalanace(
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

    /////////////////// INoahPaymentStateMachine functions  //////////////////////////

    /// @notice called by campaign PBM to attempt a payment request to a merchant wallet.
    /// Token used can be anytype of token that is accepted by the merchant. Tokens will be lost
    /// if sending a token that is not accepted by the merchant.
    function createPayment(
        address from,
        address to,
        address erc20Token,
        uint256 erc20TokenValue,
        string memory paymentUniqueId,
        bytes memory metadata
    ) public whenNotPaused {
        address campaignPBM = _msgSender();
        require(Address.isContract(campaignPBM), "Must be from a smart contract");
        require(Address.isContract(erc20Token), "Must be a valid ERC20 smart contract");
        require(erc20TokenValue > 0, "Token value should be more than 0");

        require(bytes(paymentUniqueId).length != 0);

        // Ensure that only campaign PBM can spend its own money
        if (pbmTokenBalance[campaignPBM][erc20Token] > erc20TokenValue) {
            _markPendingTreasuryBalanace(
                campaignPBM,
                erc20Token,
                erc20TokenValue
            );

            // Inform Oracle to make payments
            emit MerchantPaymentCreated(
                campaignPBM,
                from,
                to,
                erc20Token,
                erc20TokenValue,
                paymentUniqueId,
                metadata
            );
        }
    }

    /**
     * @notice Called by Noah oracle to complete a payment
     **/
    function completePayment(
        address campaignPBM,
        address from,
        address to,
        address erc20Token,
        uint256 erc20TokenValue,
        string memory paymentUniqueId,
        bytes memory metadata
    ) public whenNotPaused {
        require(hasRole(NOAH_CRAWLER_ROLE, _msgSender()));
        require(Address.isContract(campaignPBM), "Must be a valid smart contract");
        require(Address.isContract(erc20Token), "Must be a valid ERC20 smart contract");
        require(erc20TokenValue > 0, "Token value should be more than 0");
        require(bytes(paymentUniqueId).length != 0);

        if (pendingPBMTokenBalance[campaignPBM][erc20Token] > erc20TokenValue) { 
            // Update internal balance sheet
            _markCompleteTreasuryBalanace(campaignPBM, erc20Token, erc20TokenValue);

            // ERC20 token movement: Disburse the custodied ERC20 tokens from this smart contract to destination.
            ERC20Helper.safeTransfer(erc20Token, to, erc20TokenValue);

            emit MerchantPaymentCompleted(
                campaignPBM,
                from,
                to,
                erc20Token,
                erc20TokenValue,
                paymentUniqueId,
                metadata
            );
        }

    }

    /**
     * @notice Called by Noah Oracle to void a payment. 
     * Useful in the event when payment cant be processed such as 
     * where acquirer is down, or an invalid paymentUniqueId is used.
     * 
     * Funds will be re-credited and a retry is allowed on the next block mined
     **/
    function cancelPayment(
        address campaignPBM,
        address from,
        address to,
        address erc20Token,
        uint256 erc20TokenValue,
        string memory paymentUniqueId,
        bytes memory metadata
    ) public whenNotPaused {
        require(hasRole(NOAH_CRAWLER_ROLE, _msgSender()));
        require(Address.isContract(campaignPBM), "Must be a valid smart contract");
        require(Address.isContract(erc20Token), "Must be a valid ERC20 smart contract");
        require(erc20TokenValue > 0, "Token value should be more than 0");
        require(bytes(paymentUniqueId).length != 0);

        // [TODO] inform campaign pbm to emit payment cancel. no money movement has occured
        // [TODO] inform campaign pbm to refund PBM back to user. 

        // Ensure funds are re-credited back
        _revertPendingTreasuryBalanace(
            campaignPBM,
            erc20Token,
            erc20TokenValue
        );

        // Emit payment cancel for accounting purposes
        emit MerchantPaymentCancelled(
            campaignPBM,
            from,
            to,
            erc20Token,
            erc20TokenValue,
            paymentUniqueId,
            metadata
        );
    }

    // Called by noah servers to refund a payment.
    // This should be similar to minting new pbm, except that its a refund type.
    function refundPayment() public whenNotPaused {
        // 1. Call increase balance
        //    merchant refunding a payment should call depositForPBMAddress
        // 2. Inform campaignPBM to emit a payment refund Event
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
    ) public whenNotPaused {
        address campaignPBM = _msgSender();
        require(Address.isContract(campaignPBM), "Must be from a smart contract");
        require(Address.isContract(erc20Token), "Must be a valid ERC20 smart contract");
        require(erc20TokenValue > 0, "Token value should be more than 0");

        // Ensure that only campaign PBM can spend its own money
        if (pbmTokenBalance[campaignPBM][erc20Token] > erc20TokenValue) {
            
            // Subtract from main balance directly to be sent out immediately.
            _decreaseTrasuryBalance(
                campaignPBM,
                erc20Token,
                erc20TokenValue
            );
            
            // ERC20 token movement: Disburse the custodied ERC20 tokens from this smart contract to destination.
            ERC20Helper.safeTransfer(erc20Token, to, erc20TokenValue);

            emit MerchantPaymentDirect(
                campaignPBM,
                from,
                to,
                erc20Token,
                erc20TokenValue,
                metadata
            );
            
        }
    }
}
