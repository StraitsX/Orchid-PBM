const { assert, expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}

describe('PBM', async () => {
  const accounts = [];

  before(async () => {
    (await ethers.getSigners()).forEach((signer, index) => {
      accounts[index] = signer;
    });
  });

  async function init() {
    let spot = await deploy('Spot');
    let pbm = await deploy('PBM');
    let addressList = await deploy('PBMAddressList');
    let merchantHelper = await deploy('MerchantHelper');
    await pbm.initialise(
      spot.address,
      Math.round(new Date().getTime() / 1000 + 86400 * 30), // set the expiry to 30 days later.
      addressList.address,
      merchantHelper.address,
    );
    return [spot, pbm, addressList, merchantHelper];
  }

  describe('PBM and Spot Set up test', async () => {
    let spot;
    let pbm;
    let addressList;

    before(async () => {
      let [_spot, _pbm, _addressList] = await init();
      spot = _spot;
      pbm = _pbm;
      addressList = _addressList;
    });

    it('Should deploy smart contract', async () => {
      assert(pbm.address !== '');
      assert(spot.address !== '');
      assert(addressList.address !== '');
    });

    it('PBM Should initialized with Spot token address', async () => {
      var pbm_spot = await pbm.spotToken();
      assert.equal(spot.address, pbm_spot);
    });
  });

  describe('PBM minting test', async () => {
    let spot = null;
    let pbm = null;

    before(async () => {
      let [_spot, _pbm] = await init();
      spot = _spot;
      pbm = _pbm;
    });

    it('Minting before non existing token type throws an error', async () => {
      await expect(pbm.mint(0, 1, accounts[0].address)).to.be.revertedWith(
        'PBM: Invalid Token Id(s)',
      );
    });

    it('Throws an error while creating token type with invalid discount type', async () => {
      let currentDate = new Date();
      let currentEpoch = Math.floor(currentDate / 1000);
      let targetEpoch = currentEpoch + 100000; // Expiry is set to 1 day 3.6 hours from current time
      const pbmTokenManagerAddress = await pbm.pbmTokenManager();
      const PBMTokenManagerContract = await ethers.getContractFactory(
        'PBMTokenManager',
      );
      const pbmTokenManager = await PBMTokenManagerContract.attach(
        pbmTokenManagerAddress,
      );
      await expect(
        pbm.createPBMTokenType(
          'STXDiscount5',
          'invalidDiscountType',
          5,
          20,
          10,
          targetEpoch,
          accounts[0].address,
          'beforeExpiryURI',
          'postExpiryURI',
        ),
      ).to.be.revertedWith('Invalid discount type');
    });

    it('Create token type successfully', async () => {
      let currentDate = new Date();
      let currentEpoch = Math.floor(currentDate / 1000);
      let targetEpoch = currentEpoch + 100000; // Expiry is set to 1 day 3.6 hours from current time
      const pbmTokenManagerAddress = await pbm.pbmTokenManager();
      const PBMTokenManagerContract = await ethers.getContractFactory(
        'PBMTokenManager',
      );
      const pbmTokenManager = await PBMTokenManagerContract.attach(
        pbmTokenManagerAddress,
      );

      // listen to pbmTokenManager contract for the NewPBMTypeCreated event
      let filter = pbmTokenManager.filters.NewPBMTypeCreated();
      await pbm.createPBMTokenType(
        'STXDiscount5',
        'fixed',
        5,
        20,
        5,
        targetEpoch,
        accounts[0].address,
        'beforeExpiryURI',
        'postExpiryURI',
      );
      let events = await pbmTokenManager.queryFilter(filter);
      expect(events.length).to.equal(1);

      let tokenDetails = await pbm.getTokenDetails(0);
      assert.equal(tokenDetails['0'], 'STXDiscount55');
      assert.equal(tokenDetails['1'].toString(), 'fixed');
      assert.equal(tokenDetails['2'].toString(), '5');
      assert.equal(tokenDetails['3'].toString(), '20');
      assert.equal(tokenDetails['4'].toString(), '5');
      assert.equal(tokenDetails['5'], targetEpoch);
      assert.equal(tokenDetails['6'], accounts[0].address);
    });

    it('Minting a PBM envelope token successfully', async () => {
      await pbm.mint(0, 1, accounts[0].address);
      let balance = await pbm.balanceOf(accounts[0].address, 0);
      assert.equal(balance.toString(), '1');
    });

    it('Create another 2 new token types and batch mint successfully', async () => {
      let currentDate = new Date();
      let currentEpoch = Math.floor(currentDate / 1000);
      let targetEpoch = currentEpoch + 100000;
      await pbm.createPBMTokenType(
        'STXDiscount5',
        'fixed',
        10,
        30,
        10,
        targetEpoch,
        accounts[0].address,
        'beforeExpiryURI',
        'postExpiryURI',
      );
      await pbm.createPBMTokenType(
        'STXDiscount5',
        'percent',
        5,
        30,
        10,
        targetEpoch,
        accounts[0].address,
        'beforeExpiryURI',
        'postExpiryURI',
      );
      await pbm.batchMint([1, 2], [2, 4], accounts[0].address);
      let balanceOfToken1 = await pbm.balanceOf(accounts[0].address, 1);
      let balanceOfToken2 = await pbm.balanceOf(accounts[0].address, 2);
      assert.equal(balanceOfToken1.toString(), '2');
      assert.equal(balanceOfToken2.toString(), '4');
    });
  });

  describe('PBM loadTo and transfer to non merchant test', async () => {
    let spot = null;
    let pbm = null;
    let addressList = null;
    let merchantHelper = null;

    beforeEach(async () => {
      let [_spot, _pbm, _addressList, _merchantHelper] = await init();
      spot = _spot;
      pbm = _pbm;
      addressList = _addressList;
      merchantHelper = _merchantHelper;

      // create PBM envelope token type
      let currentDate = new Date();
      let currentEpoch = Math.floor(currentDate / 1000);
      let targetEpoch = currentEpoch + 100000; // 100k seconds ~27hrs
      await pbm.createPBMTokenType(
        'STXDiscount5',
        'fixed',
        5,
        20,
        5,
        targetEpoch,
        accounts[0].address,
        'beforeExpiryURI',
        'postExpiryURI',
      );
    });

    it('Load ERC20 token without holding any envelope PBM throws an error', async () => {
      await expect(
        pbm.connect(accounts[1]).loadTo(accounts[1].address, 0, 100),
      ).to.be.revertedWith("PBM: Don't have enough PBM envelope to load spot");
    });

    it('Load ERC20 token to PBM envelope with insufficient balance throws an error', async () => {
      // mint the PBM envelope to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);

      // Non approval + Insufficient balance should fail
      await expect(
        pbm.connect(accounts[1]).loadTo(accounts[1].address, 0, 100),
      ).to.be.revertedWith('ERC20: Insufficent balance or approval');

      // Approval + Insufficient balance should fail
      await spot.connect(accounts[1]).approve(pbm.address, 100);
      await expect(
        pbm.connect(accounts[1]).loadTo(accounts[1].address, 0, 100),
      ).to.be.revertedWith('ERC20: Insufficent balance or approval');
    });

    it('Load to ERC20 token to PBM envelope with enough balance but without approval throws an error', async () => {
      // mint the PBM envelope to accounts[1]
      await pbm.mint(0, 1, accounts[2].address);
      await spot.mint(accounts[1].address, 100);
      await expect(
        pbm.connect(accounts[1]).loadTo(accounts[2].address, 0, 50),
      ).to.be.revertedWith('ERC20: Insufficent balance or approval');
    });

    it('Load to ERC20 token to PBM envelope successfully', async () => {
      // mint the PBM envelope to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      // mint and approve PBM to pull erc20 token from accounts[1]
      await spot.mint(accounts[1].address, 200);
      await spot.connect(accounts[1]).approve(pbm.address, 200);
      expect(await spot.balanceOf(accounts[1].address)).to.equal(200);
      expect(await spot.balanceOf(pbm.address)).to.equal(0);
      // load 100 ERC20 token to PBM envelope
      await pbm.connect(accounts[1]).loadTo(accounts[1].address, 0, 100);
      expect(await pbm.userWalletBalance(accounts[1].address)).to.equal(100);
      expect(await spot.balanceOf(accounts[1].address)).to.equal(100);
      expect(await spot.balanceOf(pbm.address)).to.equal(100);
    });

    it('Transfer PBM envelope token to a non merchant address successfully', async () => {
      // mint the PBM envelope to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);

      // transfer the PBM envelope to accounts[2]
      await pbm
        .connect(accounts[1])
        .safeTransferFrom(accounts[1].address, accounts[2].address, 0, 1, '0x');
      expect(await pbm.balanceOf(accounts[1].address, 0)).to.equal(0);
      expect(await pbm.balanceOf(accounts[2].address, 0)).to.equal(1);
    });
  });

  describe('PBM load and unload test', async () => {
    let spot = null;
    let pbm = null;
    let addressList = null;

    beforeEach(async () => {
      let [_spot, _pbm, _addressList] = await init();
      spot = _spot;
      pbm = _pbm;
      addressList = _addressList;

      // create PBM envelope token type
      let currentDate = new Date();
      let currentEpoch = Math.floor(currentDate / 1000);
      let targetEpoch = currentEpoch + 100000;
      await pbm.createPBMTokenType(
        'STXDiscount5',
        'fixed',
        5,
        20,
        5,
        targetEpoch,
        accounts[0].address,
        'beforeExpiryURI',
        'postExpiryURI',
      );
    });

    // Utility function for mint and spot allowances
    async function mintAndSetSpotApproval(userAccount, allowedAmount) {
      await spot.mint(userAccount.address, allowedAmount);
      await spot.connect(userAccount).approve(pbm.address, allowedAmount);

      expect(await spot.balanceOf(userAccount.address)).to.equal(allowedAmount);
      expect(await spot.balanceOf(pbm.address)).to.equal(0);
    }

    // Utility function to load erc20 token to pbm
    async function loadSpotToPBM(userAccount, amount) {
      await pbm.connect(userAccount).load(0, amount);
      expect(await pbm.userWalletBalance(userAccount.address)).to.equal(amount);
      expect(await spot.balanceOf(userAccount.address)).to.equal(amount);
      expect(await spot.balanceOf(pbm.address)).to.equal(amount);
    }

    it('Load ERC20 token without holding any envelope PBM throws an error', async () => {
      await expect(
        pbm.connect(accounts[1]).load(0, 100000000),
      ).to.be.revertedWith("PBM: Don't have enough PBM envelope to load spot");
    });

    it('Load ERC20 token to PBM envelope with insufficient balance throws an error', async () => {
      // mint the PBM envelope to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      await expect(
        pbm.connect(accounts[1]).load(0, 100000000),
      ).to.be.revertedWith('ERC20: Insufficent balance or approval');
    });

    it('Load ERC20 token to PBM envelope with enough balance but without approval throws an error', async () => {
      // mint the PBM envelope to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      await spot.mint(accounts[1].address, 100000000);
      await expect(
        pbm.connect(accounts[1]).load(0, 50000000),
      ).to.be.revertedWith('ERC20: Insufficent balance or approval');
    });

    it('Load ERC20 token to PBM envelope successfully', async () => {
      // mint the PBM envelope to accounts[1]
      await mintAndSetSpotApproval(accounts[1], 200000000);

      // mint and approve PBM to pull erc20 token from accounts[1]
      await pbm.mint(0, 1, accounts[1].address);

      // load 100000000 ERC20 token to PBM envelope
      await loadSpotToPBM(accounts[1], 100000000);
    });

    it('Unload without load first revert with error', async () => {
      await expect(
        pbm.connect(accounts[1]).unLoad(150000000),
      ).to.be.revertedWith(
        "PBM: User don't have enough spot erc-20 token to unload",
      );
    });

    it('Unload more than user loaded ERC20 token from PBM envelope revert with error', async () => {
      // mint the PBM envelope to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      // mint and approve PBM to pull erc20 token from accounts[1]
      await mintAndSetSpotApproval(accounts[1], 200000000);

      // load 100000000 ERC20 token to PBM envelope
      await loadSpotToPBM(accounts[1], 100000000);

      // unload ERC20 token from PBM envelope
      await expect(
        pbm.connect(accounts[1]).unLoad(150000000),
      ).to.be.revertedWith(
        "PBM: User don't have enough spot erc-20 token to unload",
      );
    });

    it('Unload ERC20 token from PBM envelope successfully', async () => {
      // mint the PBM envelope to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      // mint and approve PBM to pull erc20 token from accounts[1]
      await mintAndSetSpotApproval(accounts[1], 200000000);

      // load 100000000 ERC20 token to PBM envelope
      await loadSpotToPBM(accounts[1], 100000000);

      // unload ERC20 token from PBM envelope
      await pbm.connect(accounts[1]).unLoad(100000000);
      expect(await pbm.userWalletBalance(accounts[1].address)).to.equal(0);
      expect(await spot.balanceOf(accounts[1].address)).to.equal(200000000);
      expect(await spot.balanceOf(pbm.address)).to.equal(0);
    });

    it("Unload other's ERC20 token without approval and owner loading before revert with error", async () => {
      await expect(
        pbm.connect(accounts[2]).unLoadFrom(accounts[1].address, 100000000),
      ).to.be.revertedWith(
        "PBM: User don't have enough spot erc-20 token to unload",
      );
    });

    it("Unload other's ERC20 token without approval revert with error", async () => {
      // mint the PBM envelope to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      // mint and approve PBM to pull erc20 token from accounts[1]
      await mintAndSetSpotApproval(accounts[1], 200000000);

      // load 100000000 ERC20 token to PBM envelope
      await loadSpotToPBM(accounts[1], 100000000);

      // unload ERC20 token from PBM envelope
      await expect(
        pbm.connect(accounts[2]).unLoadFrom(accounts[1].address, 100000000),
      ).to.be.revertedWith('ERC20: insufficient allowance');
    });

    it('Unload user ERC20 token from PBM envelope with exceeded approval amount revert with error', async () => {
      // mint the PBM envelope to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      // mint and approve PBM to pull erc20 token from accounts[1]
      await mintAndSetSpotApproval(accounts[1], 200000000);

      // load 100000000 ERC20 token to PBM envelope for accounts[1
      await loadSpotToPBM(accounts[1], 100000000);

      // accounts[1] set approval for accounts[2] to unload ERC20 token from PBM envelope
      await pbm
        .connect(accounts[1])
        .setApproval(accounts[2].address, 100000000);

      // unload ERC20 token from PBM envelope
      await pbm.connect(accounts[2]).unLoadFrom(accounts[1].address, 100000000);
      expect(await pbm.userWalletBalance(accounts[1].address)).to.equal(0);
      // user have 100000000 spot token after unload
      expect(await spot.balanceOf(accounts[1].address)).to.equal(100000000);
      // spender have 100000000 spot token after unload
      expect(await spot.balanceOf(accounts[2].address)).to.equal(100000000);
      expect(await spot.balanceOf(pbm.address)).to.equal(0);

      // unload another 100000000 should fail
      await expect(
        pbm.connect(accounts[2]).unLoadFrom(accounts[1].address, 100000000),
      ).to.be.revertedWith(
        "PBM: User don't have enough spot erc-20 token to unload",
      );
    });

    it('Unload user ERC20 token from PBM envelope successfully', async () => {
      // mint the PBM envelope to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      // mint and approve PBM to pull erc20 token from accounts[1]
      await mintAndSetSpotApproval(accounts[1], 200000000);

      // load ERC20 token to PBM envelope
      await loadSpotToPBM(accounts[1], 100000000);

      // accounts[1] set approval for accounts[2] to unload ERC20 token from PBM envelope
      await pbm
        .connect(accounts[1])
        .setApproval(accounts[2].address, 100000000);

      // unload ERC20 token from PBM envelope
      await pbm.connect(accounts[2]).unLoadFrom(accounts[1].address, 100000000);
      expect(await pbm.userWalletBalance(accounts[1].address)).to.equal(0);
      // user have 100000000 spot token after unload
      expect(await spot.balanceOf(accounts[1].address)).to.equal(100000000);
      // spender have 100000000 spot token after unload
      expect(await spot.balanceOf(accounts[2].address)).to.equal(100000000);
      expect(await spot.balanceOf(pbm.address)).to.equal(0);
    });
  });

  describe('PBM transfer to merchant and cashback test', () => {
    let spot = null;
    let pbm = null;
    let addressList = null;
    let merchantHelper = null;
    let dataBytes = null;
    let currentDate = null;
    let currentEpoch = null;
    let targetEpoch = null;

    beforeEach(async () => {
      let [_spot, _pbm, _addressList, _merchantHelper] = await init();
      spot = _spot;
      pbm = _pbm;
      addressList = _addressList;
      merchantHelper = _merchantHelper;

      // create PBM envelope token type
      currentDate = new Date();
      currentEpoch = Math.floor(currentDate / 1000);
      targetEpoch = currentEpoch + 100000;
      await pbm.createPBMTokenType(
        'STXDiscount5',
        'fixed',
        5,
        20,
        5,
        targetEpoch,
        accounts[0].address,
        'beforeExpiryURI',
        'postExpiryURI',
      );

      // whitelist accounts[2] as a merchant
      await addressList.addMerchantAddresses(
        [accounts[2].address],
        'testMerchant',
      );

      let spotAmount = 100000000; // with same 6 decimals as spot
      let data = ethers.utils.defaultAbiCoder.encode(['uint256'], [spotAmount]);
      dataBytes = ethers.utils.arrayify(data);
    });

    // Utility function for creating and minting PBM tokens
    async function createAndMintPBM(
      type,
      discount,
      minSpend,
      discountCap,
      epoch,
      creatorAddress,
      mintAddress,
      mintAmount,
    ) {
      await pbm.createPBMTokenType(
        'STXDiscount' + discount + type,
        type,
        discount,
        minSpend,
        discountCap,
        epoch,
        creatorAddress,
        'beforeExpiryURI',
        'postExpiryURI',
      );
      await pbm.mint(1, mintAmount, mintAddress);
    }

    // Utility function for setting up permissions and allowances
    async function setupPermissions(merchantAccount, allowedAmount) {
      await spot
        .connect(merchantAccount)
        .approve(merchantHelper.address, allowedAmount);

      await merchantHelper.addAllowedPBM(pbm.address);
      await merchantHelper.addWhitelistedMerchant(merchantAccount.address);
    }

    // Utility function for approving and loading PBM
    async function approveAndLoadPBM(userAccount, tokenId, loadAmount) {
      await spot.connect(userAccount).approve(pbm.address, loadAmount);
      await pbm
        .connect(userAccount)
        .loadTo(userAccount.address, tokenId, loadAmount);
      expect(await pbm.userWalletBalance(userAccount.address)).to.equal(
        loadAmount,
      );
    }

    it('Transfer PBM envelope token to a merchant address without loading ERC20 tokens', async () => {
      // mint the PBM envelope to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);

      // transfer the PBM envelope to merchant accounts[2]
      await expect(
        pbm
          .connect(accounts[1])
          .safeTransferFrom(
            accounts[1].address,
            accounts[2].address,
            0,
            1,
            dataBytes,
          ),
      ).to.be.revertedWith("PBM: Don't have enough spot to pay");
    });

    it('Transfer PBM envelope token to a merchant address without whitelisting PBM on merchant helper revert with error', async () => {
      // mint the PBM envelope and spot to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      await spot.mint(accounts[1].address, 200000000);

      // accounts[1] grant approval to pbm to spend its spot token and load the payment spot to PBM envelope
      await approveAndLoadPBM(accounts[1], 0, 100000000);
      // transfer the PBM envelope to merchant accounts[2]
      await expect(
        pbm
          .connect(accounts[1])
          .safeTransferFrom(
            accounts[1].address,
            accounts[2].address,
            0,
            1,
            dataBytes,
          ),
      ).to.be.revertedWith('Caller is not an whitelisted PBM');
    });

    it('Transfer PBM envelope token to a merchant address and without whitelisting Merchant on merchant helper revert with error', async () => {
      // mint the PBM envelope and spot to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      await spot.mint(accounts[1].address, 200000000);

      // whitelist PBM on merchant helper
      await merchantHelper.addAllowedPBM(pbm.address);

      // accounts[1] grant approval to pbm to spend its spot token and load the payment spot to PBM envelope
      await approveAndLoadPBM(accounts[1], 0, 100000000);

      // transfer the PBM envelope to merchant accounts[2]
      await expect(
        pbm
          .connect(accounts[1])
          .safeTransferFrom(
            accounts[1].address,
            accounts[2].address,
            0,
            1,
            dataBytes,
          ),
      ).to.be.revertedWith('Merchant not whitelisted.');
    });

    it('Transfer PBM envelope token to a merchant address and without merchant approve merchant helper revert with error', async () => {
      // mint the PBM envelope and spot to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      await spot.mint(accounts[1].address, 200000000);

      // whitelist PBM on merchant helper
      await merchantHelper.addAllowedPBM(pbm.address);

      // whitelist accounts[2] as a merchant on merhcant helper
      await merchantHelper.addWhitelistedMerchant(accounts[2].address);

      // accounts[1] grant approval to pbm to spend its spot token and load the payment spot to PBM envelope
      await approveAndLoadPBM(accounts[1], 0, 100000000);

      // transfer the PBM envelope to merchant accounts[2]
      await expect(
        pbm
          .connect(accounts[1])
          .safeTransferFrom(
            accounts[1].address,
            accounts[2].address,
            0,
            1,
            dataBytes,
          ),
      ).to.be.revertedWith('ERC20: insufficient allowance');
    });

    it('Transfer PBM envelope token to a merchant address and tried to pay more than user loaded revert with error ', async () => {
      // mint the PBM envelope and spot to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      await spot.mint(accounts[1].address, 200000000);

      // approve merchant helper to spend spot token on behalf of Merchant accounts[2]
      // whitelist PBM on merchant helper
      // whitelist accounts[2] as a merchant on merhcant helper
      await setupPermissions(accounts[2], 200000000);

      // accounts[1] grant approval to pbm to spend its spot token and load the payment spot to PBM envelope
      await approveAndLoadPBM(accounts[1], 0, 100000000);

      let exceedAmount = 200000000; // with same 6 decimals as spot
      let data = ethers.utils.defaultAbiCoder.encode(
        ['uint256'],
        [exceedAmount],
      );
      let exceedAmountBytes = ethers.utils.arrayify(data);

      // transfer the PBM envelope to merchant accounts[2]
      await expect(
        pbm
          .connect(accounts[1])
          .safeTransferFrom(
            accounts[1].address,
            accounts[2].address,
            0,
            1,
            exceedAmountBytes,
          ),
      ).to.be.revertedWith("PBM: Don't have enough spot to pay");
    });

    it('Transfer fixed amount discount PBM token to a merchant address and cashback successfully', async () => {
      // mint the PBM envelope and spot to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      await spot.mint(accounts[1].address, 200000000);

      // approve merchant helper to spend spot token on behalf of Merchant accounts[2]
      // whitelist PBM on merchant helper
      // whitelist accounts[2] as a merchant on merhcant helper
      await setupPermissions(accounts[2], 100000000);

      // accounts[1] grant approval to pbm to spend its spot token and load the payment spot to PBM envelope
      await approveAndLoadPBM(accounts[1], 0, 100000000);

      // set filters for MerchantPayment and MerchantCashback events
      let paymentFilter = pbm.filters.MerchantPayment();
      let cashbackFilter = pbm.filters.MerchantCashback();

      // transfer the PBM envelope to merchant accounts[2]
      await pbm
        .connect(accounts[1])
        .safeTransferFrom(
          accounts[1].address,
          accounts[2].address,
          0,
          1,
          dataBytes,
        );

      let paymentEvents = await pbm.queryFilter(paymentFilter);
      expect(paymentEvents.length).to.equal(1);
      let cashbackEvents = await pbm.queryFilter(cashbackFilter);
      expect(cashbackEvents.length).to.equal(1);
      expect(cashbackEvents[0].args[3].toString()).to.equal('5000000');

      expect(await pbm.balanceOf(accounts[1].address, 0)).to.equal(0);
      // check merchant spot balance after cashback
      expect(await spot.balanceOf(accounts[2].address)).to.equal(95000000);
      // check user spot balance after cashback
      // start with 200000000 transfer out 100000000 got 5000000 cashback = 105000000
      expect(await spot.balanceOf(accounts[1].address)).to.equal(105000000);
    });

    it('Transfer percent discount PBM token to a merchant address to pay less than min spend revert with error', async () => {
      // create a percent discount PBM token type: with 5% discount 20 spot token min spend 10 spot token max discount cap
      // mint the percent discount PBM and spot to accounts[1]
      await createAndMintPBM(
        'percent',
        5,
        20,
        10,
        targetEpoch,
        accounts[0].address,
        accounts[1].address,
        1,
      );

      await spot.mint(accounts[1].address, 200000000);
      // approve merchant helper to spend spot token on behalf of Merchant accounts[2]
      // whitelist PBM on merchant helper
      // whitelist accounts[2] as a merchant on merhcant helper
      await setupPermissions(accounts[2], 100000000);

      await approveAndLoadPBM(accounts[1], 1, 100000000);

      let lessThanMinAmount = 10000000; // with same 6 decimals as spot
      let data = ethers.utils.defaultAbiCoder.encode(
        ['uint256'],
        [lessThanMinAmount],
      );
      let lessThanMinAmountBytes = ethers.utils.arrayify(data);

      // transfer the PBM envelope to merchant accounts[2]
      await expect(
        pbm
          .connect(accounts[1])
          .safeTransferFrom(
            accounts[1].address,
            accounts[2].address,
            1,
            1,
            lessThanMinAmountBytes,
          ),
      ).to.be.revertedWith(
        'DiscountCalculator: amount cannot be less than minAmount',
      );
    });

    it('Transfer percent discount PBM token to a merchant address and try to get discount over cap revert with error', async () => {
      // create a percent discount PBM token type: with 5% discount 20 spot token min spend 10 spot token max discount cap
      // mint the percent discount PBM and spot to accounts[1]
      await createAndMintPBM(
        'percent',
        5,
        20,
        10,
        targetEpoch,
        accounts[0].address,
        accounts[1].address,
        1,
      );

      await spot.mint(accounts[1].address, 300000000);

      // approve merchant helper to spend spot token on behalf of Merchant accounts[2]
      await setupPermissions(accounts[2], 300000000);

      // accounts[1] grant approval to pbm to spend its spot token and load the payment spot to PBM envelope
      await approveAndLoadPBM(accounts[1], 1, 300000000);

      let overCapAmount = 300000000; // with same 6 decimals as spot
      let data = ethers.utils.defaultAbiCoder.encode(
        ['uint256'],
        [overCapAmount],
      );
      let overCapAmountBytes = ethers.utils.arrayify(data);

      // transfer the PBM envelope to merchant accounts[2]
      await expect(
        pbm
          .connect(accounts[1])
          .safeTransferFrom(
            accounts[1].address,
            accounts[2].address,
            1,
            1,
            overCapAmountBytes,
          ),
      ).to.be.revertedWith(
        'DiscountCalculator: discount cannot be more than discountCap',
      );
    });

    it('Transfer percent discount PBM token to a merchant address and cashback successfully', async () => {
      // create a percent discount PBM token type: with 5% discount 20 spot token min spend 10 spot token max discount cap
      // mint the percent discount PBM and spot to accounts[1]
      await createAndMintPBM(
        'percent',
        5,
        20,
        10,
        targetEpoch,
        accounts[0].address,
        accounts[1].address,
        1,
      );

      await spot.mint(accounts[1].address, 200000000);

      // approve merchant helper to spend spot token on behalf of Merchant accounts[2]
      // whitelist PBM on merchant helper
      // whitelist accounts[2] as a merchant on merhcant helper
      await setupPermissions(accounts[2], 100000000);

      // accounts[1] grant approval to pbm to spend its spot token and load the payment spot to PBM envelope
      await approveAndLoadPBM(accounts[1], 1, 100000000);

      // set filters for MerchantPayment and MerchantCashback events
      let paymentFilter = pbm.filters.MerchantPayment();
      let cashbackFilter = pbm.filters.MerchantCashback();

      // transfer the PBM envelope to merchant accounts[2]
      await pbm
        .connect(accounts[1])
        .safeTransferFrom(
          accounts[1].address,
          accounts[2].address,
          1,
          1,
          dataBytes,
        );

      let paymentEvents = await pbm.queryFilter(paymentFilter);
      expect(paymentEvents.length).to.equal(1);
      let cashbackEvents = await pbm.queryFilter(cashbackFilter);
      expect(cashbackEvents.length).to.equal(1);
      expect(cashbackEvents[0].args[3].toString()).to.equal('5000000');

      expect(await pbm.balanceOf(accounts[1].address, 0)).to.equal(0);
      // check merchant spot balance after cashback
      expect(await spot.balanceOf(accounts[2].address)).to.equal(95000000);
      // check user spot balance after cashback
      // start with 200000000 transfer out 100000000 got 5000000 cashback = 105000000
      expect(await spot.balanceOf(accounts[1].address)).to.equal(105000000);
    });
  });

  describe('PBM revoke and burnFrom tests', () => {
    let spot = null;
    let pbm = null;
    let addressList = null;
    let currentDate = null;
    let currentEpoch = null;
    let targetEpoch = null;

    beforeEach(async () => {
      let [_spot, _pbm, _addressList] = await init();
      spot = _spot;
      pbm = _pbm;
      addressList = _addressList;

      // create PBM envelope token type
      currentDate = new Date();
      currentEpoch = Math.floor(currentDate / 1000);
      targetEpoch = currentEpoch + 100000;
    });

    // Utility function for creating and minting PBM tokens
    async function createAndMintPBM(
      epoch,
      creatorAddress,
      mintAddress,
      mintAmount,
      tokenId,
    ) {
      await pbm.createPBMTokenType(
        'STXDiscount5',
        'fixed',
        5,
        20,
        5,
        epoch,
        creatorAddress,
        'beforeExpiryURI',
        'postExpiryURI',
      );
      await pbm.mint(tokenId, mintAmount, mintAddress);
    }

    it('Revoke PBM token with non creator revert with error', async () => {
      // create mint PBM token id 0 to accounts[1]
      await createAndMintPBM(
        targetEpoch,
        accounts[0].address,
        accounts[1].address,
        1,
        0,
      );
      // revoke PBM token from accounts[1]
      await expect(pbm.connect(accounts[1]).revokePBM(1)).to.be.revertedWith(
        'PBM not revokable',
      );
    });

    it('Revoke valid PBM token revert with error', async () => {
      // create mint PBM token id 0 to accounts[1]
      await createAndMintPBM(
        targetEpoch,
        accounts[0].address,
        accounts[1].address,
        1,
        0,
      );
      // revoke PBM token from accounts[1]
      await expect(pbm.connect(accounts[0]).revokePBM(1)).to.be.revertedWith(
        'PBM not revokable',
      );
    });

    it('Revoke expired PBM token by a non creator revert with error', async () => {
      // create mint PBM token id 0 to accounts[1]
      await createAndMintPBM(
        targetEpoch,
        accounts[0].address,
        accounts[1].address,
        1,
        0,
      );
      // revoke PBM token from accounts[1]
      await time.increaseTo(targetEpoch + 1);
      // try to revoke PBM token from accounts[1] (not the creator)
      await expect(pbm.connect(accounts[1]).revokePBM(0)).to.be.revertedWith(
        'PBM not revokable',
      );
    });

    it('Revoke expired PBM token successfully', async () => {
      let pbmTokenManagerAddress = await pbm.pbmTokenManager();
      let PBMTokenManagerContract = await ethers.getContractFactory(
        'PBMTokenManager',
      );
      let pbmTokenManager = await PBMTokenManagerContract.attach(
        pbmTokenManagerAddress,
      );
      // create mint PBM token id 0 to accounts[1] with expiry 100000 seconds from now (token id would be 1)
      let currentTime = await time.latest();
      let expiry = currentTime + 100000;
      await createAndMintPBM(
        expiry,
        accounts[0].address,
        accounts[1].address,
        1,
        0,
      );

      // revoke PBM token from accounts[1]
      await time.increaseTo(expiry + 1);
      await pbm.connect(accounts[0]).revokePBM(0);
      expect(await pbmTokenManager.isTokenRevoked(0)).to.be.true;
    });

    it('Burn non revoked PBM token from user account revert with error', async () => {
      let currentTime = await time.latest();
      let expiry = currentTime + 100000;
      // create and mint pbm token id 0 to accounts[1]
      await createAndMintPBM(
        expiry,
        accounts[0].address,
        accounts[1].address,
        1,
        0,
      );
      expect(await pbm.balanceOf(accounts[1].address, 0)).to.equal(1);
      // accounts[1] try to call burnFrom to burn token id 0
      await expect(
        pbm.connect(accounts[0]).burnFrom(accounts[1].address, 0),
      ).to.be.revertedWith('PBM: Token is not revoked');
    });

    it('Non owner burn PBM token from user account revert with error', async () => {
      let currentTime = await time.latest();
      let expiry = currentTime + 100000;
      // create and mint pbm token id 0 to accounts[1]
      await createAndMintPBM(
        expiry,
        accounts[0].address,
        accounts[1].address,
        1,
        0,
      );
      expect(await pbm.balanceOf(accounts[1].address, 0)).to.equal(1);
      await time.increaseTo(expiry + 1);
      // revoke token id 0
      await pbm.connect(accounts[0]).revokePBM(0);
      // accounts[1] try to call burnFrom to burn token id 0
      await expect(
        pbm.connect(accounts[1]).burnFrom(accounts[1].address, 0),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Burn PBM token from user account successfully', async () => {
      let currentTime = await time.latest();
      let expiry = currentTime + 100000;
      // create and mint pbm token id 0 to accounts[1]
      await createAndMintPBM(
        expiry,
        accounts[0].address,
        accounts[1].address,
        1,
        0,
      );
      expect(await pbm.balanceOf(accounts[1].address, 0)).to.equal(1);
      await time.increaseTo(expiry + 1);
      // revoke token id 0
      await pbm.connect(accounts[0]).revokePBM(0);
      // owner burn token id 0 from accounts[1]
      await pbm.connect(accounts[0]).burnFrom(accounts[1].address, 0);
      expect(await pbm.balanceOf(accounts[1].address, 0)).to.equal(0);
    });
  });
});
