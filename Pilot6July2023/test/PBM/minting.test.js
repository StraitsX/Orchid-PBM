const { assert, expect } = require('chai');
const { ethers } = require('hardhat');
const {
  deploy,
  initPBM,
  createTokenType,
  parseUnits,
} = require('./testHelper.js');

describe('PBM', async () => {
  const accounts = [];

  before(async () => {
    (await ethers.getSigners()).forEach((signer, index) => {
      accounts[index] = signer;
    });
  });

  async function init() {
    let xsgdToken = await deploy('Spot', 'XSGD', 'XSGD', 6);
    let dsgdToken = await deploy('Spot', 'DSGD', 'DSGD', 2);
    let bsgdToken = await deploy('Spot', 'BSGD', 'BSGD', 6);
    let swapContract = await deploy(
      'Swap',
      dsgdToken.address,
      xsgdToken.address,
    );
    let pbm = await deploy('PBM');
    let addressList = await deploy('PBMAddressList');
    let heroNFT = await deploy('HeroNFT');
    await initPBM(
      pbm,
      xsgdToken.address,
      dsgdToken.address,
      swapContract.address,
      addressList.address,
      heroNFT.address,
    );
    return [
      xsgdToken,
      dsgdToken,
      bsgdToken,
      swapContract,
      pbm,
      addressList,
      heroNFT,
    ];
  }

  describe('PBM and Spot Set up test', async () => {
    let xsgdToken;
    let dsgdToken;
    let bsgdToken;
    let swapContract;
    let pbm;
    let addressList;
    let heroNFT;

    before(async () => {
      let [
        _xsgdToken,
        _dsgdToken,
        _bsgdToken,
        _swapContract,
        _pbm,
        _addressList,
        _heroNFT,
      ] = await init();
      xsgdToken = _xsgdToken;
      dsgdToken = _dsgdToken;
      bsgdToken = _bsgdToken;
      swapContract = _swapContract;
      pbm = _pbm;
      addressList = _addressList;
      heroNFT = _heroNFT;
    });

    it('Should deploy smart contract', async () => {
      assert(pbm.address !== '');
      assert(xsgdToken.address !== '');
      assert(dsgdToken.address !== '');
      assert(bsgdToken.address !== '');
      assert(swapContract.address !== '');
      assert(addressList.address !== '');
      assert(heroNFT.address !== '');
    });

    it('Spot tokens should have correct name symbol and decimals', async () => {
      assert.equal(await xsgdToken.name(), 'XSGD');
      assert.equal(await xsgdToken.symbol(), 'XSGD');
      assert.equal(await xsgdToken.decimals(), 6);
      assert.equal(await dsgdToken.name(), 'DSGD');
      assert.equal(await dsgdToken.symbol(), 'DSGD');
      assert.equal(await dsgdToken.decimals(), 2);
      assert.equal(await bsgdToken.name(), 'BSGD');
      assert.equal(await bsgdToken.symbol(), 'BSGD');
      assert.equal(await bsgdToken.decimals(), 6);
    });
    it('PBM Should initialized with Spot token addresses', async () => {
      let xsgd_spot = await pbm.xsgdToken();
      let dsgd_spot = await pbm.dsgdToken();
      assert.equal(xsgdToken.address, xsgd_spot);
      assert.equal(dsgdToken.address, dsgd_spot);
    });

    it('PBM Should initialized with PBMAddressList address', async () => {
      let pbm_address_list = await pbm.pbmAddressList();
      assert.equal(addressList.address, pbm_address_list);
    });

    it('PBM Should initialized with HeroNFT address', async () => {
      let pbm_hero_nft = await pbm.heroNFT();
      assert.equal(heroNFT.address, pbm_hero_nft);
    });
    it('PBM Should initialized with Swap address', async () => {
      let swap_contract = await pbm.swapContract();
      assert.equal(swapContract.address, swap_contract);
    });
  });

  describe('PBM minting test', async () => {
    let xsgdToken = null;
    let dsgdToken = null;
    let bsgdToken = null;
    let swapContract = null;
    let pbm = null;
    let addressList = null;
    let heroNFT = null;

    before(async () => {
      let [
        _xsgdToken,
        _dsgdToken,
        _bsgdToken,
        _swapContract,
        _pbm,
        _addressList,
        _heroNFT,
      ] = await init();
      xsgdToken = _xsgdToken;
      dsgdToken = _dsgdToken;
      bsgdToken = _bsgdToken;
      swapContract = _swapContract;
      pbm = _pbm;
      addressList = _addressList;
      heroNFT = _heroNFT;
      await xsgdToken.mint(
        accounts[0].address,
        parseUnits('10000', await xsgdToken.decimals()),
      );
      await dsgdToken.mint(
        accounts[0].address,
        parseUnits('10000', await dsgdToken.decimals()),
      );
    });

    it('throws an error when minting non existing token type', async () => {
      await expect(pbm.mint(0, 1, accounts[0].address)).to.be.revertedWith(
        'PBM: Invalid Token Id(s)',
      );
    });

    it('Create token type with invalid spot type should revert with error', async () => {
      await expect(
        createTokenType(pbm, 'Test-1XSGD', '1', bsgdToken, accounts[0]),
      ).to.be.revertedWith('SpotType must be DSGD or XSGD');
    });

    it('Create token type successfully', async () => {
      const pbmTokenManagerAddress = await pbm.pbmTokenManager();
      const PBMTokenManagerContract = await ethers.getContractFactory(
        'PBMTokenManager',
      );
      const pbmTokenManager = await PBMTokenManagerContract.attach(
        pbmTokenManagerAddress,
      );

      // listen to pbmTokenManager contract for the NewPBMTypeCreated event
      let filter = pbmTokenManager.filters.NewPBMTypeCreated();

      await createTokenType(pbm, 'Test-1XSGD', '1', xsgdToken, accounts[0]);
      let events = await pbmTokenManager.queryFilter(filter);
      expect(events.length).to.equal(1);
      expect(events[0].event).to.equal('NewPBMTypeCreated');

      let tokenDetails = await pbm.getTokenDetails(0);
      assert.equal(tokenDetails['0'], 'Test-1XSGD1000000');
      assert.equal(tokenDetails['1'].toString(), '1000000');
      assert.equal(tokenDetails['3'], accounts[0].address.toString());
    });

    it('Update token expiry successfully', async () => {
      let tokenDetails = await pbm.getTokenDetails(0);
      const originalExpiry = tokenDetails['2'].toString();
      await pbm.updateTokenExpiry(0, originalExpiry + 100);
      let afterDetails = await pbm.getTokenDetails(0);
      expect(afterDetails['2'].toString()).to.equal(originalExpiry + 100);
    });

    it('Non owner update metadata uri would revert with error', async () => {
      let metadataUri = await pbm.uri(0);
      expect(metadataUri).to.equal('beforeExpiryURI');
      await expect(
        pbm.connect(accounts[1]).updateTokenURI(0, 'updatedURI'),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Owner update metadata uri successfully', async () => {
      let metadataUri = await pbm.uri(0);
      expect(metadataUri).to.equal('beforeExpiryURI');
      await pbm.updateTokenURI(0, 'updatedURI');
      expect(await pbm.uri(0)).to.equal('updatedURI');
    });

    it('Minting a PBM token before approving ERC20 spending should revert with error', async () => {
      await expect(pbm.mint(0, 1, accounts[0].address)).revertedWith(
        'ERC20: Insufficent balance or approval',
      );
    });

    it('Minting a XSGD PBM token successfully', async () => {
      await xsgdToken.increaseAllowance(
        pbm.address,
        parseUnits('1', await xsgdToken.decimals()),
      );
      await pbm.mint(0, 1, accounts[0].address);
      let balance = await pbm.balanceOf(accounts[0].address, 0);
      let XSGDBalance = await xsgdToken.balanceOf(pbm.address);
      assert.equal(balance.toString(), '1');
      assert.equal(XSGDBalance.toString(), '1000000');
    });

    it('Minting a DSGD PBM token successfully', async () => {
      // create DSGD tokenType
      await createTokenType(pbm, 'Test-1DSGD', '1', dsgdToken, accounts[0]);
      await dsgdToken.increaseAllowance(
        pbm.address,
        parseUnits('1', await dsgdToken.decimals()),
      );
      await pbm.mint(1, 1, accounts[0].address);
      let balance = await pbm.balanceOf(accounts[0].address, 1);
      let DSGDBalance = await dsgdToken.balanceOf(pbm.address);
      assert.equal(balance.toString(), '1');
      assert.equal(DSGDBalance.toString(), '100');
    });
  });
});
