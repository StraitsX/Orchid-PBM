// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Manages the payment lifecycle for the internal Noah pbm payment network
/// a PBM will use this contract to store the underlying token for making payments
interface INoahPaymentStateMachine {
    /// @notice Payment success event
    event PaymentCompleted(
        address campaignPBM,
        address from,
        address to,
        address ERC20TokenPaid,
        uint256 ERC20TokenValue,
        string paymentUniqueId
    );

    // event PaymentFailed(); don't think theres a need for this. Can just call payment cancelled or refunded
    event PaymentCancelled(); // Used when subscribers or acquirer is down
    event PaymentRefunded(); // Used when merchant initiate a refund 
    event PaymentCreated(); // Start of the payment life cycle.
}
