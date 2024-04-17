// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {INoahPaymentStateMachine} from "./INoahPaymentStateMachine.sol";
import {INoahPBMTreasury} from "./INoahPBMTreasury.sol";

contract NoahPaymentManager is INoahPaymentStateMachine, INoahPBMTreasury {

    // Keeps track of the liability to each Campaign PBM Contract.
    // pbmContract address => {ERC20Token1 => Amt, ERC20Token2 => Amt}
    mapping(address => mapping (address => uint256)) internal pbmTokenBalance;

    // A campaign PBM would call this function to pull money from a minter's wallet 
    // and credit it to a PBM Contract address
    function depositForPBMAddress(address creditForPBM, address erc20token, uint256 amt) external override {
      // call increaseTrasuryBalance to increase pbmTokenBalance
    }  

    function swap() public {
      // how to swap underlying token with another token using a defi app?
    }

    // called by campaign PBM to initiate a payment request to a merchant wallet.
    function createPayment() public{
      // emit PaymentCreatedEvent
    }

    function completePayment() public{
      // call decreaseTreasuryBalanace
      // MDR Rate calculation consideration?
    }

    // called by noah servers to void a payment id 
    function cancelPayment() public{
      // inform campaign pbm to emit payment cancel. no money movement has occured.
    }

    // Called by noah servers to refund a payment 
    function refundPayment() public{
      // 1. Call increase balance 
      //    merchant refunding a payment should call depositForPBMAddress
      // 2. Inform campaignPBM to emit a payment refund Event
    }

    function getPBMCampaignSpotToken(
        address pbmAddress,
        address erc20token
    ) external view returns (uint256 amt) {}

    function increaseTrasuryBalance(
        address campaignPBM,
        address erc20token,
        uint256 amount
    ) external override {
      // increment pbmTokenBalance
    }

    function decreaseTreasuryBalanace(
        address campaignPBM,
        address erc20token,
        uint256 amount
    ) external override {}

    
}