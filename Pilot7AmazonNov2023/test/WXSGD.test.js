const { ethers } = require('hardhat');
const { expect } = require('chai');
async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}

describe('WXSGD', function () {
  let WXSGD, xsgdToken, owner, addr1, addr2;

  beforeEach(async function () {
    // deploy XSGD token
    xsgdToken = await deploy('Spot', 'XSGD', 'XSGD', 6);
    await xsgdToken.deployed();

    // deploy WXSGD with the XSGD token address
    WXSGD = await deploy('WXSGD', xsgdToken.address);
    await WXSGD.deployed();

    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
  });

  describe('Deployment', function () {
    it('Should set the correct XSGD token address', async function () {
      expect(await WXSGD.xsgdToken()).to.equal(xsgdToken.address);
    });
  });

  describe('Wrap & Unwrap', function () {
    beforeEach(async function () {
      await xsgdToken.mint(owner.address, 1000);
    });

    it('Should wrap XSGD to WXSGD', async function () {
      await xsgdToken.approve(WXSGD.address, 1000);
      await WXSGD.wrap(500);
      expect(await WXSGD.balanceOf(owner.address)).to.equal(500);
      expect(await xsgdToken.balanceOf(owner.address)).to.equal(500);
    });

    it('Should not wrap XSGD to WXSGD if insufficient balance', async function () {
      await xsgdToken.approve(WXSGD.address, 1000);
      await expect(WXSGD.wrap(1500)).to.be.revertedWith(
        'ERC20: Insufficient balance or approval',
      );
    });

    it('Should not wrap XSGD to WXSGD if no approval', async function () {
      await expect(WXSGD.wrap(500)).to.be.revertedWith(
        'ERC20: Insufficient balance or approval',
      );
    });

    it('Should not wrap XSGD to WXSGD if not owner', async function () {
      await xsgdToken.approve(WXSGD.address, 1000);
      await expect(WXSGD.connect(addr1).wrap(500)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });

    it('Should unwrap WXSGD to XSGD', async function () {
      await xsgdToken.approve(WXSGD.address, 1000);
      await WXSGD.wrap(500);
      await WXSGD.unwrap(500);
      expect(await WXSGD.balanceOf(owner.address)).to.equal(0);
      expect(await xsgdToken.balanceOf(owner.address)).to.equal(1000);
    });

    it('Should not unwrap WXSGD to XSGD if insufficient balance', async function () {
      await xsgdToken.approve(WXSGD.address, 1000);
      await WXSGD.wrap(500);
      await expect(WXSGD.unwrap(600)).to.be.revertedWith(
        'ERC20: burn amount exceeds balance',
      );
    });

    it('Should not unwrap WXSGD to XSGD if not owner', async function () {
      await xsgdToken.approve(WXSGD.address, 1000);
      await WXSGD.wrap(500);
      await expect(WXSGD.connect(addr1).unwrap(500)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  describe('Recover ERC20', function () {
    beforeEach(async function () {
      this.spot = await deploy('Spot', 'Spot', 'Spot', 6);
      await this.spot.deployed();
      await this.spot.mint(owner.address, 1000);
      await this.spot.transfer(WXSGD.address, 500);
      expect(await this.spot.balanceOf(owner.address)).to.equal(500);
      expect(await this.spot.balanceOf(WXSGD.address)).to.equal(500);
    });

    it('Should recover ERC20', async function () {
      await WXSGD.recoverERC20(this.spot.address);

      expect(await this.spot.balanceOf(WXSGD.address)).to.equal(0);
      expect(await this.spot.balanceOf(owner.address)).to.equal(1000);
    });

    it('Should not recover ERC20 if not owner', async function () {
      await expect(
        WXSGD.connect(addr1).recoverERC20(this.spot.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});
