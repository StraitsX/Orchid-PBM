// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Manages the payment lifecycle for the internal Noah pbm payment network
/// a PBM will use this contract to store the underlying token for making payments
/// Lifecycle consist of PaymentCreated, PaymentCompleted, PaymentRefunded, PaymentCancelled
interface INoahPaymentStateMachine {
    
    /// @notice Initiates the start of the payment life cycle.
    event PaymentCreated(
        address campaignPBM,
        address from,
        address to,
        address ERC20Token,
        uint256 ERC20TokenValue,
        string paymentUniqueId,
        string metadata
    ); 

    /// @notice Emitted when a payment is successfully done and acknowledged by acquirer.
    event PaymentCompleted(
        address campaignPBM,
        address from,
        address to,
        address ERC20Token,
        uint256 ERC20TokenValue,
        string paymentUniqueId,
        string metadata
    );

    /// @notice Emitted  when subscribers or acquirer is down, and we want to cancel the pbm payment process.
    /// Campaign PBM should be notified as well when this occurs. Wallet issuers should subscribe to this event
    /// in order to update their users on a payment cancellation event.
    event PaymentCancelled(
        address campaignPBM,
        address from,
        address to,
        address ERC20Token,
        uint256 ERC20TokenValue,
        string paymentUniqueId,
        string metadata
    );

    /// @notice Emitted  when merchant initiates a refund back to a user / wallet issuer.
    event PaymentRefunded(
        address campaignPBM,
        address from,
        address to,
        address ERC20Token,
        uint256 ERC20TokenValue,
        string paymentUniqueId,
        string metadata
    ); 
}
