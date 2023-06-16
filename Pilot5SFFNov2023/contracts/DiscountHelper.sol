// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

library DiscountHelper {
    // seperate test cases for the library
    // A constant to represent the XSGD decimals
    uint256 private constant DECIMALS = 10 ** 6;

    function getPercentageDiscount(
        uint256 amount,
        uint minAmount,
        uint256 discountPercent,
        uint256 discountCap
    ) public pure returns (uint256) {
        require(amount >= minAmount * DECIMALS, "DiscountCalculator: amount cannot be less than minAmount");
        require(discountPercent <= 100, "DiscountCalculator: discount percent cannot be more than 100%");

        // Convert the discount percent to a decimal and multiply it with the amount
        uint256 discount = (amount * discountPercent) / 100;
        require(discount <= discountCap * DECIMALS, "DiscountCalculator: discount cannot be more than discountCap");

        // Adjust for the decimals in the ERC20 token
        return discount;
    }

    function getFixedDiscount(uint256 amount, uint minAmount, uint256 discountAmount) public pure returns (uint256) {
        require(amount >= minAmount * DECIMALS, "DiscountCalculator: amount cannot be less than minAmount");
        require(discountAmount * DECIMALS <= amount, "DiscountCalculator: discount amount cannot be more than amount");

        // Adjust for the decimals in the ERC20 token
        return discountAmount * DECIMALS;
    }
}
