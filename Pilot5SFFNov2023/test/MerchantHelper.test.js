const { expect } = require("chai");

describe("MerchantHelper", function () {
  let MerchantHelper;
  let merchantHelper;
  let owner, PBM, merchant, user, other;
  let erc20Token;

  beforeEach(async function () {
    // Deploy a mock ERC20 token
    const ERC20 = await ethers.getContractFactory("Spot");
    erc20Token = await ERC20.deploy();
    await erc20Token.deployed();

    // Get the signers
    [owner, PBM, merchant, user, other] = await ethers.getSigners();

    // Deploy the MerchantHelper contract
    MerchantHelper = await ethers.getContractFactory("MerchantHelper");
    merchantHelper = await MerchantHelper.deploy();
    await merchantHelper.deployed();

    // Add the PBM and merchant as allowed entities
    await merchantHelper.addAllowedPBM(PBM.address);
    await merchantHelper.addWhitelistedMerchant(merchant.address);

    // Give the merchant some tokens
    await erc20Token.mint(merchant.address, ethers.utils.parseUnits("1000", 18));
  });

  describe("cashBack", function () {
    it("should transfer tokens from merchant to user", async function () {
      // Grant allowance to the merchantHelper contract by the merchant
      await erc20Token.connect(merchant).approve(merchantHelper.address, ethers.utils.parseUnits("100", 18));

      // Check the initial balances
      const initialUserBalance = await erc20Token.balanceOf(user.address);
      const initialMerchantBalance = await erc20Token.balanceOf(merchant.address);

      // Perform the cashBack function call
      await merchantHelper.connect(PBM).cashBack(user.address, ethers.utils.parseUnits("50", 18), erc20Token.address, merchant.address);

      // Check the final balances
      const finalUserBalance = await erc20Token.balanceOf(user.address);
      const finalMerchantBalance = await erc20Token.balanceOf(merchant.address);

      expect(finalUserBalance.sub(initialUserBalance)).to.equal(ethers.utils.parseUnits("50", 18));
      expect(initialMerchantBalance.sub(finalMerchantBalance)).to.equal(ethers.utils.parseUnits("50", 18));
    });

    it("should fail if caller is not an allowed PBM", async function () {
      await expect(
        merchantHelper.connect(other).cashBack(user.address, ethers.utils.parseUnits("50", 18), erc20Token.address, merchant.address)
      ).to.be.revertedWith("Caller is not an whitelisted PBM");
    });

    it("should fail if merchant is not whitelisted", async function () {
      await merchantHelper.removeWhitelistedMerchant(merchant.address);

      await expect(
        merchantHelper.connect(PBM).cashBack(user.address, ethers.utils.parseUnits("50", 18), erc20Token.address, merchant.address)
      ).to.be.revertedWith("Merchant not whitelisted.");
    });
  });
});




