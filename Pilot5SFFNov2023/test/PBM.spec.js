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
    await pbm.initialise(
      spot.address,
      Math.round(new Date().getTime() / 1000 + 86400 * 30),
      addressList.address,
    );
    return [spot, pbm, addressList];
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
      assert.equal(tokenDetails['1'].toString(), '5');
      assert.equal(tokenDetails['2'], targetEpoch);
      assert.equal(tokenDetails['3'], accounts[0].address.toString());
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
        'STX10Discount',
        10,
        targetEpoch,
        accounts[0].address,
        'beforeExpiryURI',
        'postExpiryURI',
      );
      await pbm.createPBMTokenType(
        'STX15Discount',
        15,
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

  describe('PBM load transfer test', async () => {
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
        'STX10Discount',
        10,
        targetEpoch,
        accounts[0].address,
        'beforeExpiryURI',
        'postExpiryURI',
      );
    });

    it('Load ERC20 token without holding any envelope PBM throws an error', async () => {
      await expect(
        pbm.connect(accounts[1]).load(accounts[1].address, 0, 100),
      ).to.be.revertedWith("PBM: Don't have enough PBM envelope to load spot");
    });

    it('Load ERC20 token to PBM envelope with insufficient balance throws an error', async () => {
      // mint the PBM envelope to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      await expect(
        pbm.connect(accounts[1]).load(accounts[1].address, 0, 100),
      ).to.be.revertedWith('ERC20: Insufficent balance or approval');
    });

    it('Load ERC20 token to PBM envelope with enough balance but without approval throws an error', async () => {
      // mint the PBM envelope to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      await spot.mint(accounts[1].address, 100);
      await expect(
        pbm.connect(accounts[1]).load(accounts[1].address, 0, 50),
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
      await pbm.connect(accounts[1]).load(accounts[1].address, 0, 100);
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

    it('Transfer PBM envelope token to a merchant address without loading ERC20 tokens', async () => {
      // mint the PBM envelope to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      // whitelist accounts[2] as a merchant
      await addressList.addMerchantAddresses(
        [accounts[2].address],
        'testMerchant',
      );
      let spotAmount = 100;
      let data = ethers.utils.defaultAbiCoder.encode(['uint256'], [spotAmount]);
      let dataBytes = ethers.utils.arrayify(data);

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

    it('Transfer PBM envelope token to a merchant address successfully', async () => {
      // mint the PBM envelope and spot to accounts[1]
      await pbm.mint(0, 1, accounts[1].address);
      await spot.mint(accounts[1].address, 100);

      // whitelist accounts[2] as a merchant
      await addressList.addMerchantAddresses(
        [accounts[2].address],
        'testMerchant',
      );
      let spotAmount = 100;
      // load the payment spot to PBM envelope
      await spot.connect(accounts[1]).approve(pbm.address, 100);
      await pbm.connect(accounts[1]).load(accounts[1].address, 0, 100);
      expect(await pbm.userWalletBalance(accounts[1].address)).to.equal(100);
      let data = ethers.utils.defaultAbiCoder.encode(['uint256'], [spotAmount]);
      let dataBytes = ethers.utils.arrayify(data);

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
      expect(await pbm.balanceOf(accounts[1].address, 0)).to.equal(0);
      expect(await pbm.balanceOf(accounts[2].address, 0)).to.equal(1);
    });
  });
});
