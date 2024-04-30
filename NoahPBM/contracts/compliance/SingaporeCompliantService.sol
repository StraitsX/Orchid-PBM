// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./ICompliantService.sol";
import "./IPBMMerchantAddressList.sol";

/// @title A list of Singapore specific payments ruleset checks should be done here.
contract SingaporeCompliantService is ICompliantService {

    uint256 public MAX_TOTAL_TOKEN_VALUE = 20000; // Maximum payment amount
    address public merchantAddressList = 0x299CC2Cc33A175B8dec16cE0196C22B396ae7119;

    /// In Singapore, a payment from a sender is allowed if it fulfilles 2 out 3 of the following 
    /// requirements:
    /// 1. Payment amount is < 20,000 SGD per transaction
    /// 2. Payment is done for purchase of goods and services.
    /// 3. Source of fund is from an identifiable source. (ie: by checking if a wallet has an identity token)
    function checkNonKYCPaymentAllowed(address receiver, uint256 amt, uint256 pbmValue) external returns (bool) {
        bool isCompliant = complyPaymentAmount(amt, pbmValue) && complyReceiverIsMerchant(receiver);
        emit NonKYCPaymentCheck(receiver, amt, pbmValue, isCompliant);
        return isCompliant;
    }

    /// @inheritdoc ICompliantService
    function complyPaymentAmount(uint256 amt, uint256 pbmValue) public view override returns (bool) {
      uint256 total_token_value = amt * pbmValue;
      return total_token_value <= MAX_TOTAL_TOKEN_VALUE;
    }

    function complyReceiverIsMerchant(address receiver) public override returns (bool) {
        // check that receiver is in merchantAddressList to ensure goods and service payments
        IPBMMerchantAddressList addrList = IPBMMerchantAddressList(merchantAddressList);
        return addrList.isMerchant(receiver);
    }

}
