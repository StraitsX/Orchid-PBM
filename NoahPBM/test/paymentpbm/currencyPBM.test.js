const { assert, expect } = require("chai");
const { ethers } = require("hardhat");
const { deploy, initPBM, parseUnits, createTokenType } = require("./testHelper.js");

async function init() {
  const xsgdToken = await deploy("Spot", "XSGD", "XSGD", 6);
  const noahPaymentManager = await deploy("NoahPaymentManager");
  const addressList = await deploy("PBMMerchantAddressList");
  const pbm = await deploy("CurrencyPBM");

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

    it("Should ensure that only pre approved operators can request payment on behalf of master wallet", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const aliOperator = accounts[5];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      await expect(
        pbm.connect(aliOperator).requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x")
      ).to.be.revertedWith("ERC1155: caller is not token owner nor approved");
    });

    it("Should ensure payments can only be created if enough funding for ali use case", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const aliOperator = accounts[5];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      // grant aliOperator to spend aliOmnibus's PBM for payment
      await pbm.connect(aliOmnibus).setApprovalForAll(aliOperator.address, true);

      await expect(
        pbm
          .connect(aliOperator)
          .requestPayment(aliOmnibus.address, merchant.address, 0, 1000, "unique_payment_id", "0x")
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Should ensure a pending payment is added to pendingPaymentList when requested a payment", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const aliOperator = accounts[5];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      // grant aliOperator to spend aliOmnibus's PBM for payment
      await pbm.connect(aliOmnibus).setApprovalForAll(aliOperator.address, true);

      await pbm
        .connect(aliOperator)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      const pendingPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(pendingPayment[0]).to.equal(xsgdToken.address); // erc20 address
      expect(pendingPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals())); // erc20 value
      expect(pendingPayment[2]).to.equal(0); // refunded value
      expect(pendingPayment[3]).to.equal(1); // status pending
    });

    it("Should ensure payments can only be created if sourceReferenceID is unique for each pbmCampaign contract", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const aliOperator = accounts[5];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken
        .connect(aliOmnibus)
        .increaseAllowance(pbm.address, parseUnits("1000", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 1000, aliOmnibus.address);

      // grant aliOperator to spend aliOmnibus's PBM for payment
      await pbm.connect(aliOmnibus).setApprovalForAll(aliOperator.address, true);

      await pbm
        .connect(aliOperator)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      const pendingPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(pendingPayment[0]).to.equal(xsgdToken.address);
      expect(pendingPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));

      // Request payment with same sourceReferenceID should fail
      await expect(
        pbm.connect(aliOmnibus).requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x")
      ).to.be.revertedWith("Payment already exists");
    });

    it("Should ensure a pending payment is maked as completed when completed a payment", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const aliOperator = accounts[5];
      const noahCrawler = accounts[6];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      // grant aliOperator to spend aliOmnibus's PBM for payment
      await pbm.connect(aliOmnibus).setApprovalForAll(aliOperator.address, true);

      // Request payment
      await pbm
        .connect(aliOperator)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      const pendingPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(pendingPayment[0]).to.equal(xsgdToken.address);
      expect(pendingPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(pendingPayment[2]).to.equal(0); // refunded value
      expect(pendingPayment[3]).to.equal(1); // status PENDING

      // Complete payment
      await noahPaymentManager
        .connect(accounts[0])
        .grantRole(noahPaymentManager.NOAH_CRAWLER_ROLE(), noahCrawler.address);
      await noahPaymentManager.connect(noahCrawler).completePayment(aliOmnibus.address, "unique_payment_id", "0x");
      // Check if pending payment is removed
      const completedPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(completedPayment[0]).to.equal(xsgdToken.address);
      expect(completedPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(completedPayment[2]).to.equal(0); // refunded value
      expect(completedPayment[3]).to.equal(2); // status COMPLETED
    });

    it("Should ensure only payment manager can call revertPayment on CurrencyPBM", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const aliOperator = accounts[5];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      // grant aliOperator to spend aliOmnibus's PBM for payment
      await pbm.connect(aliOmnibus).setApprovalForAll(aliOperator.address, true);

      // check treasury balance
      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );

      // Request payment
      await pbm
        .connect(aliOmnibus)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      await expect(
        pbm.connect(aliOmnibus).revertPaymentForCancel(aliOmnibus.address, "unique_payment_id")
      ).to.be.revertedWith("PBM: Only noah payment manager can revert payment");

      await expect(
        pbm.connect(aliOmnibus).revertPaymentForRefund(aliOmnibus.address, "unique_payment_id", 500)
      ).to.be.revertedWith("PBM: Only noah payment manager can revert payment");
    });

    it("Should ensure only granted role can call cancelPayment on NoahPaymentManager", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const aliOperator = accounts[5];
      const noahCrawler = accounts[6];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      // grant aliOperator to spend aliOmnibus's PBM for payment
      await pbm.connect(aliOmnibus).setApprovalForAll(aliOperator.address, true);

      // check treasury balance
      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );

      // Request payment
      await pbm
        .connect(aliOperator)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      // Check if pbm token is burnt
      expect(await pbm.balanceOf(aliOmnibus.address, 0)).to.equal(0);

      const pendingPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(pendingPayment[0]).to.equal(xsgdToken.address);
      expect(pendingPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(pendingPayment[2]).to.equal(0); // refunded value
      expect(pendingPayment[3]).to.equal(1); // status PENDING

      // Cancel payment without granted role
      await expect(noahPaymentManager.connect(noahCrawler).cancelPayment(aliOmnibus.address, "unique_payment_id", "0x"))
        .to.be.reverted;
    });

    it("Should ensure a pending payment is updated to CANCELLED and PBMToken minted back to from address when cancel a payment", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const aliOperator = accounts[5];
      const noahCrawler = accounts[6];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      // grant aliOperator to spend aliOmnibus's PBM for payment
      await pbm.connect(aliOmnibus).setApprovalForAll(aliOperator.address, true);

      // check treasury balance
      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );

      // Request payment
      await pbm
        .connect(aliOperator)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      // Check if pbm token is burnt
      expect(await pbm.balanceOf(aliOmnibus.address, 0)).to.equal(0);

      const pendingPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(pendingPayment[0]).to.equal(xsgdToken.address);
      expect(pendingPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(pendingPayment[2]).to.equal(0); // refunded value
      expect(pendingPayment[3]).to.equal(1); // status PENDING

      // Cancel payment
      await noahPaymentManager
        .connect(accounts[0])
        .grantRole(noahPaymentManager.NOAH_CRAWLER_ROLE(), noahCrawler.address);
      await noahPaymentManager.connect(noahCrawler).cancelPayment(aliOmnibus.address, "unique_payment_id", "0x");

      // Check if pending payment is cancelled
      const cancelledPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(cancelledPayment[0]).to.equal(xsgdToken.address);
      expect(cancelledPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(cancelledPayment[2]).to.equal(0); // refunded value
      expect(cancelledPayment[3]).to.equal(3); // status CANCELLED

      // Check if treasury balance stays the same
      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );

      // Check if pbm token is minted back to from address
      expect(await pbm.balanceOf(aliOmnibus.address, 0)).to.equal(500);
    });

    it("Should ensure refund amount is no more than payment amount when refund a payment", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const aliOperator = accounts[5];
      const noahCrawler = accounts[6];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));
      await xsgdToken.mint(noahCrawler.address, parseUnits("500", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      // grant aliOperator to spend aliOmnibus's PBM for payment
      await pbm.connect(aliOmnibus).setApprovalForAll(aliOperator.address, true);

      await pbm
        .connect(aliOperator)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      // Check if pbm token is burnt
      expect(await pbm.balanceOf(aliOmnibus.address, 0)).to.equal(0);

      const pendingPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(pendingPayment[0]).to.equal(xsgdToken.address);
      expect(pendingPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(pendingPayment[2]).to.equal(0); // refunded value
      expect(pendingPayment[3]).to.equal(1); // status PENDING

      // complete payment

      await noahPaymentManager
        .connect(accounts[0])
        .grantRole(noahPaymentManager.NOAH_CRAWLER_ROLE(), noahCrawler.address);
      await noahPaymentManager.connect(noahCrawler).completePayment(aliOmnibus.address, "unique_payment_id", "0x");

      // Check if pending payment is complete
      const completedPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(completedPayment[0]).to.equal(xsgdToken.address);
      expect(completedPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(completedPayment[2]).to.equal(0); // refunded value
      expect(completedPayment[3]).to.equal(2); // status COMPLETED

      // grant noah payment manager to spend noah crawler's stablecoin for refund
      await xsgdToken
        .connect(noahCrawler)
        .increaseAllowance(noahPaymentManager.address, parseUnits("1000", await xsgdToken.decimals()));
      // try to refund more than payment
      await expect(
        noahPaymentManager
          .connect(noahCrawler)
          .refundPayment(
            aliOmnibus.address,
            "unique_payment_id",
            "refund_unique_id",
            parseUnits("600", await xsgdToken.decimals()),
            "0x"
          )
      ).to.be.revertedWith("Refund value must be less than or equal to remaining paid value");

      // Check if payment is refunded
      const notRefundedPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(notRefundedPayment[0]).to.equal(xsgdToken.address);
      expect(notRefundedPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(notRefundedPayment[2]).to.equal(0); // refunded value
      expect(notRefundedPayment[3]).to.equal(2); // status COMPLETED
      expect(await pbm.balanceOf(aliOmnibus.address, 0)).to.equal(0);
    });

    it("Should ensure second partial refund amount is no more than remaining paid amount when partial refund a payment", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const aliOperator = accounts[5];
      const noahCrawler = accounts[6];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));
      await xsgdToken.mint(noahCrawler.address, parseUnits("500", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      // grant aliOperator to spend aliOmnibus's PBM for payment
      await pbm.connect(aliOmnibus).setApprovalForAll(aliOperator.address, true);

      await pbm
        .connect(aliOperator)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      // Check if pbm token is burnt
      expect(await pbm.balanceOf(aliOmnibus.address, 0)).to.equal(0);

      const pendingPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(pendingPayment[0]).to.equal(xsgdToken.address);
      expect(pendingPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(pendingPayment[2]).to.equal(0); // refunded value
      expect(pendingPayment[3]).to.equal(1); // status PENDING

      // complete payment

      await noahPaymentManager
        .connect(accounts[0])
        .grantRole(noahPaymentManager.NOAH_CRAWLER_ROLE(), noahCrawler.address);
      await noahPaymentManager.connect(noahCrawler).completePayment(aliOmnibus.address, "unique_payment_id", "0x");

      // Check if pending payment is complete
      const completedPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(completedPayment[0]).to.equal(xsgdToken.address);
      expect(completedPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(completedPayment[2]).to.equal(0); // refunded value
      expect(completedPayment[3]).to.equal(2); // status COMPLETED

      // grant noah payment manager to spend noah crawler's stablecoin for refund
      await xsgdToken
        .connect(noahCrawler)
        .increaseAllowance(noahPaymentManager.address, parseUnits("1000", await xsgdToken.decimals()));

      // first partial refund
      // partial refund payment (full amount 500, refund amount 200)
      await noahPaymentManager
        .connect(noahCrawler)
        .refundPayment(
          aliOmnibus.address,
          "unique_payment_id",
          "refund_unique_id",
          parseUnits("200", await xsgdToken.decimals()),
          "0x"
        );

      // Check if payment is refunded
      const refundedPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(refundedPayment[0]).to.equal(xsgdToken.address);
      expect(refundedPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(refundedPayment[2]).to.equal(parseUnits("200", await xsgdToken.decimals())); // refunded value
      expect(refundedPayment[3]).to.equal(5); // status PARTIAL_REFUNDED

      // check if pbm token balance is minted back to from address
      expect(await pbm.balanceOf(aliOmnibus.address, 0)).to.equal(200);

      // second partial refund try to refund more than remaining paid amount

      await expect(
        noahPaymentManager
          .connect(noahCrawler)
          .refundPayment(
            aliOmnibus.address,
            "unique_payment_id",
            "refund_unique_id",
            parseUnits("400", await xsgdToken.decimals()),
            "0x"
          )
      ).to.be.revertedWith("Refund value must be less than or equal to remaining paid value");

      // Check if payment is refunded
      const notRefundedPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(notRefundedPayment[0]).to.equal(xsgdToken.address);
      expect(notRefundedPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(notRefundedPayment[2]).to.equal(parseUnits("200", await xsgdToken.decimals())); // refunded value
      expect(notRefundedPayment[3]).to.equal(5); // status COMPLETED
      expect(await pbm.balanceOf(aliOmnibus.address, 0)).to.equal(200);
    });

    it("Should ensure a partial refund payment is updated to PARTIAL_REFUNDED and correct amount of PBMToken minted back to from address when partial refund a payment", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const aliOperator = accounts[5];
      const noahCrawler = accounts[6];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));
      await xsgdToken.mint(noahCrawler.address, parseUnits("500", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      // grant aliOperator to spend aliOmnibus's PBM for payment
      await pbm.connect(aliOmnibus).setApprovalForAll(aliOperator.address, true);

      await pbm
        .connect(aliOperator)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      // Check if pbm token is burnt
      expect(await pbm.balanceOf(aliOmnibus.address, 0)).to.equal(0);

      const pendingPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(pendingPayment[0]).to.equal(xsgdToken.address);
      expect(pendingPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(pendingPayment[2]).to.equal(0); // refunded value
      expect(pendingPayment[3]).to.equal(1); // status PENDING

      // complete payment

      await noahPaymentManager
        .connect(accounts[0])
        .grantRole(noahPaymentManager.NOAH_CRAWLER_ROLE(), noahCrawler.address);
      await noahPaymentManager.connect(noahCrawler).completePayment(aliOmnibus.address, "unique_payment_id", "0x");

      // Check if pending payment is complete
      const completedPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(completedPayment[0]).to.equal(xsgdToken.address);
      expect(completedPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(completedPayment[2]).to.equal(0); // refunded value
      expect(completedPayment[3]).to.equal(2); // status COMPLETED

      // grant noah payment manager to spend noah crawler's stablecoin for refund
      await xsgdToken
        .connect(noahCrawler)
        .increaseAllowance(noahPaymentManager.address, parseUnits("200", await xsgdToken.decimals()));
      // partial refund payment (full amount 500, refund amount 200)
      await noahPaymentManager
        .connect(noahCrawler)
        .refundPayment(
          aliOmnibus.address,
          "unique_payment_id",
          "refund_unique_id",
          parseUnits("200", await xsgdToken.decimals()),
          "0x"
        );

      // Check if payment is refunded
      const refundedPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(refundedPayment[0]).to.equal(xsgdToken.address);
      expect(refundedPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(refundedPayment[2]).to.equal(parseUnits("200", await xsgdToken.decimals())); // refunded value
      expect(refundedPayment[3]).to.equal(5); // status PARTIAL_REFUNDED

      // check if pbm token balance is minted back to from address
      expect(await pbm.balanceOf(aliOmnibus.address, 0)).to.equal(200);
    });

    it("Should ensure a partial refund payment is updated to REFUNDED and correct amount of PBMToken minted back to from address when refund made the full amount", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const aliOperator = accounts[5];
      const noahCrawler = accounts[6];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));
      await xsgdToken.mint(noahCrawler.address, parseUnits("500", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      // grant aliOperator to spend aliOmnibus's PBM for payment
      await pbm.connect(aliOmnibus).setApprovalForAll(aliOperator.address, true);

      await pbm
        .connect(aliOperator)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      // Check if pbm token is burnt
      expect(await pbm.balanceOf(aliOmnibus.address, 0)).to.equal(0);

      const pendingPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(pendingPayment[0]).to.equal(xsgdToken.address);
      expect(pendingPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(pendingPayment[2]).to.equal(0); // refunded value
      expect(pendingPayment[3]).to.equal(1); // status PENDING

      // complete payment

      await noahPaymentManager
        .connect(accounts[0])
        .grantRole(noahPaymentManager.NOAH_CRAWLER_ROLE(), noahCrawler.address);
      await noahPaymentManager.connect(noahCrawler).completePayment(aliOmnibus.address, "unique_payment_id", "0x");

      // Check if pending payment is complete
      const completedPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(completedPayment[0]).to.equal(xsgdToken.address);
      expect(completedPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(completedPayment[2]).to.equal(0); // refunded value
      expect(completedPayment[3]).to.equal(2); // status COMPLETED

      // grant noah payment manager to spend noah crawler's stablecoin for refund
      await xsgdToken
        .connect(noahCrawler)
        .increaseAllowance(noahPaymentManager.address, parseUnits("200", await xsgdToken.decimals()));
      // partial refund payment (full amount 500, refund amount 200)
      await noahPaymentManager
        .connect(noahCrawler)
        .refundPayment(
          aliOmnibus.address,
          "unique_payment_id",
          "refund_unique_id",
          parseUnits("200", await xsgdToken.decimals()),
          "0x"
        );

      // Check if payment is refunded
      const refundedPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(refundedPayment[0]).to.equal(xsgdToken.address);
      expect(refundedPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(refundedPayment[2]).to.equal(parseUnits("200", await xsgdToken.decimals())); // refunded value
      expect(refundedPayment[3]).to.equal(5); // status PARTIAL_REFUNDED

      // check if pbm token balance is minted back to from address
      expect(await pbm.balanceOf(aliOmnibus.address, 0)).to.equal(200);

      // second partial refund to make it full refund
      // grant noah payment manager to spend noah crawler's stablecoin for refund
      await xsgdToken
        .connect(noahCrawler)
        .increaseAllowance(noahPaymentManager.address, parseUnits("300", await xsgdToken.decimals()));
      // partial refund payment (remaining amount 300, refund amount 300)
      await noahPaymentManager
        .connect(noahCrawler)
        .refundPayment(
          aliOmnibus.address,
          "unique_payment_id",
          "refund_unique_id",
          parseUnits("300", await xsgdToken.decimals()),
          "0x"
        );

      // Check if payment is refunded
      const fullyRefundedPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(fullyRefundedPayment[0]).to.equal(xsgdToken.address);
      expect(fullyRefundedPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(fullyRefundedPayment[2]).to.equal(parseUnits("500", await xsgdToken.decimals())); // refunded value
      expect(fullyRefundedPayment[3]).to.equal(4); // status REFUNDED

      // check if pbm token balance is minted back to from address
      expect(await pbm.balanceOf(aliOmnibus.address, 0)).to.equal(500);
    });

    it("Should ensure a fully refund payment is updated to REFUNDED and PBMToken minted back to from address when fully refund a payment", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const aliOperator = accounts[5];
      const noahCrawler = accounts[6];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));
      await xsgdToken.mint(noahCrawler.address, parseUnits("500", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      // grant aliOperator to spend aliOmnibus's PBM for payment
      await pbm.connect(aliOmnibus).setApprovalForAll(aliOperator.address, true);

      await pbm
        .connect(aliOperator)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      // Check if pbm token is burnt
      expect(await pbm.balanceOf(aliOmnibus.address, 0)).to.equal(0);

      const pendingPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(pendingPayment[0]).to.equal(xsgdToken.address);
      expect(pendingPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(pendingPayment[2]).to.equal(0); // refunded value
      expect(pendingPayment[3]).to.equal(1); // status PENDING

      // complete payment

      await noahPaymentManager
        .connect(accounts[0])
        .grantRole(noahPaymentManager.NOAH_CRAWLER_ROLE(), noahCrawler.address);
      await noahPaymentManager.connect(noahCrawler).completePayment(aliOmnibus.address, "unique_payment_id", "0x");

      // Check if pending payment is complete
      const completedPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(completedPayment[0]).to.equal(xsgdToken.address);
      expect(completedPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(completedPayment[2]).to.equal(0); // refunded value
      expect(completedPayment[3]).to.equal(2); // status COMPLETED

      // grant noah payment manager to spend noah crawler's stablecoin for refund
      await xsgdToken
        .connect(noahCrawler)
        .increaseAllowance(noahPaymentManager.address, parseUnits("500", await xsgdToken.decimals()));
      // fully refund payment
      await noahPaymentManager
        .connect(noahCrawler)
        .refundPayment(
          aliOmnibus.address,
          "unique_payment_id",
          "refund_unique_id",
          parseUnits("500", await xsgdToken.decimals()),
          "0x"
        );

      // Check if payment is refunded
      const refundedPayment = await noahPaymentManager.getPayment(aliOmnibus.address, "unique_payment_id");
      expect(refundedPayment[0]).to.equal(xsgdToken.address);
      expect(refundedPayment[1]).to.equal(parseUnits("500", await xsgdToken.decimals()));
      expect(refundedPayment[2]).to.equal(parseUnits("500", await xsgdToken.decimals())); // refunded value
      expect(refundedPayment[3]).to.equal(4); // status REFUNDED

      // check if pbm token balance is minted back to from address
      expect(await pbm.balanceOf(aliOmnibus.address, 0)).to.equal(500);
    });

    it("Should ensure ERC20 balance and treasury balance are NOT changed after payment Created for ali use case", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const aliOperator = accounts[5];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      // grant aliOperator to spend aliOmnibus's PBM for payment
      await pbm.connect(aliOmnibus).setApprovalForAll(aliOperator.address, true);

      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );

      await pbm
        .connect(aliOperator)
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
      const aliOperator = accounts[5];
      const noahCrawler = accounts[6];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      // grant aliOperator to spend aliOmnibus's PBM for payment
      await pbm.connect(aliOmnibus).setApprovalForAll(aliOperator.address, true);

      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
      expect(await noahPaymentManager.getPBMCampaignTokenBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );

      await pbm
        .connect(aliOperator)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      await noahPaymentManager
        .connect(accounts[0])
        .grantRole(noahPaymentManager.NOAH_CRAWLER_ROLE(), noahCrawler.address);
      await noahPaymentManager.connect(noahCrawler).completePayment(aliOmnibus.address, "unique_payment_id", "0x");

      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(0);
      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(0);
      expect(await xsgdToken.balanceOf(merchant.address)).to.equal(parseUnits("500", await xsgdToken.decimals()));
    });

    it("Should ensure ERC20 balance and treasury balance are updated after payment REFUNDED for ali use case", async () => {
      const merchant = accounts[3];
      const aliOmnibus = accounts[4];
      const aliOperator = accounts[5];
      const noahCrawler = accounts[6];
      await xsgdToken.mint(aliOmnibus.address, parseUnits("10000", await xsgdToken.decimals()));
      await xsgdToken.mint(noahCrawler.address, parseUnits("500", await xsgdToken.decimals()));

      await addressList.addMerchantAddresses([merchant.address], "");
      await xsgdToken.connect(aliOmnibus).increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      await pbm.connect(aliOmnibus).mint(0, 500, aliOmnibus.address);

      // grant aliOperator to spend aliOmnibus's PBM for payment
      await pbm.connect(aliOmnibus).setApprovalForAll(aliOperator.address, true);

      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
      expect(await noahPaymentManager.getPBMCampaignTokenBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );

      await pbm
        .connect(aliOperator)
        .requestPayment(aliOmnibus.address, merchant.address, 0, 500, "unique_payment_id", "0x");

      await noahPaymentManager
        .connect(accounts[0])
        .grantRole(noahPaymentManager.NOAH_CRAWLER_ROLE(), noahCrawler.address);
      await noahPaymentManager.connect(noahCrawler).completePayment(aliOmnibus.address, "unique_payment_id", "0x");

      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(0);
      expect(await xsgdToken.balanceOf(aliOmnibus.address)).to.equal(parseUnits("9500", await xsgdToken.decimals()));
      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(0);
      expect(await xsgdToken.balanceOf(merchant.address)).to.equal(parseUnits("500", await xsgdToken.decimals()));

      // grant noah payment manager to spend noah crawler's stablecoin for refund
      await xsgdToken
        .connect(noahCrawler)
        .increaseAllowance(noahPaymentManager.address, parseUnits("500", await xsgdToken.decimals()));
      // refund payment
      await noahPaymentManager
        .connect(noahCrawler)
        .refundPayment(
          aliOmnibus.address,
          "unique_payment_id",
          "refund_unique_id",
          parseUnits("500", await xsgdToken.decimals()),
          "0x"
        );

      // check noah crawler stablecoin balance
      expect(await xsgdToken.balanceOf(noahCrawler.address)).to.equal(0);
      // check ali omnibus stablecoin balance
      expect(await xsgdToken.balanceOf(aliOmnibus.address)).to.equal(parseUnits("9500", await xsgdToken.decimals()));
      // check campaign treasury balance
      expect(await noahPaymentManager.getPBMCampaignTokenBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
      // check noah payment manager stablecoin balance
      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
    });
  });
});
