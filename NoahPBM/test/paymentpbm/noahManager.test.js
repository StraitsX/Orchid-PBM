const { assert, expect } = require("chai");
const { ethers } = require("hardhat");
const { deploy, initPBM, parseUnits } = require("./testHelper.js");
const { createTokenType } = require("./testHelper");
const { address } = require("hardhat/internal/core/config/config-validation");

async function init() {
  let xsgdToken = await deploy("Spot", "XSGD", "XSGD", 6);
  let noahPaymentManager = await deploy("NoahPaymentManager");
  let addressList = await deploy("PBMMerchantAddressList");
  let pbm = await deploy("PBMPayment");

  return [xsgdToken, noahPaymentManager, pbm, addressList];
}

describe("Noah Payment Manager Test", async () => {
  /** Initialise Wallet Addresses */
  const accounts = [];

  before(async () => {
    (await ethers.getSigners()).forEach((signer, index) => {
      accounts[index] = signer;
    });
  });

  /** Initialise Smart contracts Required for tests. */
  let xsgdToken;
  let noahPaymentManager;
  let pbm;
  let addressList;

  beforeEach(async () => {
    [xsgdToken, noahPaymentManager, pbm, addressList] = await init();

    // Init accouns with spot tokens
    await xsgdToken.mint(accounts[0].address, parseUnits("10000", await xsgdToken.decimals()));
    await xsgdToken.mint(accounts[1].address, parseUnits("10000", await xsgdToken.decimals()));

    await pbm.initialise(
      Math.round(new Date().getTime() / 1000 + 86400 * 30),
      addressList.address,
      noahPaymentManager.address
    );
    // create pbm token 0
    await createTokenType(pbm, "Test-1XSGD", "1", xsgdToken, accounts[0]);
  });

  /** Verify Deployments first */
  it("Should ensure initialisation done correctly", async () => {
    assert(xsgdToken.address !== "");
    assert(noahPaymentManager.address !== "");
    assert(addressList.address !== "");
    assert(pbm.address !== "");

    assert.equal(await xsgdToken.name(), "XSGD");
    assert.equal(await xsgdToken.symbol(), "XSGD");
    assert.equal(await xsgdToken.decimals(), 6);

    expect(await xsgdToken.balanceOf(accounts[0].address)).to.equals(10000000000);
    expect(await xsgdToken.balanceOf(accounts[1].address)).to.equals(10000000000);
  });

  /** Noah Payment related tests*/
  describe("Noah PBM Core Test", async () => {
    let funderSigner;
    let xsgdContractUser;

    beforeEach(async () => {
      funderSigner = accounts[1];
      // set approval to pull funds
      xsgdContractUser = xsgdToken.connect(funderSigner);
      await xsgdContractUser.increaseAllowance(
        noahPaymentManager.address,
        parseUnits("500", await xsgdToken.decimals())
      );
      expect(await xsgdToken.balanceOf(funderSigner.address)).to.equals(10000000000);
    });

    it("Should ensure basic deposit check - ERC20 balance and treasury balance updated upon deposit of funds for a PBM", async () => {
      // mint and pull funds
      await noahPaymentManager
        .connect(funderSigner)
        .depositForPBMAddress(pbm.address, xsgdToken.address, parseUnits("500", await xsgdToken.decimals()));

      // check balance transfered from funder to noah payment manager on behalf of PBM
      let tokenBalance = await noahPaymentManager.getPBMCampaignTokenBalance(pbm.address, xsgdToken.address);
      expect(tokenBalance).to.equal(parseUnits("500", await xsgdToken.decimals()));
      console.log(await xsgdToken.balanceOf(funderSigner.address));
      expect(await xsgdToken.balanceOf(funderSigner.address)).to.equals(9500000000);
    });

    // required to ensure admin roles are not hijacked
    it("Should ensure that only Noah PBM can only be init once", async () => {
      await noahPaymentManager.initialise();
      await expect(noahPaymentManager.initialise()).to.be.revertedWith("Noah PBM: Already initialised");
    });

    it("Should ensure crawler role is being defined", async () => {
      expect(await noahPaymentManager.NOAH_CRAWLER_ROLE()).equals(
        "0x1fd1b424520c6953ed4b151586253c6b4fe3183d39b856d80f513a00f543a978"
      );
    });

    it("Should ensure that only a smart contract can try to create payment", async () => {
      let nonPBMWallet = accounts[2];

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

    it("Should ensure payments can only be created if enough funding", async () => {
      let merchant = accounts[3];
      // whitelist as merchant
      await addressList.addMerchantAddresses([merchant.address], "");
      // approve pbm to pull from accounts[0]
      await xsgdToken
        .connect(accounts[0])
        .increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      // mint PBM to accounts[0]
      await pbm.mint(0, 500, accounts[0].address);
      // set approval to PBM contract
      await pbm.connect(accounts[0]).setApprovalForAll(pbm.address, true);
      await expect(
        pbm.connect(accounts[0]).createPayment(pbm.address, merchant.address, 0, 1000, "unique_payment_id", "0x")
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Should ensure ERC20 balance and treasury balance are NOT change after payment Created", async () => {
      let merchant = accounts[3];
      // whitelist as merchant
      await addressList.addMerchantAddresses([merchant.address], "");
      // approve pbm to pull from accounts[0]
      await xsgdToken
        .connect(accounts[0])
        .increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      // mint PBM to accounts[0]
      // deposit happens inside mint so upon minting,
      // the ERC20 tokens are transferred to noahPaymentManager
      // and the treasury balance for the campaign PBM is updated
      await pbm.mint(0, 500, accounts[0].address);
      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
      // set approval to PBM contract
      await pbm.connect(accounts[0]).setApprovalForAll(pbm.address, true);
      // create 500 XSGD worth of payment
      await pbm.connect(accounts[0]).createPayment(pbm.address, merchant.address, 0, 500, "unique_payment_id", "0x");
      // check if treasury balance is still the same
      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
      // check if ERC20 balance is still the same
      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
    });
    it("Should ensure ERC20 balance and treasury balance are NOT changed after payment Cancelled", async () => {
      // skip cancel test for now since the cancel flow isn't finalized.
    });

    it("Should ensure ERC20 balance and treasury balance are updated after payment COMPLETED", async () => {
      let merchant = accounts[3];
      // whitelist as merchant
      await addressList.addMerchantAddresses([merchant.address], "");
      // approve pbm to pull from accounts[0]
      await xsgdToken
        .connect(accounts[0])
        .increaseAllowance(pbm.address, parseUnits("500", await xsgdToken.decimals()));
      // mint PBM to accounts[0]
      // deposit happens inside mint so upon minting,
      // the ERC20 tokens are transferred to noahPaymentManager
      // and the treasury balance for the campaign PBM is updated
      await pbm.mint(0, 500, accounts[0].address);
      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
      // set approval to PBM contract
      await pbm.connect(accounts[0]).setApprovalForAll(pbm.address, true);
      // create 500 XSGD worth of payment
      await pbm.connect(accounts[0]).createPayment(pbm.address, merchant.address, 0, 500, "unique_payment_id", "0x");
      // check if treasury balance is still the same
      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );
      // check if ERC20 balance is still the same
      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(
        parseUnits("500", await xsgdToken.decimals())
      );

      // complete payment
      await noahPaymentManager
        .connect(accounts[0])
        .grantRole(noahPaymentManager.NOAH_CRAWLER_ROLE(), accounts[4].address);
      await noahPaymentManager
        .connect(accounts[4])
        .completePayment(
          pbm.address,
          accounts[0].address,
          merchant.address,
          xsgdToken.address,
          parseUnits("500", await xsgdToken.decimals()),
          "unique_payment_id",
          "0x"
        );
      // update treasury balance and erc20 balance accordingly
      expect(await noahPaymentManager.getPBMCampaignTreasuryBalance(pbm.address, xsgdToken.address)).to.equal(0);
      expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(0);
    });
    it("Should ensure ERC20 balance and treasury balance are updated after payment Refunded", async () => {
      // skip for now since refund flow isn't implemented
    });

    describe("Treasury Balance Test", async () => {
      it("Should ensure Owner is able to recover specific amount of erc20 tokens in this smart contract", async () => {
        // initial balance of 1000 XSGD
        let initialBalance = ethers.utils.parseUnits("10000", await xsgdToken.decimals());
        expect(await xsgdToken.balanceOf(accounts[0].address)).to.equal(initialBalance);
        expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(0);
        const amountToRecover = ethers.utils.parseUnits("500", await xsgdToken.decimals());
        // Transfer tokens to the contract
        await xsgdToken.transfer(noahPaymentManager.address, amountToRecover);
        expect(await xsgdToken.balanceOf(accounts[0].address)).to.equal(initialBalance - amountToRecover);
        expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(amountToRecover);

        // recover specific amount
        await noahPaymentManager.connect(accounts[0]).recoverERC20Tokens(xsgdToken.address, amountToRecover);
        expect(await xsgdToken.balanceOf(accounts[0].address)).to.equal(initialBalance);
      });

      it("Should ensure Owner is able to recover all erc20 tokens in this smart contract", async () => {
        // initial balance of 1000 XSGD
        let initialBalance = ethers.utils.parseUnits("10000", await xsgdToken.decimals());
        expect(await xsgdToken.balanceOf(accounts[0].address)).to.equal(initialBalance);
        expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(0);
        // Transfer tokens to the contract
        await xsgdToken.transfer(noahPaymentManager.address, initialBalance);
        expect(await xsgdToken.balanceOf(accounts[0].address)).to.equal(0);
        expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(initialBalance);

        // recover all
        await noahPaymentManager.connect(accounts[0]).recoverAllERC20Tokens(xsgdToken.address);
        expect(await xsgdToken.balanceOf(accounts[0].address)).to.equal(initialBalance);
      });

      it("Should ensure only Owner is able to recover erc20 tokens in this smart contract", async () => {
        await expect(
          noahPaymentManager
            .connect(accounts[1])
            .recoverERC20Tokens(xsgdToken.address, ethers.utils.parseUnits("500", await xsgdToken.decimals()))
        ).to.be.revertedWith("Ownable: caller is not the owner");
        await expect(
          noahPaymentManager.connect(accounts[1]).recoverAllERC20Tokens(xsgdToken.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Should ensure withdrawal for pbm works", async () => {
        // deposit
        await noahPaymentManager
          .connect(funderSigner)
          .depositForPBMAddress(pbm.address, xsgdToken.address, parseUnits("500", await xsgdToken.decimals()));

        // check balance transferred from funder to noah payment manager on behalf of PBM
        let tokenBalance = await noahPaymentManager.getPBMCampaignTokenBalance(pbm.address, xsgdToken.address);
        expect(tokenBalance).to.equal(parseUnits("500", await xsgdToken.decimals()));
        console.log(await xsgdToken.balanceOf(funderSigner.address));
        expect(await xsgdToken.balanceOf(funderSigner.address)).to.equals(9500000000);

        // withdraw to funder signer account
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
        // deposit
        await noahPaymentManager
          .connect(funderSigner)
          .depositForPBMAddress(pbm.address, xsgdToken.address, parseUnits("500", await xsgdToken.decimals()));

        // check balance transferred from funder to noah payment manager on behalf of PBM
        let tokenBalance = await noahPaymentManager.getPBMCampaignTokenBalance(pbm.address, xsgdToken.address);
        expect(tokenBalance).to.equal(parseUnits("500", await xsgdToken.decimals()));
        console.log(await xsgdToken.balanceOf(funderSigner.address));
        expect(await xsgdToken.balanceOf(funderSigner.address)).to.equals(9500000000);

        // withdraw more than what has been deposited
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
