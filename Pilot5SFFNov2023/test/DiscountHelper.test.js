const { expect } = require('chai');
const { ethers } = require('hardhat');

async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}

describe('DiscountHelperWrapper', function () {
  beforeEach(async function () {
    // Get the signers
    [deployer, wallet, other] = await ethers.getSigners();

    // Deploy a wrapper contract
    this.discountHelperWrapper = await deploy('DiscountHelperWrapper');
  });

  describe('getPercentageDiscount', function () {
    it('should calculate discount correctly', async function () {
      const { discountHelperWrapper } = this;
      const amount = ethers.utils.parseUnits('2', 6);
      const minAmount = 1;
      const discountPercent = 10; // 10%
      const discountCap = 1;

      const discount = await discountHelperWrapper.getPercentageDiscount(
        amount,
        minAmount,
        discountPercent,
        discountCap,
      );
      expect(discount).to.equal(ethers.utils.parseUnits('0.2', 6));
    });

    it('should not exceed the discount cap', async function () {
      const { discountHelperWrapper } = this;
      const amount = ethers.utils.parseUnits('5', 6);
      const minAmount = 1;
      const discountPercent = 50; // 50%
      const discountCap = 1;

      await expect(
        discountHelperWrapper.getPercentageDiscount(
          amount,
          minAmount,
          discountPercent,
          discountCap,
        ),
      ).to.be.revertedWith(
        'DiscountCalculator: discount cannot be more than discountCap',
      );
    });

    it('should exceed the min amount', async function () {
      const { discountHelperWrapper } = this;
      const amount = ethers.utils.parseUnits('5', 6);
      const minAmount = 10;
      const discountPercent = 50; // 5%
      const discountCap = 1;

      await expect(
        discountHelperWrapper.getPercentageDiscount(
          amount,
          minAmount,
          discountPercent,
          discountCap,
        ),
      ).to.be.revertedWith(
        'DiscountCalculator: amount cannot be less than minAmount',
      );
    });
  });

  describe('getFixedDiscount', function () {
    it('should return the correct discount', async function () {
      const { discountHelperWrapper } = this;
      const amount = ethers.utils.parseUnits('2', 6);
      const minAmount = 1;
      const discountAmount = 1;

      const discount = await discountHelperWrapper.getFixedDiscount(
        amount,
        minAmount,
        discountAmount,
      );
      expect(discount).to.equal(ethers.utils.parseUnits('1', 6));
    });

    it('should not exceed the amount', async function () {
      const { discountHelperWrapper } = this;
      const amount = ethers.utils.parseUnits('2', 6);
      const minAmount = 1;
      const discountAmount = 3;

      await expect(
        discountHelperWrapper.getFixedDiscount(
          amount,
          minAmount,
          discountAmount,
        ),
      ).to.be.revertedWith(
        'DiscountCalculator: discount amount cannot be more than amount',
      );
    });

    it('should exceed the minAmount', async function () {
      const { discountHelperWrapper } = this;
      const amount = ethers.utils.parseUnits('2', 6);
      const minAmount = 5;
      const discountAmount = 1;

      await expect(
        discountHelperWrapper.getFixedDiscount(
          amount,
          minAmount,
          discountAmount,
        ),
      ).to.be.revertedWith(
        'DiscountCalculator: amount cannot be less than minAmount',
      );
    });
  });
});
