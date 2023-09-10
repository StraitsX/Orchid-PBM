const { ethers, waffle } = require('hardhat');
const { expect } = require('chai');

let PBM, pbmInstance, Spot, spotInstance, owner, addr1, addr2;

describe('PBM Deployment', function () {
  it('Should deploy PBM contract', async function () {
    PBM = await ethers.getContractFactory('PBM');
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    pbmInstance = await PBM.deploy();
    expect(pbmInstance.address).to.properAddress;
  });

  it('Should deploy Spot contract', async function () {
    Spot = await ethers.getContractFactory('Spot');
    spotInstance = await Spot.deploy();
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

  it('should allow owner to remove an address from whitelist', async () => {
    await pbmInstance.removeFromWhitelist(addr1.address);
    const isWhitelisted = await pbmInstance.whitelist(addr1.address);
    expect(isWhitelisted).to.be.false;
  });
});
