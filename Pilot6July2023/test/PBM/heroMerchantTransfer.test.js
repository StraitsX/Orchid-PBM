const { expect } = require('chai');
const {
  deploy,
  getSigners,
  createTokenType,
  initPBM,
  parseUnits,
  mintPBM,
  whilteListMerchant,
  addMerchantAsHero,
} = require('./testHelper.js');

describe('PBM', () => {
  let accounts;
  let owner, merchant1, merchant2, merchant3, nonHeroMerchant, nonMerchant;

  before(async () => {
    accounts = await getSigners();
    [owner, merchant1, merchant2, merchant3, nonHeroMerchant, nonMerchant] =
      accounts;
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

      // whiteList pbm as heroNFT minter
      await heroNFT.addWhitelisted(pbm.address);
      expect(await heroNFT.whitelisted(pbm.address)).to.be.equal(true);

      await xsgdToken.mint(owner.address, parseUnits('10000', await xsgdToken.decimals()));
      await dsgdToken.mint(owner.address, parseUnits('10000', await dsgdToken.decimals()));
      await createTokenType(pbm, '1XSGD', '1', xsgdToken, owner);
      await whilteListMerchant(addressList, [
        merchant1.address,
        merchant2.address,
        merchant3.address,
        nonHeroMerchant.address,
      ]);
      await addMerchantAsHero(
        addressList,
        [merchant1.address, merchant2.address, merchant3.address],
        [1, 2, 3],
      );
      await mintPBM(pbm, xsgdToken, 0, 1, owner.address, '1');
    });

    // TODO: write tests for PBMAddresslist and move this test to that.
    it('reverts with error when assigning heroNFT token id 0 to heroMerchant', async () => {
      await expect(
        addMerchantAsHero(addressList, [nonHeroMerchant.address], [0]),
      ).to.be.revertedWith('PBMAddressList: heroNFT token_id cannot be 0');
    });

    it('transfer to non hero merchant will not mint heroNFT to user', async () => {
      // Perform transfer
      await pbm.safeTransferFrom(
        owner.address,
        nonHeroMerchant.address,
        0,
        1,
        '0x',
      );
      // Check balances after transfer
      const MerchantAfterXsgdBalance = await xsgdToken.balanceOf(
        nonHeroMerchant.address,
      );
      expect(MerchantAfterXsgdBalance).to.be.equal(parseUnits('1', await xsgdToken.decimals()));
      const ownerHeroNFT1Balance = await heroNFT.balanceOf(owner.address, 1);
      expect(ownerHeroNFT1Balance).to.be.equal(0);
      const ownerHeroNFT2Balance = await heroNFT.balanceOf(owner.address, 2);
      expect(ownerHeroNFT2Balance).to.be.equal(0);
      const ownerHeroNFT3Balance = await heroNFT.balanceOf(owner.address, 3);
      expect(ownerHeroNFT3Balance).to.be.equal(0);
    });

    it('transfer to hero merchant successfully mint heroNFT to user', async () => {
      // Perform transfer
      await pbm.safeTransferFrom(owner.address, merchant1.address, 0, 1, '0x');
      // Check balances after transfer
      const heroMerchantAfterXsgdBalance = await xsgdToken.balanceOf(
        merchant1.address,
      );
      expect(heroMerchantAfterXsgdBalance).to.be.equal(parseUnits('1', await xsgdToken.decimals()));
      const ownerHeroNFTBalance = await heroNFT.balanceOf(owner.address, 1);
      expect(ownerHeroNFTBalance).to.be.equal(1);
    });

    it('transfer to hero merchant successfully will not mint heroNFT if user already have one', async () => {
      // Perform transfer to hero merchant 2
      await pbm.safeTransferFrom(owner.address, merchant2.address, 0, 1, '0x');
      // Check balances after transfer
      const heroMerchantAfterXsgdBalance = await xsgdToken.balanceOf(
        merchant2.address,
      );
      expect(heroMerchantAfterXsgdBalance).to.be.equal(parseUnits('1', await xsgdToken.decimals()));
      // expect to get heroNFT id 2
      const ownerHeroNFTBalance = await heroNFT.balanceOf(owner.address, 2);
      expect(ownerHeroNFTBalance).to.be.equal(1);

      // mint another PBM
      await mintPBM(pbm, xsgdToken, 0, 1, owner.address, '1');
      // Perform transfer to hero merchant 2 again won't receive another heroNFT
      await pbm.safeTransferFrom(owner.address, merchant2.address, 0, 1, '0x');

      const heroMerchantFinalXsgdBalance = await xsgdToken.balanceOf(
        merchant2.address,
      );
      expect(heroMerchantFinalXsgdBalance).to.be.equal(parseUnits('2', await xsgdToken.decimals()));

      const ownerFinalHeroNFTBalance = await heroNFT.balanceOf(
        owner.address,
        2,
      );
      expect(ownerFinalHeroNFTBalance).to.be.equal(1);
    });

    it('transfer to hero merchant successfully will not mint heroNFT if user received it once', async () => {
      // Perform transfer to hero merchant 2
      await pbm.safeTransferFrom(owner.address, merchant2.address, 0, 1, '0x');
      // Check balances after transfer
      const heroMerchantAfterXsgdBalance = await xsgdToken.balanceOf(
          merchant2.address,
      );
      expect(heroMerchantAfterXsgdBalance).to.be.equal(parseUnits('1', await xsgdToken.decimals()));
      // expect to get heroNFT id 2
      const ownerHeroNFTBalance = await heroNFT.balanceOf(owner.address, 2);
      expect(ownerHeroNFTBalance).to.be.equal(1);

      // mint another PBM
      await mintPBM(pbm, xsgdToken, 0, 1, owner.address, '1');
      // Perform transfer to hero merchant 2 again won't receive another heroNFT
      await pbm.safeTransferFrom(owner.address, merchant2.address, 0, 1, '0x');

      const heroMerchantFinalXsgdBalance = await xsgdToken.balanceOf(
          merchant2.address,
      );
      expect(heroMerchantFinalXsgdBalance).to.be.equal(parseUnits('2', await xsgdToken.decimals()));

      const ownerFinalHeroNFTBalance = await heroNFT.balanceOf(
          owner.address,
          2,
      );
      expect(ownerFinalHeroNFTBalance).to.be.equal(1);

      // transfer out the heroNFT

      await heroNFT.safeTransferFrom(owner.address, nonMerchant.address, 2, 1, '0x')
      expect(await heroNFT.balanceOf(owner.address, 2)).to.be.equal(0)

      // mint another pbm
      await mintPBM(pbm, xsgdToken, 0, 1, owner.address, '1');
      // Perform transfer to hero merchant 2 again won't receive another heroNFT even when owner currently doesn't hold the heroNFT
      await pbm.safeTransferFrom(owner.address, merchant2.address, 0, 1, '0x');
      expect(await heroNFT.balanceOf(owner.address, 2)).to.be.equal(0)
      // check merchant xsgd balance to make sure the pbm transfer succeeded
      expect(await xsgdToken.balanceOf(merchant2.address)).to.be.equal(parseUnits('3', await xsgdToken.decimals()));
    });

    it('batch Transfer to hero merchant successfully mint heroNFT to user', async () => {
      // fund swap contract with XSGD
      await xsgdToken.mint(swapContract.address, parseUnits('2', await xsgdToken.decimals()));
      await createTokenType(pbm, '2DSGD', '2', dsgdToken, owner);
      await mintPBM(pbm, dsgdToken, 1, 1, owner.address, '2');
      // Perform transfer
      await pbm.safeBatchTransferFrom(
        owner.address,
        merchant1.address,
        [0, 1],
        [1, 1],
        '0x',
      );
      // Check balances after transfer
      const heroMerchantAfterXsgdBalance = await xsgdToken.balanceOf(
        merchant1.address,
      );
      expect(heroMerchantAfterXsgdBalance).to.be.equal(parseUnits('3', await xsgdToken.decimals()));
      const ownerHeroNFTBalance = await heroNFT.balanceOf(owner.address, 1);
      expect(ownerHeroNFTBalance).to.be.equal(1);
    });

    it('batch Transfer to hero merchant will not mint heroNFT if user already has it', async () => {
      // fund swap contract with XSGD
      await xsgdToken.mint(swapContract.address, parseUnits('4', 6));
      await createTokenType(pbm, '2DSGD', '2', dsgdToken, owner);
      await mintPBM(pbm, xsgdToken, 0, 1, owner.address, '1');
      await mintPBM(pbm, dsgdToken, 1, 2, owner.address, '2');
      // Perform transfer
      await pbm.safeBatchTransferFrom(
        owner.address,
        merchant1.address,
        [0, 1],
        [1, 1],
        '0x',
      );
      // Check balances after transfer
      const heroMerchantAfterXsgdBalance = await xsgdToken.balanceOf(
        merchant1.address,
      );
      expect(heroMerchantAfterXsgdBalance).to.be.equal(parseUnits('3', await xsgdToken.decimals()));
      const ownerHeroNFTBalance = await heroNFT.balanceOf(owner.address, 1);
      expect(ownerHeroNFTBalance).to.be.equal(1);

      // Perform transfer batch again
      await pbm.safeBatchTransferFrom(
        owner.address,
        merchant1.address,
        [0, 1],
        [1, 1],
        '0x',
      );
      // Check balances after 2nd transfer
      const merchantAfter2ndTransferXsgdBalance = await xsgdToken.balanceOf(
        merchant1.address,
      );
      expect(merchantAfter2ndTransferXsgdBalance).to.be.equal(
        parseUnits('6', await xsgdToken.decimals()),
      );
      const ownerHeroNFTBalanceAfter2nTransfer = await heroNFT.balanceOf(
        owner.address,
        1,
      );
      expect(ownerHeroNFTBalanceAfter2nTransfer).to.be.equal(1);
    });

    it('batch Transfer to hero merchant will not mint heroNFT if user received it once', async () => {
      // fund swap contract with XSGD
      await xsgdToken.mint(swapContract.address, parseUnits('6', 6));
      await createTokenType(pbm, '2DSGD', '2', dsgdToken, owner);
      await mintPBM(pbm, xsgdToken, 0, 2, owner.address, '1');
      await mintPBM(pbm, dsgdToken, 1, 3, owner.address, '2');
      // Perform transfer
      await pbm.safeBatchTransferFrom(
          owner.address,
          merchant1.address,
          [0, 1],
          [1, 1],
          '0x',
      );
      // Check balances after transfer
      const heroMerchantAfterXsgdBalance = await xsgdToken.balanceOf(
          merchant1.address,
      );
      expect(heroMerchantAfterXsgdBalance).to.be.equal(parseUnits('3', await xsgdToken.decimals()));
      const ownerHeroNFTBalance = await heroNFT.balanceOf(owner.address, 1);
      expect(ownerHeroNFTBalance).to.be.equal(1);

      // Perform transfer batch again
      await pbm.safeBatchTransferFrom(
          owner.address,
          merchant1.address,
          [0, 1],
          [1, 1],
          '0x',
      );
      // Check balances after 2nd transfer
      const merchantAfter2ndTransferXsgdBalance = await xsgdToken.balanceOf(
          merchant1.address,
      );
      expect(merchantAfter2ndTransferXsgdBalance).to.be.equal(
          parseUnits('6', await xsgdToken.decimals()),
      );
      const ownerHeroNFTBalanceAfter2nTransfer = await heroNFT.balanceOf(
          owner.address,
          1,
      );
      expect(ownerHeroNFTBalanceAfter2nTransfer).to.be.equal(1);

      // transfer out the heroNFT
      await heroNFT.safeTransferFrom(owner.address, nonMerchant.address, 1, 1, '0x')
      expect(await heroNFT.balanceOf(owner.address, 1)).to.be.equal(0)

      // batch transfer to merchant again
      await pbm.safeBatchTransferFrom(
          owner.address,
          merchant1.address,
          [0, 1],
          [1, 1],
          '0x',
      );
      expect(await heroNFT.balanceOf(owner.address, 1)).to.be.equal(0)

      // check merchant xsgd balance to see if transfer works
      expect(await xsgdToken.balanceOf(merchant1.address)).to.be.equal(parseUnits('9', await xsgdToken.decimals()));
    });
  });
});
