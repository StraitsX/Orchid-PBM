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
        
        // merchant received money
        expect(MerchantAfterSpotBalance).to.be.equal(parseUnits('1', 6));
        const ownerAfterBalance = await pbm.balanceOf(owner.address, 0);
        expect(ownerAfterBalance).to.be.equal(0);

        // ensure noah disburse the money
        expect(await xsgdToken.balanceOf(noahPaymentManager.address)).to.equal(0);
      });

      it('transfer of PBM should fail if token holder does not have pbm', async () => { 
        expect(
          pbm.safeTransferFrom(nonMerchant.address, merchant3.address, 0, 1, '0x')
        ).to.be.revertedWith('ERC1155: caller is not token owner nor approved');
      });

      it('Should allow the combination of different PBM types with metadata being emitted', async () => { 
        await createTokenType(pbm, '1XSGD', '1', xsgdToken, owner); // token id 1
        await createTokenType(pbm, '2-discountXSGD', '2', xsgdToken, owner); // token id 2
        await createTokenType(pbm, '10XSGD', '10', xsgdToken, owner); // token id 3
        await mintPBM(pbm, xsgdToken, 1, 1, owner.address, '1');
        await mintPBM(pbm, xsgdToken, 2, 1, owner.address, '2');
        await mintPBM(pbm, xsgdToken, 3, 1, owner.address, '10');
    

        metadataString = "metadata:{somedata: 'hi', somedata2: 'hi2'}";
        encodedMetadata = ethers.utils.hexlify(
          ethers.utils.toUtf8Bytes(metadataString));


        // await pbm.safeBatchTransferFrom(
        //   owner.address,
        //   merchant1.address,
        //   [0, 1], //ids 
        //   [1, 1], //amt
        //   encodedMetadata,
        // );

        console.log(encodedMetadata);
        await expect(
          await pbm.safeBatchTransferFrom(
            owner.address,
            merchant1.address,
            [0, 1], //ids 
            [1, 1], //amt
            encodedMetadata,
          )
        ).to.emit(noahPaymentManager, "MerchantPaymentDirect").withArgs(
          pbm.address, owner.address, merchant1.address, xsgdToken.address, 
          '2000000','0x6d657461646174613a7b736f6d65646174613a20276869272c20736f6d6564617461323a2027686932277d'
        );

        
        // listen to noahPaymentManager contract for the MerchantPaymentDirect event
        let filter = noahPaymentManager.filters.MerchantPaymentDirect();
        let events = await noahPaymentManager.queryFilter(filter);
        console.log(events);

        // expect(events.length).to.equal(1);
        // expect(events[0].event).to.equal('NewPBMTypeCreated');

        decodedMetadata = ethers.utils.toUtf8String(ethers.utils.arrayify(encodedMetadata));
        expect(decodedMetadata).to.equal(metadataString);


        
      });


    });

    describe('PBM Direct Payment Test', async () => {
      it('should only allow payments to be made to merchants', async () => { });

    });

    describe('PBM Unbacked PBM Payment Test', async () => {


    });


    // Payment test
    // only merchant can be paid to [done]

    // direct payment 
    // only token holder can spend their own pbm [done]
    // balance on noah is correct [done]
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

