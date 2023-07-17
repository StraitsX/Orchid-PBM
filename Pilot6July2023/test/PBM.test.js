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
    let heroNFT = await deploy('HeroNFT');
    await pbm.initialise(
      spot.address,
      Math.round(new Date().getTime() / 1000 + 86400 * 30),
      addressList.address,
      heroNFT.address,
    );
    return [spot, pbm, addressList, heroNFT];
  }

  describe('PBM and Spot Set up test', async () => {
    let spot;
    let pbm;
    let addressList;
    let heroNFT;

    before(async () => {
      let [_spot, _pbm, _addressList, _heroNFT] = await init();
      spot = _spot;
      pbm = _pbm;
      addressList = _addressList;
      heroNFT = _heroNFT;
    });

    it('Should deploy smart contract', async () => {
      assert(pbm.address !== '');
      assert(spot.address !== '');
      assert(addressList.address !== '');
      assert(heroNFT.address !== '');
    });

    it('PBM Should initialized with Spot token address', async () => {
      var pbm_spot = await pbm.spotToken();
      assert.equal(spot.address, pbm_spot);
    });

    it('PBM Should initialized with PBMAddressList address', async () => {
      var pbm_address_list = await pbm.pbmAddressList();
      assert.equal(addressList.address, pbm_address_list);
    });

    it('PBM Should initialized with HeroNFT address', async () => {
      var pbm_hero_nft = await pbm.heroNFT();
      assert.equal(heroNFT.address, pbm_hero_nft);
    });
  });

  describe('PBM minting test', async () => {
    let spot = null;
    let pbm = null;
    let addressList = null;
    let heroNFT = null;

    before(async () => {
      let [_spot, _pbm, _addressList, _heroNFT] = await init();
      spot = _spot;
      pbm = _pbm;
      addressList = _addressList;
      heroNFT = _heroNFT;
      await spot.mint(accounts[0].address, ethers.utils.parseUnits('10000', 6));
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
        'Test-1XSGD',
        ethers.utils.parseUnits('1', 6),
        'XSGD',
        targetEpoch,
        accounts[0].address,
        'beforeExpiryURI',
        'postExpiryURI',
      );
      let events = await pbmTokenManager.queryFilter(filter);
      expect(events.length).to.equal(1);

      let tokenDetails = await pbm.getTokenDetails(0);
      assert.equal(tokenDetails['0'], 'Test-1XSGD1000000');
      assert.equal(tokenDetails['1'].toString(), '1000000');
      assert.equal(tokenDetails['2'], targetEpoch);
      assert.equal(tokenDetails['3'], accounts[0].address.toString());
    });

    it('Minting a PBM token before approving ERC20 spending should revert with error', async () => {
      await expect(pbm.mint(0, 1, accounts[0].address)).revertedWith(
        'ERC20: Insufficent balance or approval',
      );
    });

    it('Minting a PBM token successfully', async () => {
      await spot.increaseAllowance(
        pbm.address,
        ethers.utils.parseUnits('1', 6),
      );
      await pbm.mint(0, 1, accounts[0].address);
      let balance = await pbm.balanceOf(accounts[0].address, 0);
      assert.equal(balance.toString(), '1');
    });
  });
});
