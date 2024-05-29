// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

/// @title PBM Compliance Ruleset Interface
/// @notice All compliance checks specific to a sector should implement this interface.
interface ICompliantService {
    /// Checks if a non-KYC payment is allowed
    /// In Singapore, a payment from a sender is allowed if it fulfills 2 out of 3 of the following requirements:
    /// 1. Payment amount is < 20,000 SGD per transaction
    /// 2. Payment is done for the purchase of goods and services
    /// 3. Sender is KYC'ed
    /// Campaign PBM implementors should understand the type of compliance requirement and call the checks accordingly
    /// @param receiver The address of the receiver
    /// @param amt The amount of tokens being transferred
    /// @param pbmValue The value of each PBM token
    /// @return allowed Whether the non-KYC payment is allowed or not
    function checkNonKYCPaymentAllowed(address receiver, uint256 amt, uint256 pbmValue) external returns (bool allowed);

    /// @notice Checks if a transfer of PBM tokens is allowed based on compliance rules.
    /// @dev Implementers should define specific compliance rules based on a country or campaign rule set.
    /// A PBM can implement multiple compliance services for checks.
    /// @param amt The amount of tokens being transferred
    /// @param pbmValue The value of each PBM token
    /// @return allowed Whether the transfer is allowed or not
    function complyPaymentAmount(uint256 amt, uint256 pbmValue) external view returns (bool allowed);

    /// Checks if a receiver is a merchant type address
    /// @param receiver The address of the receiver
    /// @return allowed Whether the receiver is a merchant or not
    function complyReceiverIsMerchant(address receiver) external returns (bool allowed);

    /// Emitted when a non-KYC type payment is attempted
    event NonKYCPaymentCheck(address indexed receiver, uint256 amt, uint256 pbmValue, bool allowed);
}
