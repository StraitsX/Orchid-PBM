const { assert, expect } = require("chai");
const { ethers } = require("hardhat");
const { deploy, initPBM, parseUnits } = require("./testHelper.js");
const { createTokenType } = require("./testHelper");

async function init() {
  const xsgdToken = await deploy("Spot", "XSGD", "XSGD", 6);
  const noahPaymentManager = await deploy("NoahPaymentManager");
  const addressList = await deploy("PBMMerchantAddressList");
  const pbm = await deploy("PBMPayment");

  return [xsgdToken, noahPaymentManager, pbm, addressList];
}

describe("Noah Payment Manager Test", () => {
  let accounts = [];
  let xsgdToken, noahPaymentManager, pbm, addressList;

  before(async () => {
    accounts = await ethers.getSigners();
  });

  beforeEach(async () => {
    [xsgdToken, noahPaymentManager, pbm, addressList] = await init();

    // Initialize accounts with spot tokens
    await xsgdToken.mint(accounts[0].address, parseUnits("10000", await xsgdToken.decimals()));
    await xsgdToken.mint(accounts[1].address, parseUnits("10000", await xsgdToken.decimals()));

    await pbm.initialise(
      Math.round(new Date().getTime() / 1000 + 86400 * 30),
      addressList.address,
      noahPaymentManager.address
    );

    // Create PBM token type
    await createTokenType(pbm, "Test-1XSGD", "1", xsgdToken, accounts[0]);
  });

  it("Should ensure initialisation done correctly", async () => {
    assert(xsgdToken.address !== "");
    assert(noahPaymentManager.address !== "");
    assert(addressList.address !== "");
    assert(pbm.address !== "");

    assert.equal(await xsgdToken.name(), "XSGD");
    assert.equal(await xsgdToken.symbol(), "XSGD");
    assert.equal(await xsgdToken.decimals(), 6);

    expect(await xsgdToken.balanceOf(accounts[0].address)).to.equal(parseUnits("10000", await xsgdToken.decimals()));
    expect(await xsgdToken.balanceOf(accounts[1].address)).to.equal(parseUnits("10000", await xsgdToken.decimals()));
  });

  describe("Noah PBM Core Test", () => {
    let funderSigner, xsgdContractUser;

    beforeEach(async () => {
      funderSigner = accounts[1];
      xsgdContractUser = xsgdToken.connect(funderSigner);
      await xsgdContractUser.increaseAllowance(
        noahPaymentManager.address,
        parseUnits("500", await xsgdToken.decimals())
      );
      expect(await xsgdToken.balanceOf(funderSigner.address)).to.equal(parseUnits("10000", await xsgdToken.decimals()));
    });

    it("Should ensure basic deposit check - ERC20 balance and treasury balance updated upon deposit of funds for a PBM", async () => {
      await noahPaymentManager
        .connect(funderSigner)
        .depositForPBMAddress(pbm.address, xsgdToken.address, parseUnits("500", await xsgdToken.decimals()));

      const tokenBalance = await noahPaymentManager.getPBMCampaignTokenBalance(pbm.address, xsgdToken.address);
      expect(tokenBalance).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(await xsgdToken.balanceOf(funderSigner.address)).to.equal(parseUnits("9500", await xsgdToken.decimals()));
    });

    it("Should ensure that only Noah PBM can only be init once", async () => {
      await noahPaymentManager.initialise();
      await expect(noahPaymentManager.initialise()).to.be.revertedWith("Noah PBM: Already initialised");
    });

    it("Should ensure crawler role is being defined", async () => {
      expect(await noahPaymentManager.NOAH_CRAWLER_ROLE()).to.equal(
        "0x1fd1b424520c6953ed4b151586253c6b4fe3183d39b856d80f513a00f543a978"
      );
    });

    it("Should ensure that only a smart contract can try to create payment", async () => {
      const nonPBMWallet = accounts[2];

      await xsgdToken.mint(nonPBMWallet.address, parseUnits("500", await xsgdToken.decimals()));
      await xsgdToken
        .connect(nonPBMWallet)
        .increaseAllowance(noahPaymentManager.address, parseUnits("500", await xsgdToken.decimals()));

      await expect(
        noahPaymentManager
          .connect(nonPBMWallet)
          .createPayment(
            nonPBMWallet.address,
            accounts[1].address,
            xsgdToken.address,
            parseUnits("500", await xsgdToken.decimals()),
            "example-id",
            "0x"
          )
      ).to.be.revertedWith("Must be from a smart contract");
    });

    it("Should ensure payments can only be created if enough funding for ali use case", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      await expect(
        pbm.connect(aliOmnibus).requestPayment(aliOmnibus.address, merchant.address, 0, 1000, "unique_payment_id", "0x")
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Should ensure payments can only be created if enough funding for grab use case", async () => {
      const merchant = accounts[3];
      const grabMasterWallet = accounts[4];
      const grabUserWallet = accounts[5];
      await xsgdToken.mint(grabMasterWallet.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken
        .connect(grabMasterWallet)
        .increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(grabMasterWallet).mint(0, 500, grabUserWallet.address);
      await pbm.connect(grabUserWallet).setApprovalForAll(grabMasterWallet.address, true);

      await expect(
        pbm
          .connect(grabMasterWallet)
          .requestPayment(grabUserWallet.address, merchant.address, 0, 1000, "unique_payment_id", "0x")
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Should ensure a pending payment is added to pendingPaymentList when requested a payment", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      await pbm
        .connect(aliOmnibus)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      const pendingPayment = await noahPaymentManager.getPendingPayment(aliOmnibus.address, "unique_payment_id");
      expect(pendingPayment[0]).to.equal(xsgdToken.address);
      expect(pendingPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
    });

    it("Should ensure payments can only be created if sourceReferenceID is unique for each pbmCampaign contract", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("1000", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 1000, aliOmnibus.address);

      await pbm
          .connect(aliOmnibus)
          .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      const pendingPayment = await noahPaymentManager.getPendingPayment(aliOmnibus.address, "unique_payment_id");
      expect(pendingPayment[0]).to.equal(xsgdToken.address);
      expect(pendingPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));

      // Request payment with same sourceReferenceID should fail
      await expect(pbm.connect(aliOmnibus).requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x")).to.be.revertedWith("Payment request already exists");
    });

    it("Should ensure a pending payment is removed from pendingPaymentList when completed a payment", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const noahCrawler = accounts[5];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      // Request payment
      await pbm
        .connect(aliOmnibus)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      const pendingPayment = await noahPaymentManager.getPendingPayment(aliOmnibus.address, "unique_payment_id");
      expect(pendingPayment[0]).to.equal(xsgdToken.address);
      expect(pendingPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));

      // Complete payment
      await noahPaymentManager
        .connect(accounts[0])
        .grantRole(noahPaymentManager.NOAH_CRAWLER_ROLE(), noahCrawler.address);
      await noahPaymentManager
        .connect(noahCrawler)
        .completePayment(aliOmnibus.address, "unique_payment_id", "0x");
      // Check if pending payment is removed
      const completedPayment = await noahPaymentManager.getPendingPayment(aliOmnibus.address, "unique_payment_id");
      expect(completedPayment[0]).to.equal(xsgdToken.address);
      expect(completedPayment[1]).to.equal(0);
    });

    it("Should ensure a pending payment is removed from pendingPaymentList when cancelled a payment", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const noahCrawler = accounts[5];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      // Request payment
      await pbm
        .connect(aliOmnibus)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      const pendingPayment = await noahPaymentManager.getPendingPayment(aliOmnibus.address, "unique_payment_id");
      expect(pendingPayment[0]).to.equal(xsgdToken.address);
      expect(pendingPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));

      // Cancel payment
      await noahPaymentManager
        .connect(accounts[0])
        .grantRole(noahPaymentManager.NOAH_CRAWLER_ROLE(), noahCrawler.address);
      await noahPaymentManager
        .connect(noahCrawler)
        .cancelPayment(aliOmnibus.address, "unique_payment_id", "0x");

      // Check if pending payment is removed
      const cancelledPayment = await noahPaymentManager.getPendingPayment(aliOmnibus.address, "unique_payment_id");
      expect(cancelledPayment[0]).to.equal(xsgdToken.address);
      expect(cancelledPayment[1]).to.equal(0);
    });

    it("Should ensure ERC20 balance and treasury balance are NOT changed after payment Created for ali use case", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );

      await pbm
        .connect(aliOmnibus)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
    });

    it("Should ensure ERC20 balance and treasury balance are updated after payment COMPLETED for ali use case", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const noahCrawler = accounts[5];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
      expect(await noahPaymentManager.getPBMCampaignTokenBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );

      await pbm
        .connect(aliOmnibus)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      await noahPaymentManager
        .connect(accounts[0])
        .grantRole(noahPaymentManager.NOAH_CRAWLER_ROLE(), noahCrawler.address);
      await noahPaymentManager
        .connect(noahCrawler)
        .completePayment(aliOmnibus.address, "unique_payment_id", "0x");

      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(0);
      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(0);
      expect(await xsgdToken.balanceOf(merchant.address)).to.equal(parseUnits("500", await xsgdToken.decimals()));
    });

    it("Should ensure ERC20 balance and treasury balance are NOT changed after payment Created for grab use case. Grab master request payment for user", async () => {
      const merchant = accounts[3];
      const grabMasterWallet = accounts[4];
      const grabUserWallet = accounts[5];
      await xsgdToken.mint(grabMasterWallet.address, parseUnits("500", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken
        .connect(grabMasterWallet)
        .increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(grabMasterWallet).mint(0, 500, grabUserWallet.address);
      await pbm.connect(grabUserWallet).setApprovalForAll(grabMasterWallet.address, true);

      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );

      await pbm
        .connect(grabMasterWallet)
        .requestPayment(grabUserWallet.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
    });

    it("Should ensure ERC20 balance and treasury balance are updated after payment COMPLETED for grab use case", async () => {
      const merchant = accounts[3];
      const grabMasterWallet = accounts[4];
      const grabUserWallet = accounts[5];
      const noahCrawler = accounts[6];
      await xsgdToken.mint(grabMasterWallet.address, parseUnits("500", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken
        .connect(grabMasterWallet)
        .increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(grabMasterWallet).mint(0, 500, grabUserWallet.address);
      await pbm.connect(grabUserWallet).setApprovalForAll(grabMasterWallet.address, true);

      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );

      await pbm
        .connect(grabMasterWallet)
        .requestPayment(grabUserWallet.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      await noahPaymentManager
        .connect(accounts[0])
        .grantRole(noahPaymentManager.NOAH_CRAWLER_ROLE(), noahCrawler.address);
      await noahPaymentManager
        .connect(noahCrawler)
        .completePayment(grabUserWallet.address, "unique_payment_id", "0x");

      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(0);
      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(0);
      expect(await xsgdToken.balanceOf(merchant.address)).to.equal(parseUnits("500", await xsgdToken.decimals()));
    });

    describe("Treasury Balance Test", () => {
      it("Should ensure Owner is able to recover specific amount of erc20 tokens in this smart contract", async () => {
        const initialBalance = parseUnits("10000", await xsgdToken.decimals());

        expect(await xsgdToken.balanceOf(accounts[0].address)).to.equal(initialBalance);
        expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(0);

        const amountToRecover = parseUnits("500", await xsgdToken.decimals());

        await xsgdToken.transfer(noahPaymentManager.address, amountToRecover);
        expect(await xsgdToken.balanceOf(accounts[0].address)).to.equal(initialBalance.sub(amountToRecover));
        expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(amountToRecover);

        await noahPaymentManager.connect(accounts[0]).recoverERC20Tokens(xsgdToken.address, amountToRecover);
        expect(await xsgdToken.balanceOf(accounts[0].address)).to.equal(initialBalance);
        expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(0);
      });

      it("Should ensure Owner is able to recover all erc20 tokens in this smart contract", async () => {
        const initialBalance = parseUnits("10000", await xsgdToken.decimals());

        expect(await xsgdToken.balanceOf(accounts[0].address)).to.equal(initialBalance);
        expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(0);

        await xsgdToken.transfer(noahPaymentManager.address, initialBalance);
        expect(await xsgdToken.balanceOf(accounts[0].address)).to.equal(0);
        expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(initialBalance);

        await noahPaymentManager.connect(accounts[0]).recoverAllERC20Tokens(xsgdToken.address);
        expect(await xsgdToken.balanceOf(accounts[0].address)).to.equal(initialBalance);
        expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(0);
      });

      it("Should ensure only Owner is able to recover erc20 tokens in this smart contract", async () => {
        await expect(
          noahPaymentManager
            .connect(accounts[1])
            .recoverERC20Tokens(xsgdToken.address, parseUnits("500", await xsgdToken.decimals()))
        ).to.be.revertedWith("Ownable: caller is not the owner");

        await expect(
          noahPaymentManager.connect(accounts[1]).recoverAllERC20Tokens(xsgdToken.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Should ensure withdrawal for pbm works", async () => {
        await noahPaymentManager
          .connect(funderSigner)
          .depositForPBMAddress(pbm.address, xsgdToken.address, parseUnits("500", await xsgdToken.decimals()));

        const tokenBalance = await noahPaymentManager.getPBMCampaignTokenBalance(pbm.address, xsgdToken.address);
        expect(tokenBalance).to.equal(parseUnits("500", await xsgdToken.decimals()));
        expect(await xsgdToken.balanceOf(funderSigner.address)).to.equal(
          parseUnits("9500", await xsgdToken.decimals())
        );

        await noahPaymentManager
          .connect(accounts[0])
          .withdrawFromPBMAddress(
            pbm.address,
            funderSigner.address,
            xsgdToken.address,
            parseUnits("500", await xsgdToken.decimals())
          );

        expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(0);
        expect(await xsgdToken.balanceOf(funderSigner.address)).to.equal(
          parseUnits("10000", await xsgdToken.decimals())
        );
      });

      it("Should ensure withdrawal cannot exceed pbm owned amount for pbm works", async () => {
        await noahPaymentManager
          .connect(funderSigner)
          .depositForPBMAddress(pbm.address, xsgdToken.address, parseUnits("500", await xsgdToken.decimals()));

        const tokenBalance = await noahPaymentManager.getPBMCampaignTokenBalance(pbm.address, xsgdToken.address);
        expect(tokenBalance).to.equal(parseUnits("500", await xsgdToken.decimals()));
        expect(await xsgdToken.balanceOf(funderSigner.address)).to.equal(
          parseUnits("9500", await xsgdToken.decimals())
        );

        await expect(
          noahPaymentManager
            .connect(accounts[0])
            .withdrawFromPBMAddress(
              pbm.address,
              funderSigner.address,
              xsgdToken.address,
              parseUnits("1000", await xsgdToken.decimals())
            )
        ).to.be.revertedWith("Cannot withdraw more than what a campaignPBM possess");
      });
    });
  });
});
