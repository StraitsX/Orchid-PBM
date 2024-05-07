// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {INoahPaymentStateMachine} from "./INoahPaymentStateMachine.sol";
import {INoahPBMTreasury} from "./INoahPBMTreasury.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

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

    // Keeps track of the liability to each Campaign PBM Contract.
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

    function initialise() external {
        require(!initialised, "Noah PBM: Already initialised");

        // Allows Owner to be role base access control manager
        _grantRole(DEFAULT_ADMIN_ROLE, owner());

        initialised = true;
    }

    // A campaign PBM would call or rely on this function to pull money from a minter's wallet
    // and credit it to a PBM Contract address
    function depositForPBMAddress(address creditForPBM, address erc20token, uint256 value) external override whenNotPaused {
        require(Address.isContract(erc20token), "Invalid ERC20 token address");

        // Take money from the sender 
        ERC20Helper.safeTransferFrom(erc20token, _msgSender(), address(this), value);

        // call increaseTrasuryBalance to credit this token to the rightful PBM contract owner
        _increaseTrasuryBalance(creditForPBM, erc20token, value);
    }

    /// @notice Swap token on behalf of a campaign pbm contract.
    /// A campaing PBM can swap USDC to XSGD per txn, or in bulk to
    /// increase the size of the XSGD holdings on this contract to meet payment obligations
    function swap(
        address pbmContract,
        address fromToken,
        address toToken
    ) public whenNotPaused {
        // Call uniswap smart contract.
    }

    function getPBMCampaignSpotToken(
        address pbmAddress,
        address erc20token
    ) external view returns (uint256 value) {}

    function _increaseTrasuryBalance(
        address campaignPBM,
        address erc20token,
        uint256 value
    ) internal whenNotPaused {
        // increment pbmTokenBalance
    }

    function _markCompleteTreasuryBalanace(
        address campaignPBM,
        address erc20Token,
        uint256 erc20TokenValue
    ) internal whenNotPaused {
        pendingPBMTokenBalance[campaignPBM][erc20Token] -= erc20TokenValue;
    }

    function _markPendingTreasuryBalanace(
        address campaignPBM,
        address erc20Token,
        uint256 erc20TokenValue
    ) internal whenNotPaused {
        // Move funds to pending balance ledger
        pbmTokenBalance[campaignPBM][erc20Token] -= erc20TokenValue;
        pendingPBMTokenBalance[campaignPBM][erc20Token] += erc20TokenValue;
    }

    function _revertPendingTreasuryBalanace(
        address campaignPBM,
        address erc20Token,
        uint256 erc20TokenValue
    ) internal whenNotPaused {
        // Move funds back from pending balance ledger
        pbmTokenBalance[campaignPBM][erc20Token] += erc20TokenValue;
        pendingPBMTokenBalance[campaignPBM][erc20Token] -= erc20TokenValue;
    }

    /////////////////// INoahPaymentStateMachine functions  //////////////////////////

    /// @notice called by campaign PBM to initiate a payment request to a merchant wallet.
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

        // Ensure that only campaign PBM can spend its own money
        if (pbmTokenBalance[campaignPBM][erc20Token] > erc20TokenValue) {

            _markPendingTreasuryBalanace(campaignPBM, erc20Token, erc20TokenValue);

            // Inform oracle to make payments
            emit PaymentCreated(
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

        // Update internal balance sheet
        _markCompleteTreasuryBalanace(campaignPBM, erc20Token, erc20TokenValue);

        // ERC20 token movement: Disburse the custodied ERC20 tokens from this smart contract to destination.
        ERC20Helper.safeTransfer(erc20Token, to, erc20TokenValue);

        emit PaymentCompleted(
            campaignPBM,
            from,
            to,
            erc20Token,
            erc20TokenValue,
            paymentUniqueId,
            metadata
        );
    }

    /**
     * @notice Called by Noah Oracle to void a payment
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
        // [TBD] inform campaign pbm to emit payment cancel. no money movement has occured.

        // Ensure funds are re-credited back
        _revertPendingTreasuryBalanace(campaignPBM, erc20Token, erc20TokenValue);

        // Emit payment cancel for accounting purposes
        emit PaymentCancelled(
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
}
