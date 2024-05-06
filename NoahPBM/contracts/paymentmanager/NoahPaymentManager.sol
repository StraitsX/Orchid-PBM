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

contract NoahPaymentManager is Ownable, Pausable, AccessControl, INoahPaymentStateMachine, INoahPBMTreasury {
    /////////////////// INoahPBMTreasury functions  //////////////////////////

    // Keeps track of the liability to each Campaign PBM Contract.
    // pbmContract address => {ERC20Token1 => Amt, ERC20Token2 => Amt}
    mapping(address => mapping(address => uint256)) internal pbmTokenBalance;

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

    // A campaign PBM would call this function to pull money from a minter's wallet
    // and credit it to a PBM Contract address
    function depositForPBMAddress(
        address creditForPBM,
        address erc20token,
        uint256 amt
    ) external override whenNotPaused {
        // call increaseTrasuryBalance to increase pbmTokenBalance
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
    ) external view returns (uint256 amt) {}

    function increaseTrasuryBalance(
        address campaignPBM,
        address erc20token,
        uint256 value
    ) external override whenNotPaused {
        // increment pbmTokenBalance
    }

    function decreaseTreasuryBalanace(
        address campaignPBM,
        address erc20token,
        uint256 value
    ) external override whenNotPaused {}

    /////////////////// INoahPaymentStateMachine functions  //////////////////////////

    /// @notice called by campaign PBM to initiate a payment request to a merchant wallet.
    /// Token used can be anytype of token that is accepted by the merchant. Tokens will be lost
    /// if sending a token that is not accepted by the merchant.
    function createPayment(
        address from,
        address to,
        address erc20Token,
        uint256 erc20TokenValue,
        bytes memory metadata
    ) public whenNotPaused {
        address campaignPBM = _msgSender();

        // Ensure that only campaign PBM can spend its own money
        if (pbmTokenBalance[campaignPBM][erc20Token] > erc20TokenValue) {
          
          emit PaymentCreated(
            campaignPBM,
            from,
            to,
            erc20Token,
            erc20TokenValue,
            metadata
          );
        }
    }

    /**
     * Called by Noah servers to complete a payment
     **/ 
    function completePayment(address campaignPBM, address erc20token, uint256 erc20TokenValue) public whenNotPaused {
      require(hasRole(NOAH_CRAWLER_ROLE, _msgSender()));

      // Update internal balance sheet
      decreaseTreasuryBalanace(campaignPBM, erc20token, erc20TokenValue);

      // Move the actual custodied ERC20 tokens from this smart contract to destination
      ERC20Helper.safeTransfer(erc20Token, to, erc20TokenValue);
    }

    // Called by noah servers to void a payment id
    function cancelPayment() public whenNotPaused {
        // inform campaign pbm to emit payment cancel. no money movement has occured.
    }

    // Called by noah servers to refund a payment
    function refundPayment() public whenNotPaused {
        // 1. Call increase balance
        //    merchant refunding a payment should call depositForPBMAddress
        // 2. Inform campaignPBM to emit a payment refund Event
    }
}
