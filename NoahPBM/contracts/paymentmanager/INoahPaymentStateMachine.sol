// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Manages the payment lifecycle for the internal Noah pbm payment network
/// a PBM will use this contract to store the underlying token for making payments
/// Lifecycle consist of PaymentCreated, PaymentCompleted, PaymentRefunded, PaymentCancelled
interface INoahPaymentStateMachine {
    /**
     * Emitted when main balance has been changed
     */
    event TreasuryBalanceIncrease(address campaignPBM, address erc20token, uint256 value);

    /**
     * Emitted when main balance has been changed
     */
    event TreasuryBalanceDecrease(address campaignPBM, address erc20token, uint256 value);

    /**
     * Emitted when pending balance has been changed
     */
    event TreasuryPendingBalanceIncrease(address campaignPBM, address erc20token, uint256 value);

    /**
     * Emitted when pending balance has been changed
     */
    event TreasuryPendingBalanceDecrease(address campaignPBM, address erc20token, uint256 value);

    /// @notice Initiates the start of the payment life cycle to be later acknowledged by a Noah Oracle
    /// @param campaignPBM PBM contract that requested for payment to be created
    /// @param from Wallet requesting this payment
    /// @param to Merchant wallet payment destination
    /// @param ERC20Token Smart Contract address
    /// @param ERC20TokenValue Value of ERC20 token to be given.
    /// Value refers to the real world value to be represenetd in Amount format.
    /// Amount refers to underlying integer x decimal representation
    ///
    /// @param sourceReferenceID Required to ensure oracle fallback mechanism for retrying on another chain.
    /// This must be a globally unique identifier to allow the fallback payment on another chain by the oracle
    ///
    /// @param metadata usage:
    /// 1. Specify discount code for discount type PBM, or Product type PBM to pass on to acquirer
    /// 2. Indicate FX rates for POST payment swap settlement.
    /// ie: Get a USDC<>XSGD quote from STX, pay in USDC and indicate quote ref here
    /// 3. NFT metadata for airdrops
    event MerchantPaymentCreated(
        address indexed campaignPBM,
        address indexed from,
        address indexed to,
        address ERC20Token,
        uint256 ERC20TokenValue,
        string sourceReferenceID,
        bytes metadata
    );

    /// @notice Emitted when a payment is successfully done and acknowledged by acquirer.
    event MerchantPaymentCompleted(
        address indexed campaignPBM,
        address indexed from,
        address indexed to,
        address ERC20Token,
        uint256 ERC20TokenValue,
        string sourceReferenceID,
        bytes metadata
    );

    /// @notice Emitted when subscribers or acquirer is down, and we want to cancel the pbm payment process.
    /// Campaign PBM should be notified as well when this occurs. Wallet issuers should subscribe to this event
    /// in order to update their users on a payment cancellation event.
    event MerchantPaymentCancelled(
        address indexed campaignPBM,
        address indexed from,
        address indexed to,
        address ERC20Token,
        uint256 ERC20TokenValue,
        string sourceReferenceID,
        bytes metadata
    );

    /// @notice Emitted  when merchant initiates a refund back to a user / wallet issuer.
    event MerchantPaymentRefunded(
        address indexed campaignPBM,
        address indexed from,
        address indexed to,
        address ERC20Token,
        uint256 ERC20TokenValue,
        string sourceReferenceID,
        string refundUniqueId,
        bytes metadata
    );

    /**
     *  @notice Direct stablecoin payment to merchant.
     *  This is for PBM issuer that doesn't require/need a 2 step payment completion service, and as a result
     *  doesnt require a fallback mechanism. The exclusion of sourceReferenceID prevents
     *  the oracle from retrying on another chain or web2 fallback for instance.
     *  This is for wallet issuers that are unable to sign raw transactions and can only rely on the ERC1155 safeTransfer mechanism.
     */
    event MerchantPaymentDirect(
        address indexed campaignPBM,
        address indexed from,
        address indexed to,
        address ERC20Token,
        uint256 ERC20TokenValue,
        bytes metadata
    );
}
