const { assert, expect } = require('chai');
const { ethers } = require('hardhat');
const { deploy, initPBM, parseUnits } = require('./testHelper.js');


async function init() {
  let xsgdToken = await deploy('Spot', 'XSGD', 'XSGD', 6);
  let noahPaymentManager = await deploy('NoahPaymentManager');
  let pbm = await deploy('PBMPayment');
  let addressList = await deploy('PBMMerchantAddressList');

  return [xsgdToken, noahPaymentManager, pbm, addressList]
}

describe('PBM PaymentTest', async () => {
  /** Initialise Wallet Addresses */
  const accounts = [];

  before(async () => {
    (await ethers.getSigners()).forEach((signer, index) => {
      accounts[index] = signer;
    });
  });

  /** Initialise Smart contracts Required for tests. */
  let xsgdToken;
  let noahPaymentManager;
  let pbm; 
  let addressList; 

  beforeEach(async () => {
    [xsgdToken, noahPaymentManager, pbm, addressList] = await init();
    
    // Init accts with spot tokens
    await xsgdToken.mint(accounts[0].address,parseUnits('10000', await xsgdToken.decimals()));
    await xsgdToken.mint(accounts[1].address,parseUnits('10000', await xsgdToken.decimals()));

    await pbm.initialise(
      Math.round(new Date().getTime() / 1000 + 86400 * 30), 
      addressList.address,
      noahPaymentManager.address
    )

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
  describe('PBM Payment Core Test', async () => {

    it('Should have been initialised properly', async () => {
        assert(await pbm.pbmAddressList() != '');
        assert(await pbm.pbmTokenManager() != '');
        assert(await pbm.noahPaymentManager() != '');
        assert(await pbm.contractExpiry() != 0);
    });

    describe('PBM Minting Test', async () => {

      it('Only owner should be able to mint unbacked PBM tokens', async () => {
      });

      it('PBM displays the correct token information', async () => {});
      it('PBM displays the correct token balance details', async () => {});

      it('PBM ', async () => {});
      it('PBM ', async () => {});

    });

    // Payment test
      // only merchant can be paid to
      // direct payment 
        // balance is correct
      // indirect payment
        // balance is correct
      // events tests - correct events are emitted
     
    // P2P Transfer test 
      // p2p transfer works 

    // Tear down tests
      // Revoke
      // Recovery of erc20 token tests


    // Expiry date tests

    it('PBM should call swap on NoahPBM if inadequate payment currency', async () => {});
    it('PBM should be able to combine various PBM types in accordance to combination logic', async () => {});

  });



});

