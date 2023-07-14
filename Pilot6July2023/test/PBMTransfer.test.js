const { assert, expect } = require('chai');
const { ethers } = require('hardhat');

// Helper functions
async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}

const getSigners = async () => {
  return await ethers.getSigners();
};

const parseUnits = (value, decimals) => {
  return ethers.utils.parseUnits(value, decimals);
};

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
      await create1XSGDPBM();
      await whilteListMerchant([
        merchant1.address,
        merchant2.address,
        merchant3.address,
      ]);
      await mintPBM(owner.address, 1);
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

    async function create1XSGDPBM() {
      let currentDate = new Date();
      let currentEpoch = Math.floor(currentDate / 1000);
      let targetEpoch = currentEpoch + 100000; // Expiry is set to 1 day 3.6 hours from current time

      await pbm.createPBMTokenType(
        'Test-1XSGD',
        ethers.utils.parseUnits('1', 6),
        targetEpoch,
        owner.address,
        'beforeExpiryURI',
        'postExpiryURI',
      );

      let tokenDetails = await pbm.getTokenDetails(0);

      assert.equal(tokenDetails['0'], 'Test-1XSGD1000000');
      assert.equal(tokenDetails['1'].toString(), '1000000');
      assert.equal(tokenDetails['2'], targetEpoch);
      assert.equal(tokenDetails['3'], accounts[0].address.toString());
    }

    async function mintPBM(to, amount) {
      await spot.increaseAllowance(
        pbm.address,
        ethers.utils.parseUnits('1', 6),
      );
      await pbm.mint(0, amount, to);
    }

    async function whilteListMerchant(addresses) {
      await addressList.addMerchantAddresses(addresses, '');
      for (let i = 0; i < addresses.length; i++) {
        let isMerchant = await addressList.isMerchant(addresses[i]);
        assert.equal(isMerchant, true);
      }
    }
  });
});
