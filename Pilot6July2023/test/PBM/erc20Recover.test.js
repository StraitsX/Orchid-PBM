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
      expect(await xsgdToken.balanceOf(pbm.address)).equal(
        parseUnits('10000', await xsgdToken.decimals()),
      );
      expect(await xsgdToken.balanceOf(accounts[0].address)).equal(0);
      await pbm.recoverAllERC20(xsgdToken.address);
      expect(await xsgdToken.balanceOf(pbm.address)).equal(0);
      expect(await xsgdToken.balanceOf(accounts[0].address)).equal(
        parseUnits('10000', await xsgdToken.decimals()),
      );
    });

    it('recovers a specific amount of erc20 tokens from the pbm contract successfully', async () => {
      await xsgdToken.mint(
        pbm.address,
        parseUnits('10000', await xsgdToken.decimals()),
      );
      expect(await xsgdToken.balanceOf(pbm.address)).equal(
        parseUnits('10000', await xsgdToken.decimals()),
      );
      expect(await xsgdToken.balanceOf(accounts[0].address)).equal(0);
      await pbm.recoverERC20(
        xsgdToken.address,
        parseUnits('8000', await xsgdToken.decimals()),
      );
      expect(await xsgdToken.balanceOf(pbm.address)).equal(
        parseUnits('2000', await xsgdToken.decimals()),
      );
      expect(await xsgdToken.balanceOf(accounts[0].address)).equal(
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
  });
});
