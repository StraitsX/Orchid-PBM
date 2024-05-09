const { assert, expect } = require('chai');
const { ethers } = require('hardhat');
const { deploy, initPBM, parseUnits } = require('./testHelper.js');


async function init() {
  let xsgdToken = await deploy('Spot', 'XSGD', 'XSGD', 6);
  let noahPaymentManager = await deploy('NoahPaymentManager');
  return [xsgdToken, noahPaymentManager]
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
  beforeEach(async () => {
    [xsgdToken, noahPaymentManager] = await init();
  });

  /** Verify Deployments first */
  it('Should ensure initialisation done correctly', async () => {
    assert(xsgdToken.address !== '');
    assert(noahPaymentManager.address !== '');

    assert.equal(await xsgdToken.name(), 'XSGD');
    assert.equal(await xsgdToken.symbol(), 'XSGD');
    assert.equal(await xsgdToken.decimals(), 6);

    await xsgdToken.mint(accounts[0].address,parseUnits('10000', await xsgdToken.decimals()));
    expect(await xsgdToken.balanceOf(accounts[0].address)).to.equals(10000000000)
  });
  

  /** Noah Payment related tests */
  describe('Noah PBM Core Test', async () => {

    
    it('Should ensure ', async () => {});
    
    it('Should ensure crawler role is being defined', async () => {
      expect(await noahPaymentManager.NOAH_CRAWLER_ROLE()).equals(
        "0x1fd1b424520c6953ed4b151586253c6b4fe3183d39b856d80f513a00f543a978");

    });


    it('Should ensure that only campaign PBM can spend its own money', async () => {});
    
    // required to ensure admin roles are not hijacked
    it('Should ensure that only Noah PBM can only be init once', async () => {});
    it('Should ensure payments can only be created if enough funding', async () => {});

    it('Should ensure ERC20 balance and treasury balance are NOT changed after payment Created', async () => {});
    it('Should ensure ERC20 balance and treasury balance are NOT changed after payment Cancelled', async () => {});

    it('Should ensure ERC20 balance and treasury balance are updated after payment COMPLETED', async () => {});
    it('Should ensure ERC20 balance and treasury balance are updated after payment Refunded', async () => {});

    it('Should ensure ERC20 balance and treasury balance are updated after payment Refunded', async () => {});


    describe('Treasury Balance Test', async () => {

      it('Should ensure all treasury related functions are STRICTLY internal only functions', async () => {});

      it('Should ensure Owner is able to recover erc20 tokens in this smart contract', async () => {});

      it('Should ensure _increaseTrasuryBalance only increase main balance', async () => {});
      it('Should ensure _markCompleteTreasuryBalanace only decrease pending balance', async () => {});
      it('Should ensure _markPendingTreasuryBalanace moves from main to pending balance', async () => {});
      it('Should ensure _revertPendingTreasuryBalanace moves from pending to main balance', async () => {});

    });


    describe('Payment Created Test', async () => {

      it('Should ensure pbm balance is moved to pending balance upon PaymentCreated event', async () => {});

    });

    describe('Payment Completed Test', async () => {

      it('Should ensure erc20 token is disburse to destination', async () => {});
      it('Should ensure internal pending balance is updated only', async () => {});

    });

    describe('Payment Cancel Test', async () => {

      it('Should ensure pbm pending balance is moved back to pbm balance upon PaymentCreated event', async () => {});


    });
    
    

  });



  /** PBM Payment related & end to end tests */
  describe('PBM Payment Core Test', async () => {
    
    it('Only owner should be able to mint unbacked PBM tokens', async () => {
    });
    it('PBM should call swap on NoahPBM if inadequate payment currency', async () => {});
    it('PBM should be able to combine various PBM types in accordance to combination logic', async () => {});

  });



});

