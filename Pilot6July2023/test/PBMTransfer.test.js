const { assert, expect } = require('chai');
const {
  deploy,
  getSigners,
  createTokenType,
  parseUnits,
  mintPBM,
  whilteListMerchant,
} = require('./testHelper.js');

// Main Test script
describe('PBM', () => {
  let accounts;
  let owner, merchant1, merchant2, merchant3, nonMerchant;

  before(async () => {
    accounts = await getSigners();
    [owner, merchant1, merchant2, merchant3, nonMerchant] = accounts;
  });

  describe('PBM transfer test', () => {
    let spot, pbm, addressList, heroNFT;

    beforeEach(async () => {
      spot = await deploy('Spot');
      pbm = await deploy('PBM');
      addressList = await deploy('PBMAddressList');
      heroNFT = await deploy('HeroNFT');
      await pbm.initialise(
        spot.address,
        Math.round(new Date().getTime() / 1000 + 86400 * 30),
        addressList.address,
        heroNFT.address,
      );

      await spot.mint(owner.address, parseUnits('10000', 6));
      await createTokenType(pbm, '1XSGD', '1', 'XSGD', owner);
      await whilteListMerchant(addressList, [
        merchant1.address,
        merchant2.address,
        merchant3.address,
      ]);
      await mintPBM(pbm, spot, 0, 1, owner.address, '1');
    });

    it('transfer to non merchant successfully', async () => {
      // Check balances before transfer
      const nonMerchantBeforeBalance = await pbm.balanceOf(
        nonMerchant.address,
        0,
      );

      expect(nonMerchantBeforeBalance).to.be.equal(0);
      const ownerBeforeBalance = await pbm.balanceOf(owner.address, 0);
      expect(ownerBeforeBalance).to.be.equal(1);

      // Perform transfer
      await pbm.safeTransferFrom(
        owner.address,
        nonMerchant.address,
        0,
        1,
        '0x',
      );

      // Check balances after transfer
      const nonMerchantAfterBalance = await pbm.balanceOf(
        nonMerchant.address,
        0,
      );
      expect(nonMerchantAfterBalance).to.be.equal(1);
      const ownerAfterBalance = await pbm.balanceOf(owner.address, 0);
      expect(ownerAfterBalance).to.be.equal(0);
    });

    it('transfer to merchant successfully', async () => {
      // Check balances before transfer
      const MerchantBeforeSpotBalance = await spot.balanceOf(merchant3.address);
      expect(MerchantBeforeSpotBalance).to.be.equal(0);

      const ownerBeforeBalance = await pbm.balanceOf(owner.address, 0);
      expect(ownerBeforeBalance).to.be.equal(1);

      // Perform transfer
      await pbm.safeTransferFrom(owner.address, merchant3.address, 0, 1, '0x');

      // Check balances after transfer
      const MerchantAfterSpotBalance = await spot.balanceOf(merchant3.address);
      expect(MerchantAfterSpotBalance).to.be.equal(parseUnits('1', 6));
      const ownerAfterBalance = await pbm.balanceOf(owner.address, 0);
      expect(ownerAfterBalance).to.be.equal(0);
    });
  });
});
