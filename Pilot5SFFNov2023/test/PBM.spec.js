const { assert, expect } = require('chai');
const { ethers } = require('hardhat');
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
      Math.round(new Date().getTime() / 1000 + 86400 * 30),
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

    it('Creat token type with invalid discount type throws an error', async () => {
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

  describe('PBM load and transfer to non merchant test', async () => {
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

    it('Load ERC20 token without holding any envelope PBM throws an error', async () => {
      await expect(
        pbm.connect(accounts[1]).loadTo(accounts[1].address, 0, 100),
      ).to.be.revertedWith("PBM: Don't have enough PBM envelope to load spot");
    });

    it('Load ERC20 token to PBM envelope with insufficient balance throws an error', async () => {
      // mint the PBM envelope to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      await expect(
        pbm.connect(accounts[1]).loadTo(accounts[1].address, 0, 100),
      ).to.be.revertedWith('ERC20: Insufficent balance or approval');
    });

    it('Load ERC20 token to PBM envelope with enough balance but without approval throws an error', async () => {
      // mint the PBM envelope to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      await spot.mint(accounts[1].address, 100);
      await expect(
        pbm.connect(accounts[1]).loadTo(accounts[1].address, 0, 50),
      ).to.be.revertedWith('ERC20: Insufficent balance or approval');
    });

    it('Load ERC20 token to PBM envelope successfully', async () => {
      // mint the PBM envelope to accounts[2]
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
      await spot.connect(accounts[1]).approve(pbm.address, 100000000);
      await pbm.connect(accounts[1]).loadTo(accounts[1].address, 0, 100000000);
      expect(await pbm.userWalletBalance(accounts[1].address)).to.equal(
        100000000,
      );

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
      await spot.connect(accounts[1]).approve(pbm.address, 100000000);
      await pbm.connect(accounts[1]).loadTo(accounts[1].address, 0, 100000000);
      expect(await pbm.userWalletBalance(accounts[1].address)).to.equal(
        100000000,
      );

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
      // expect(await pbm.balanceOf(accounts[1].address, 0)).to.equal(0);
      // expect(await pbm.balanceOf(accounts[2].address, 0)).to.equal(1);
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
      await spot.connect(accounts[1]).approve(pbm.address, 100000000);
      await pbm.connect(accounts[1]).loadTo(accounts[1].address, 0, 100000000);
      expect(await pbm.userWalletBalance(accounts[1].address)).to.equal(
        100000000,
      );

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
      await spot
        .connect(accounts[2])
        .approve(merchantHelper.address, 200000000);

      // whitelist PBM on merchant helper
      await merchantHelper.addAllowedPBM(pbm.address);

      // whitelist accounts[2] as a merchant on merhcant helper
      await merchantHelper.addWhitelistedMerchant(accounts[2].address);

      // accounts[1] grant approval to pbm to spend its spot token and load the payment spot to PBM envelope
      await spot.connect(accounts[1]).approve(pbm.address, 100000000);
      await pbm.connect(accounts[1]).loadTo(accounts[1].address, 0, 100000000);
      expect(await pbm.userWalletBalance(accounts[1].address)).to.equal(
        100000000,
      );

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
      await spot
        .connect(accounts[2])
        .approve(merchantHelper.address, 100000000);

      // whitelist PBM on merchant helper
      await merchantHelper.addAllowedPBM(pbm.address);

      // whitelist accounts[2] as a merchant on merhcant helper
      await merchantHelper.addWhitelistedMerchant(accounts[2].address);

      // accounts[1] grant approval to pbm to spend its spot token and load the payment spot to PBM envelope
      await spot.connect(accounts[1]).approve(pbm.address, 100000000);
      await pbm.connect(accounts[1]).loadTo(accounts[1].address, 0, 100000000);
      expect(await pbm.userWalletBalance(accounts[1].address)).to.equal(
        100000000,
      );

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
      await pbm.createPBMTokenType(
        'STXDiscount5percent',
        'percent',
        5,
        20,
        10,
        targetEpoch,
        accounts[0].address,
        'beforeExpiryURI',
        'postExpiryURI',
      );

      // mint the percent discount PBM and spot to accounts[1]
      await pbm.mint(1, 1, accounts[1].address);
      await spot.mint(accounts[1].address, 200000000);

      // approve merchant helper to spend spot token on behalf of Merchant accounts[2]
      await spot
        .connect(accounts[2])
        .approve(merchantHelper.address, 100000000);

      // whitelist PBM on merchant helper
      await merchantHelper.addAllowedPBM(pbm.address);

      // whitelist accounts[2] as a merchant on merhcant helper
      await merchantHelper.addWhitelistedMerchant(accounts[2].address);

      // accounts[1] grant approval to pbm to spend its spot token and load the payment spot to PBM envelope
      await spot.connect(accounts[1]).approve(pbm.address, 100000000);
      await pbm.connect(accounts[1]).loadTo(accounts[1].address, 1, 10000000);
      expect(await pbm.userWalletBalance(accounts[1].address)).to.equal(
        10000000,
      );

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
      await pbm.createPBMTokenType(
        'STXDiscount5percent',
        'percent',
        5,
        20,
        10,
        targetEpoch,
        accounts[0].address,
        'beforeExpiryURI',
        'postExpiryURI',
      );

      // mint the percent discount PBM and spot to accounts[1]
      await pbm.mint(1, 1, accounts[1].address);
      await spot.mint(accounts[1].address, 300000000);

      // approve merchant helper to spend spot token on behalf of Merchant accounts[2]
      await spot
        .connect(accounts[2])
        .approve(merchantHelper.address, 300000000);

      // whitelist PBM on merchant helper
      await merchantHelper.addAllowedPBM(pbm.address);

      // whitelist accounts[2] as a merchant on merhcant helper
      await merchantHelper.addWhitelistedMerchant(accounts[2].address);

      // accounts[1] grant approval to pbm to spend its spot token and load the payment spot to PBM envelope
      await spot.connect(accounts[1]).approve(pbm.address, 300000000);
      await pbm.connect(accounts[1]).loadTo(accounts[1].address, 1, 300000000);
      expect(await pbm.userWalletBalance(accounts[1].address)).to.equal(
        300000000,
      );

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
      await pbm.createPBMTokenType(
        'STXDiscount5percent',
        'percent',
        5,
        20,
        10,
        targetEpoch,
        accounts[0].address,
        'beforeExpiryURI',
        'postExpiryURI',
      );

      // mint the percent discount PBM and spot to accounts[1]
      await pbm.mint(1, 1, accounts[1].address);
      await spot.mint(accounts[1].address, 200000000);

      // approve merchant helper to spend spot token on behalf of Merchant accounts[2]
      await spot
        .connect(accounts[2])
        .approve(merchantHelper.address, 100000000);

      // whitelist PBM on merchant helper
      await merchantHelper.addAllowedPBM(pbm.address);

      // whitelist accounts[2] as a merchant on merhcant helper
      await merchantHelper.addWhitelistedMerchant(accounts[2].address);

      // accounts[1] grant approval to pbm to spend its spot token and load the payment spot to PBM envelope
      await spot.connect(accounts[1]).approve(pbm.address, 100000000);
      await pbm.connect(accounts[1]).loadTo(accounts[1].address, 1, 100000000);
      expect(await pbm.userWalletBalance(accounts[1].address)).to.equal(
        100000000,
      );

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
});
