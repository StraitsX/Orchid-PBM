const { assert, expect } = require('chai');
const { ethers } = require('hardhat');
const { deploy, getSigners, whilteListMerchant, parseUnits, mintPBM, createTokenType } = require('./testHelper.js');


async function init() {
  let xsgdToken = await deploy('Spot', 'XSGD', 'XSGD', 6);

  let noahPaymentManager = await deploy('NoahPaymentManager');
  let pbm = await deploy('PBMPayment');
  let addressList = await deploy('PBMMerchantAddressList');

  return [xsgdToken, noahPaymentManager, pbm, addressList]
}

describe('PBMPayment Test', async () => {
  /** Initialise Wallet Addresses */
  const accounts = [];

  before(async () => {
    (await ethers.getSigners()).forEach((signer, index) => {
      accounts[index] = signer;
    });
  });

  /** Initialise Smart contracts Required for tests. */
  let xsgdToken,noahPaymentManager,pbm, addressList;
  let owner, merchant1, merchant2, merchant3, nonMerchant;

  // use beforeEach for test isolation 
  // use before for test cases to depende on previous tests structures
  beforeEach(async () => {
    [xsgdToken, noahPaymentManager, pbm, addressList] = await init();
    [owner, merchant1, merchant2, merchant3, nonMerchant] = await getSigners();

    // Init accts with spot tokens
    await xsgdToken.mint(accounts[0].address, parseUnits('10000', await xsgdToken.decimals()));
    await xsgdToken.mint(accounts[1].address, parseUnits('10000', await xsgdToken.decimals()));

    await pbm.initialise(
      Math.round(new Date().getTime() / 1000 + 86400 * 30),
      addressList.address,
      noahPaymentManager.address
    )

    // Create address list
    await whilteListMerchant(addressList, [
      merchant1.address,
      merchant2.address,
      merchant3.address,
    ]);

  });

  /** Verify Deployments first */
  it('Should ensure initialisation done correctly', async () => {
    assert(xsgdToken.address !== '');
    assert(noahPaymentManager.address !== '');
    assert(pbm.address !== '');


    assert.equal(await xsgdToken.name(), 'XSGD');
    assert.equal(await xsgdToken.symbol(), 'XSGD');
    assert.equal(await xsgdToken.decimals(), 6);

    expect(await xsgdToken.balanceOf(accounts[0].address)).to.equals(10000000000)
    expect(await xsgdToken.balanceOf(accounts[1].address)).to.equals(10000000000)

  });


  /** PBM Payment related & end to end tests */
  describe('PBM Payment Payment and Transfers', async () => {

    beforeEach(async () => {
      // Create and mint PBM Token
      await createTokenType(pbm, '1XSGD', '1', xsgdToken, owner); // token id 0
      await mintPBM(pbm, xsgdToken, 0, 1, owner.address, '1');
      
    });

    it('Should have been initialised properly', async () => {
      assert(await pbm.pbmAddressList() != '');
      assert(await pbm.pbmTokenManager() != '');
      assert(await pbm.noahPaymentManager() != '');
      assert(await pbm.contractExpiry() != 0);
      assert(await xsgdToken.balanceOf(noahPaymentManager.address) > 0);
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


    describe('PBM Payment via safeTransfer Test', async () => {
      
      it('transfer XSGD PBM and unwrap payment to merchant successfully', async () => {
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

      it('', async () => { });
      it('', async () => { });
    });

    describe('PBM Direct Payment Test', async () => {
      it('should only allow payments to be made to merchants', async () => { });

    });

    describe('PBM Unbacked PBM Payment Test', async () => {


    });


    // Payment test
    // only merchant can be paid to

    // direct payment 
    // only token holder can spend their own pbm 
    // balance on noah is correct
    // able to batch combine product pbm with normal pbm to noah with metadata passthrough code to oracle.
    // batched payment can only work if its having a common spot token

    // 2 step payment
    // only token holder can spend their own pbm 
    // balance on noah is correct
    // able to batch combine product pbm with normal pbm to noah with metadata passthrough code to oracle.
    // batched payment can only work if its having a common spot token

    // unbacked pbm 
    // should work and stop once noahpayment manager runs out of funds.

    // events tests - correct events are emitted

    // P2P Transfer test 
    // p2p transfer works 

    // Tear down tests
    // Revoke from noah pbm test
    // Recovery of erc20 token tests


    it('PBM expiry should work as intended', async () => { });
    it('PBM should call swap on NoahPBM if inadequate payment currency', async () => { });
    it('PBM should be able to combine various PBM types in accordance to combination logic', async () => { });

  });



});

