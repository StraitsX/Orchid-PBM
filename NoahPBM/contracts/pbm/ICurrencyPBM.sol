// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

/// @title CurrencyPBM interface
interface ICurrencyPBM {
    /// @notice Reverts the PBM token for a cancelled payment
    /// @param mintTo The account to which the PBM ( NFT ) is minted back to
    /// @param sourceReferenceID The identifier of the payment
    function revertPaymentForCancel(address mintTo, string memory sourceReferenceID) external;

    /// @notice Reverts the PBM for a refunded payment
    /// @param mintTo The account to which the PBM ( NFT ) is minted back to
    /// @param sourceReferenceID The identifier of the payment
    /// @param refundValue The ERC-20 token value that is refunded
    function revertPaymentForRefund(address mintTo, string memory sourceReferenceID, uint256 refundValue) external;
}
