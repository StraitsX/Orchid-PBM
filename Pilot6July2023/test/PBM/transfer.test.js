const { assert, expect } = require('chai');
const {
  deploy,
  getSigners,
  createTokenType,
  initPBM,
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
        parseUnits('10000', await xsgdToken.decimals()),
      );
      await dsgdToken.mint(
        owner.address,
        parseUnits('10000', await dsgdToken.decimals()),
      );
      await createTokenType(pbm, '1XSGD', '1', xsgdToken, owner); // token id 0
      await createTokenType(pbm, '1DSGD', '1', dsgdToken, owner); // token id 1
      await whilteListMerchant(addressList, [
        merchant1.address,
        merchant2.address,
        merchant3.address,
      ]);
      await mintPBM(pbm, xsgdToken, 0, 1, owner.address, '1');
      await mintPBM(pbm, dsgdToken, 1, 1, owner.address, '1');
    });

    it('transfer XSGD PBM to non merchant successfully', async () => {
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

    it('transfer XSGD PBM to merchant successfully', async () => {
      // Check balances before transfer
      const MerchantBeforeSpotBalance = await xsgdToken.balanceOf(
        merchant3.address,
      );
      expect(MerchantBeforeSpotBalance).to.be.equal(0);

      const ownerBeforeBalance = await pbm.balanceOf(owner.address, 0);
      expect(ownerBeforeBalance).to.be.equal(1);

      // Perform transfer
      await pbm.safeTransferFrom(owner.address, merchant3.address, 0, 1, '0x');

      // Check balances after transfer
      const MerchantAfterSpotBalance = await xsgdToken.balanceOf(
        merchant3.address,
      );
      expect(MerchantAfterSpotBalance).to.be.equal(parseUnits('1', 6));
      const ownerAfterBalance = await pbm.balanceOf(owner.address, 0);
      expect(ownerAfterBalance).to.be.equal(0);
    });

    it('transfer DSGD PBM to merchant without funding XSGD to swap contract should revert with error', async () => {
      // Check balances before transfer
      const MerchantBeforeSpotBalance = await xsgdToken.balanceOf(
        merchant3.address,
      );
      expect(MerchantBeforeSpotBalance).to.be.equal(0);

      const ownerBeforeBalance = await pbm.balanceOf(owner.address, 1);
      expect(ownerBeforeBalance).to.be.equal(1);

      // Perform transfer
      await expect(
        pbm.safeTransferFrom(owner.address, merchant3.address, 1, 1, '0x'),
      ).to.be.revertedWith('Contract has insufficient XSGD balance');
    });

    it('transfer DSGD PBM to merchant successfully and merchant receives XSGD', async () => {
      // fund swap contract with XSGD
      await xsgdToken.mint(
        swapContract.address,
        parseUnits('1', await xsgdToken.decimals()),
      );

      console.log('xsgd decimals:', await xsgdToken.decimals());
      console.log('dsgd decimals:', await dsgdToken.decimals());
      // check PBM DSGD balance
      const PBMBeforeDsgdBalance = await dsgdToken.balanceOf(pbm.address);
      expect(PBMBeforeDsgdBalance).to.be.equal(100);

      // check swap contract DSGD before balance
      const SwapBeforeDsgdBalance = await dsgdToken.balanceOf(
        swapContract.address,
      );
      expect(SwapBeforeDsgdBalance).to.be.equal(0);

      // Check merchant XSGD before balances
      const MerchantBeforeXsgdBalance = await xsgdToken.balanceOf(
        merchant3.address,
      );
      expect(MerchantBeforeXsgdBalance).to.be.equal(0);

      // Perform transfer
      await pbm.safeTransferFrom(owner.address, merchant3.address, 1, 1, '0x');

      // Check merchant XSGD after balances
      const MerchantAfterXsgdBalance = await xsgdToken.balanceOf(
        merchant3.address,
      );
      expect(MerchantAfterXsgdBalance).to.be.equal(
        parseUnits('1', await xsgdToken.decimals()),
      );

      const ownerAfterBalance = await pbm.balanceOf(owner.address, 1);
      expect(ownerAfterBalance).to.be.equal(0);

      // check swap contract DSGD after balance
      const SwapAfterDsgdBalance = await dsgdToken.balanceOf(
        swapContract.address,
      );
      expect(SwapAfterDsgdBalance).to.be.equal(100);

      // check swap contract XSGD after balance
      const SwapAfterXsgdBalance = await xsgdToken.balanceOf(
        swapContract.address,
      );
      expect(SwapAfterXsgdBalance).to.be.equal(0);
    });
  });
});
