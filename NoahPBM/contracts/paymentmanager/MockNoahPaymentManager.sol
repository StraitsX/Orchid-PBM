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
import "./NoahPaymentManager.sol";

/// @title This smart contract is solely used for Noah Oracle Testing of events
contract MockNoahPaymentManager is INoahPaymentStateMachine {
    function createPayment(
        address from,
        address to,
        address erc20Token,
        uint256 erc20TokenValue,
        string memory paymentUniqueId,
        bytes memory metadata
    ) public {
        emit PaymentCreated(
            address(0),
            from,
            to,
            erc20Token,
            erc20TokenValue,
            paymentUniqueId,
            metadata
        );
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
    ) public {
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
    ) public {
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
    function refundPayment() public {
        // 1. Call increase balance
        //    merchant refunding a payment should call depositForPBMAddress
        // 2. Inform campaignPBM to emit a payment refund Event
    }
}
