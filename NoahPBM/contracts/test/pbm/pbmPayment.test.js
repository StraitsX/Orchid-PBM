const { expect } = require('chai');
const { ethers } = require('hardhat');
const { deploy, initPBM, parseUnits } = require('./testHelper.js');

describe('PBMPaymentTest', async () => {
  const accounts = [];

  before(async () => {
    (await ethers.getSigners()).forEach((signer, index) => {
      accounts[index] = signer;
    });
  });

  async function init() {
    // let xsgdToken = await deploy('Spot', 'XSGD', 'XSGD', 6);
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

  describe('PBM Payment Core Test', async () => {
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

    
    it('Only owner should be able to mint unbacked PBM tokens', async () => {});
    it('PBM should call swap on NoahPBM if inadequate payment currency', async () => {});
    it('PBM should be able to combine various PBM types in accordance to combination logic', async () => {});

  });

  describe('Noah PBM Core Test', async () => {
    
    it('Should ensure that only campaign PBM can spend its own money', async () => {});
    
    // required to ensure admin roles are not hijacked
    it('Should ensure that only Noah PBM can only be init once', async () => {});

    it('Should ensure payments can only be created if enough funding', async () => {});

    it('Should ensure ERC20 balance and treasury balance are NOT changed after payment Created', async () => {});
    it('Should ensure ERC20 balance and treasury balance are NOT changed after payment Cancelled', async () => {});

    it('Should ensure ERC20 balance and treasury balance are updated after payment COMPLETED', async () => {});
    it('Should ensure ERC20 balance and treasury balance are updated after payment Refunded', async () => {});

    it('Should ensure ERC20 balance and treasury balance are updated after payment Refunded', async () => {});


    describe('Payment Created Test', async () => {

      it('Should ensure pbm balance is moved to pending balance upon PaymentCreated event', async () => {});


    });


    describe('Payment Cancel Test', async () => {

      it('Should ensure pbm pending balance is moved back to pbm balance upon PaymentCreated event', async () => {});


    });
    
    

  });





});

