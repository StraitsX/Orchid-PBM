const { ethers, waffle } = require('hardhat');
const { expect } = require('chai');
async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}

let PBM, pbmInstance, Spot, spotInstance, owner, addr1, addr2;

describe('PBM Deployment', function () {
  it('Should deploy PBM contract', async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    pbmInstance = await deploy('PBM');
    expect(pbmInstance.address).to.properAddress;
  });

  it('Should deploy Spot contract', async function () {
    spotInstance = await deploy('Spot', 'XSGD', 'XSGD', 6);
    expect(spotInstance.address).to.properAddress;
  });
});

describe('Initialisation', function () {
  it('should properly initialise with the correct parameters', async () => {
    let currentDate = new Date();
    let currentEpoch = Math.floor(currentDate / 1000);
    let expectedExpiry = currentEpoch + 100000; // Expiry is set to 1 day 3.6 hours from current time
    await pbmInstance.initialise(spotInstance.address, expectedExpiry);
    const spotToken = await pbmInstance.spotToken();
    expect(spotToken).to.equal(spotInstance.address);

    const expiry = await pbmInstance.contractExpiry();
    expect(expiry).to.equal(expectedExpiry);
  });
});

describe('Whitelisting', function () {
  it('should allow owner to whitelist an address', async () => {
    await pbmInstance.addToWhitelist(addr1.address);
    const isWhitelisted = await pbmInstance.whitelist(addr1.address);
    expect(isWhitelisted).to.be.true;
  });

  it('should not allow non-owner to whitelist an address', async () => {
    await expect(
      pbmInstance.connect(addr1).addToWhitelist(addr2.address),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('should allow owner to remove an address from whitelist', async () => {
    await pbmInstance.removeFromWhitelist(addr1.address);
    const isWhitelisted = await pbmInstance.whitelist(addr1.address);
    expect(isWhitelisted).to.be.false;
  });

  it('should not allow non-owner to remove an address from whitelist', async () => {
    await expect(
      pbmInstance.connect(addr1).removeFromWhitelist(addr2.address),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });
});

describe('Admin operations', function () {
  describe('Admin burn', function () {
    let pbmInstance,
      spotInstance,
      owner,
      addr1,
      addr2,
      spotTokenAmount,
      spotDecimals;

    beforeEach(async function () {
      [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
      pbmInstance = await deploy('PBM');
      spotInstance = await deploy('Spot', 'XSGD', 'XSGD', 6);

      let currentDate = new Date();
      let currentEpoch = Math.floor(currentDate / 1000);
      let expectedExpiry = currentEpoch + 100000;

      await pbmInstance.initialise(spotInstance.address, expectedExpiry);

      spotDecimals = await spotInstance.decimals();
      spotTokenAmount = ethers.utils.parseUnits('10', spotDecimals);
      // create token id 1
      await pbmInstance.createPBMTokenType(
        spotTokenAmount,
        expectedExpiry,
        'tokenUIR',
        'expriedURI',
      );

      // mint spot to user
      await spotInstance.mint(owner.address, spotTokenAmount * 10000);

      // mint PBM token to addr1
      await pbmInstance.mint(1, 1, addr1.address);
      await spotInstance.increaseAllowance(
        pbmInstance.address,
        spotTokenAmount,
      );
      await pbmInstance.addUserBalance(1, spotTokenAmount, addr1.address);
      const balance = await pbmInstance.getUserBalance(addr1.address, 1);
      expect(balance.walletBalance.toString()).to.equal(
        ethers.utils.parseUnits('10', spotDecimals).toString(),
      );
      expect(balance.availableBalance.toString()).to.equal(
        ethers.utils.parseUnits('10', spotDecimals).toString(),
      );
    });
    it('should allow contract owner to burn tokens', async () => {
      await pbmInstance.adminBurn(addr1.address, 1, 1);
      const balance = await pbmInstance.balanceOf(addr1.address, 1);
      expect(balance).to.equal(0);
      expect(
        (
          await pbmInstance.getUserBalance(addr1.address, 1)
        ).walletBalance.toString(),
      ).to.equal(ethers.utils.parseUnits('0', spotDecimals).toString());
      expect(
        (
          await pbmInstance.getUserBalance(addr1.address, 1)
        ).availableBalance.toString(),
      ).to.equal(ethers.utils.parseUnits('0', spotDecimals).toString());
    });

    it('should not allow contract owner to burn tokens if balance is insufficient', async () => {
      await expect(
        pbmInstance.adminBurn(addr1.address, 1, 2),
      ).to.be.revertedWith('ERC1155: burn amount exceeds balance');
    });

    it('should not allow non-owner to burn tokens', async () => {
      await expect(
        pbmInstance.connect(addr2).adminBurn(addr1.address, 1, 1),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});
