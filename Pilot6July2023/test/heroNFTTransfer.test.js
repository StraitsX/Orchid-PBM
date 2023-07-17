const { expect } = require('chai');
const {
  deploy,
  getSigners,
  createTokenType,
  parseUnits,
  mintPBM,
  whilteListMerchant,
  addMerchantAsHero,
} = require('./testHelper.js');

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

      // whiteList pbm as heroNFT minter
      await heroNFT.addWhitelisted(pbm.address);
      expect(await heroNFT.whitelisted(pbm.address)).to.be.equal(true);

      await spot.mint(owner.address, parseUnits('10000', 6));
      await createTokenType(pbm, '1XSGD', '1', 'XSGD', owner);
      await whilteListMerchant(addressList, [
        merchant1.address,
        merchant2.address,
        merchant3.address,
      ]);
      await addMerchantAsHero(
        addressList,
        [merchant1.address, merchant2.address, merchant3.address],
        [1, 2, 3],
      );
      await mintPBM(pbm, spot, 0, 1, owner.address, '1');
    });

    it('transfer to hero merchant successfully mint heroNFT to user', async () => {
      // Perform transfer
      await pbm.safeTransferFrom(owner.address, merchant1.address, 0, 1, '0x');
      // Check balances after transfer
      const heroMerchantAfterSpotBalance = await spot.balanceOf(
        merchant1.address,
      );
      expect(heroMerchantAfterSpotBalance).to.be.equal(parseUnits('1', 6));
      const ownerHeroNFTBalance = await heroNFT.balanceOf(owner.address, 1);
      expect(ownerHeroNFTBalance).to.be.equal(1);
    });

    it('transfer to hero merchant successfully will not mint heroNFT if user already have one', async () => {
      // Perform transfer to hero merchant 2
      await pbm.safeTransferFrom(owner.address, merchant2.address, 0, 1, '0x');
      // Check balances after transfer
      const heroMerchantAfterSpotBalance = await spot.balanceOf(
        merchant2.address,
      );
      expect(heroMerchantAfterSpotBalance).to.be.equal(parseUnits('1', 6));
      // expect to get heroNFT id 2
      const ownerHeroNFTBalance = await heroNFT.balanceOf(owner.address, 2);
      expect(ownerHeroNFTBalance).to.be.equal(1);

      // mint another PBM
      await mintPBM(pbm, spot, 0, 1, owner.address, '1');
      // Perform transfer to hero merchant 2 again won't receive another heroNFT
      await pbm.safeTransferFrom(owner.address, merchant2.address, 0, 1, '0x');

      const heroMerchantFinalSpotBalance = await spot.balanceOf(
        merchant2.address,
      );
      expect(heroMerchantFinalSpotBalance).to.be.equal(parseUnits('2', 6));

      const ownerFinalHeroNFTBalance = await heroNFT.balanceOf(
        owner.address,
        2,
      );
      expect(ownerFinalHeroNFTBalance).to.be.equal(1);
    });

    it('batch Transfer to hero merchant successfully mint heroNFT to user', async () => {
      await createTokenType(pbm, '2XSGD', '2', 'XSGD', owner);
      await mintPBM(pbm, spot, 1, 1, owner.address, '2');
      // Perform transfer
      await pbm.safeBatchTransferFrom(
        owner.address,
        merchant1.address,
        [0, 1],
        [1, 1],
        '0x',
      );
      // Check balances after transfer
      const heroMerchantAfterSpotBalance = await spot.balanceOf(
        merchant1.address,
      );
      expect(heroMerchantAfterSpotBalance).to.be.equal(parseUnits('3', 6));
      const ownerHeroNFTBalance = await heroNFT.balanceOf(owner.address, 1);
      expect(ownerHeroNFTBalance).to.be.equal(1);
    });
  });
});
