const { expect } = require('chai');
const { ethers } = require('hardhat');
const { deploy, initPBM, parseUnits } = require('./testHelper.js');

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

  describe('ERC20 recover test', async () => {
    let xsgdToken;
    let dsgdToken;
    let bsgdToken;
    let swapContract;
    let pbm;
    let addressList;
    let heroNFT;

    beforeEach(async () => {
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

    it('recovers all erc20 tokens from the pbm contract successfully', async () => {
      await xsgdToken.mint(
        pbm.address,
        parseUnits('10000', await xsgdToken.decimals()),
      );
      expect(await xsgdToken.balanceOf(pbm.address)).to.equal(
        parseUnits('10000', await xsgdToken.decimals()),
      );
      expect(await xsgdToken.balanceOf(accounts[0].address)).to.equal(0);
      await pbm.recoverAllERC20(xsgdToken.address);
      expect(await xsgdToken.balanceOf(pbm.address)).to.equal(0);
      expect(await xsgdToken.balanceOf(accounts[0].address)).to.equal(
        parseUnits('10000', await xsgdToken.decimals()),
      );
    });

    it('recovers a specific amount of erc20 tokens from the pbm contract successfully', async () => {
      await xsgdToken.mint(
        pbm.address,
        parseUnits('10000', await xsgdToken.decimals()),
      );
      expect(await xsgdToken.balanceOf(pbm.address)).to.equal(
        parseUnits('10000', await xsgdToken.decimals()),
      );
      expect(await xsgdToken.balanceOf(accounts[0].address)).to.equal(0);
      await pbm.recoverERC20(
        xsgdToken.address,
        parseUnits('8000', await xsgdToken.decimals()),
      );
      expect(await xsgdToken.balanceOf(pbm.address)).to.equal(
        parseUnits('2000', await xsgdToken.decimals()),
      );
      expect(await xsgdToken.balanceOf(accounts[0].address)).to.equal(
        parseUnits('8000', await xsgdToken.decimals()),
      );
    });

    it('reverts with error when caller of recoverAllERC20 is not owner', async () => {
      await xsgdToken.mint(
        pbm.address,
        parseUnits('10000', await xsgdToken.decimals()),
      );
      await expect(
        pbm.connect(accounts[1]).recoverAllERC20(xsgdToken.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('reverts with error when caller of recoverERC20 is not owner', async () => {
      await xsgdToken.mint(
        pbm.address,
        parseUnits('10000', await xsgdToken.decimals()),
      );
      await expect(
        pbm
          .connect(accounts[1])
          .recoverERC20(
            xsgdToken.address,
            parseUnits('10000', await xsgdToken.decimals()),
          ),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('reverts with error when trying to recover more than the contract owns', async () => {
      await xsgdToken.mint(
        pbm.address,
        parseUnits('5000', await xsgdToken.decimals()),
      );
      await expect(
        pbm.recoverERC20(
          xsgdToken.address,
          parseUnits('10000', await xsgdToken.decimals()),
        ),
      ).to.be.revertedWith('Interaction with the spot token failed.');
    });

    it('update the expiry successfully', async () => {
      let currentDate = new Date();
      let currentEpoch = Math.floor(currentDate / 1000);
      let targetEpoch = currentEpoch + 100000; // Expiry is set to 1 day 3.6 hours from current time
      let newExpiryEpoch = 1692662400; // new expiry at the past: August 22, 2023 8:00:00 AM GMT+08:00

      await pbm.createPBMTokenType(
        'updateExpiryTest',
        parseUnits('1', await xsgdToken.decimals()),
        xsgdToken.symbol(),
        targetEpoch,
        accounts[0].address,
        'beforeExpiryURI',
        'postExpiryURI',
      );

      expect((await pbm.getTokenDetails(0))[2]).to.equal(targetEpoch);
      await pbm.updateTokenExpiry(0, newExpiryEpoch);
      expect((await pbm.getTokenDetails(0))[2]).to.equal(newExpiryEpoch);
    });

    it('revert with error when non owner trying to update the expiry', async () => {
      let currentDate = new Date();
      let currentEpoch = Math.floor(currentDate / 1000);
      let targetEpoch = currentEpoch + 100000; // Expiry is set to 1 day 3.6 hours from current time
      let newExpiryEpoch = 1692662400; // new expiry at the past: August 22, 2023 8:00:00 AM GMT+08:00

      await pbm.createPBMTokenType(
        'updateExpiryTest',
        parseUnits('1', await xsgdToken.decimals()),
        xsgdToken.symbol(),
        targetEpoch,
        accounts[0].address,
        'beforeExpiryURI',
        'postExpiryURI',
      );

      expect((await pbm.getTokenDetails(0))[2]).to.equal(targetEpoch);
      await expect(
        pbm.connect(accounts[1]).updateTokenExpiry(0, newExpiryEpoch),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('returns correctly whether tokens are valid or not', async () => {
      let currentDate = new Date();
      let currentEpoch = Math.floor(currentDate / 1000);
      let targetEpoch = currentEpoch + 100000; // Expiry is set to 1 day 3.6 hours from current time
      let newExpiryEpoch = 1692662400; // new expiry at the past: August 22, 2023 8:00:00 AM GMT+08:00

      // token id 0
      await pbm.createPBMTokenType(
        'updateExpiryTest',
        parseUnits('1', await xsgdToken.decimals()),
        xsgdToken.symbol(),
        targetEpoch,
        accounts[0].address,
        'beforeExpiryURI',
        'postExpiryURI',
      );

      // token id 1
      await pbm.createPBMTokenType(
        'updateExpiryTest',
        parseUnits('1', await xsgdToken.decimals()),
        xsgdToken.symbol(),
        targetEpoch,
        accounts[0].address,
        'beforeExpiryURI',
        'postExpiryURI',
      );

      const pbmTokenManagerAddress = await pbm.pbmTokenManager();
      const PBMTokenManagerContract = await ethers.getContractFactory(
        'PBMTokenManager',
      );
      const pbmTokenManager = await PBMTokenManagerContract.attach(
        pbmTokenManagerAddress,
      );

      expect((await pbm.getTokenDetails(1))[2]).to.equal(targetEpoch);
      expect(await pbmTokenManager.areTokensValid([0, 1])).to.equal(true);
      // update token id 1 expiry to a time in the past
      await pbm.updateTokenExpiry(1, newExpiryEpoch);
      expect((await pbm.getTokenDetails(1))[2]).to.equal(newExpiryEpoch);

      expect(await pbmTokenManager.areTokensValid([0])).to.equal(true);
      expect(await pbmTokenManager.areTokensValid([0, 1])).to.equal(false);
      expect(await pbmTokenManager.areTokensValid([1])).to.equal(false);
    });
  });
});
