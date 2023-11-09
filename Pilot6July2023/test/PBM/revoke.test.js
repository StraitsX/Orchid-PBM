const { assert, expect } = require('chai');
const {
  deploy,
  getSigners,
  createTokenType,
  initPBM,
  parseUnits,
  mintPBM,
} = require('./testHelper.js');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

// Main Test script
describe('PBM', () => {
  let accounts;
  let owner, merchant1, merchant2, merchant3, nonMerchant;

  before(async () => {
    accounts = await getSigners();
    [owner, merchant1, merchant2, merchant3, nonMerchant] = accounts;
  });

  describe('PBM revoke test', () => {
    let xsgdToken, dsgdToken, swapContract, pbm, addressList, heroNFT;

    beforeEach(async () => {
      xsgdToken = await deploy('Spot', 'XSGD', 'XSGD', 6);
      dsgdToken = await deploy('Spot', 'DSGD', 'DSGD', 2);
      swapContract = await deploy('Swap', dsgdToken.address, xsgdToken.address);
      pbm = await deploy('PBM');
      addressList = await deploy('PBMAddressList');
      heroNFT = await deploy('HeroNFT');
      await initPBM(
        pbm,
        xsgdToken.address,
        dsgdToken.address,
        swapContract.address,
        addressList.address,
        heroNFT.address,
      );

      await xsgdToken.mint(
        owner.address,
        parseUnits('1', await xsgdToken.decimals()),
      );
      await createTokenType(pbm, '1XSGD', '1', xsgdToken, owner); // token id 0
      await mintPBM(pbm, xsgdToken, 0, 1, nonMerchant.address, '1');
    });

    it('revoke non expired token revert with err', async () => {
      await expect(pbm.revokePBM(0)).to.be.revertedWith('PBM not revokable');
    });

    it('revoke non existing token type revert with err', async () => {
      await expect(pbm.revokePBM(1)).to.be.revertedWith(
        'PBM: Invalid Token Id(s)',
      );
    });

    it('revoke expired token type successfully', async () => {
      expect(await xsgdToken.balanceOf(pbm.address)).to.be.equal(1000000);
      expect(await xsgdToken.balanceOf(owner.address)).to.be.equal(0);
      expect(await pbm.balanceOf(nonMerchant.address, 0)).to.be.equal(1);
      await time.increase(100001);
      await pbm.revokePBM(0);
      expect(await xsgdToken.balanceOf(pbm.address)).to.be.equal(0);
      expect(await xsgdToken.balanceOf(owner.address)).to.be.equal(1000000);
      expect(await pbm.balanceOf(nonMerchant.address, 0)).to.be.equal(0);
    });
  });
});
