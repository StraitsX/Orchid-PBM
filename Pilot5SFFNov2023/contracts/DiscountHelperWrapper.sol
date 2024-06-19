// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./DiscountHelper.sol";

// only purpose of this contract is to test the internal functions of the DiscountHelper
contract DiscountHelperWrapper {
    function getPercentageDiscount(
        uint256 amount,
        uint minAmount,
        uint256 discountPercent,
        uint256 discountCap
    ) public pure returns (uint256) {
        return DiscountHelper.getPercentageDiscount(amount, minAmount, discountPercent, discountCap);
    }

    function getFixedDiscount(uint256 amount, uint256 minAmount, uint256 discountAmount) public pure returns (uint256) {
        return DiscountHelper.getFixedDiscount(amount, minAmount, discountAmount);
    }
}
