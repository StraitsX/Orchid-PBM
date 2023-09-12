const { ethers } = require('hardhat');
const { expect } = require('chai');
async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}
describe('Transfer', async () => {
  let pbmInstance,
    owner,
    orchestratorWallet,
    customerWallet,
    customer2Wallet,
    fundDisbursementAddr,
    recipientWallet,
    spotInstance,
    orderValue;
  beforeEach(async () => {
    // Deploy PBM and initialise
    [
      owner,
      orchestratorWallet,
      customerWallet,
      customer2Wallet,
      fundDisbursementAddr,
      recipientWallet,
    ] = await ethers.getSigners();
    pbmInstance = await deploy('PBM');
    spotInstance = await deploy('Spot', 'XSGD', 'XSGD', 6);

    let currentDate = new Date();
    let currentEpoch = Math.floor(currentDate / 1000);
    let expectedExpiry = currentEpoch + 100000; // Expiry is set to 1 day 3.6 hours from current time
    orderValue = ethers.utils.parseUnits('15', await spotInstance.decimals());
    await pbmInstance.initialise(spotInstance.address, expectedExpiry);

    // Whitelist orchestratorWallet
    await pbmInstance.addToWhitelist(orchestratorWallet.address);

    const spotTokenAmount = ethers.utils.parseUnits(
      '20',
      await spotInstance.decimals(),
    );
    // create token id 1
    await pbmInstance.createPBMTokenType(
      spotTokenAmount,
      expectedExpiry,
      'tokenUIR',
      'expriedURI',
    );
    const transferAmount = spotTokenAmount * 5;

    // mint spot to user
    await spotInstance.mint(owner.address, transferAmount);

    // mint token id 1 to customerWallet
    await pbmInstance.mint(1, 5, orchestratorWallet.address);
    await spotInstance.increaseAllowance(pbmInstance.address, transferAmount);
    await pbmInstance.addUserBalance(
      1,
      transferAmount,
      orchestratorWallet.address,
    );
  });

  it('orchestrator transfer to a recipient wallet without the bank account creates an account for the user and add user balance to it', async () => {
    const beforeBalance = await pbmInstance.getUserBalance(
      orchestratorWallet.address,
      1,
    );
    expect(beforeBalance.walletBalance.toString()).to.equal(
      ethers.utils.parseUnits('100', await spotInstance.decimals()).toString(),
    );
    expect(beforeBalance.availableBalance.toString()).to.equal(
      ethers.utils.parseUnits('100', await spotInstance.decimals()).toString(),
    );
    expect(await pbmInstance.balanceOf(orchestratorWallet.address, 1)).to.equal(5);
    expect(await pbmInstance.balanceOf(recipientWallet.address, 1)).to.equal(0);

    const recipientBeforeBalance = await pbmInstance.getUserBalance(
      recipientWallet.address,
      1,
    );
    expect(recipientBeforeBalance.walletBalance.toString()).to.equal(
      ethers.utils.parseUnits('0', await spotInstance.decimals()).toString(),
    );
    expect(recipientBeforeBalance.availableBalance.toString()).to.equal(
      ethers.utils.parseUnits('0', await spotInstance.decimals()).toString(),
    );

    await pbmInstance
      .connect(orchestratorWallet)
      .safeTransferFrom(
        orchestratorWallet.address,
        recipientWallet.address,
        1,
        ethers.utils.parseUnits('20', await spotInstance.decimals()),
        '0x',
      );
    const afterBalance = await pbmInstance.getUserBalance(
      orchestratorWallet.address,
      1,
    );
    expect(afterBalance.walletBalance.toString()).to.equal(
      ethers.utils.parseUnits('80', await spotInstance.decimals()).toString(),
    );
    expect(afterBalance.availableBalance.toString()).to.equal(
      ethers.utils.parseUnits('80', await spotInstance.decimals()).toString(),
    );

    const recipientAfterBalance = await pbmInstance.getUserBalance(
      recipientWallet.address,
      1,
    );
    expect(recipientAfterBalance.walletBalance.toString()).to.equal(
      ethers.utils.parseUnits('20', await spotInstance.decimals()).toString(),
    );
    expect(recipientAfterBalance.availableBalance.toString()).to.equal(
      ethers.utils.parseUnits('20', await spotInstance.decimals()).toString(),
    );
    expect(await pbmInstance.balanceOf(orchestratorWallet.address, 1)).to.equal(4);
    expect(await pbmInstance.balanceOf(recipientWallet.address, 1)).to.equal(1);
  });

  it('orchestrator transfer to a recipient wallet with the bank account adds balance to it', async () => {
    const beforeBalance = await pbmInstance.getUserBalance(
        orchestratorWallet.address,
        1,
    );
    expect(beforeBalance.walletBalance.toString()).to.equal(
        ethers.utils.parseUnits('100', await spotInstance.decimals()).toString(),
    );
    expect(beforeBalance.availableBalance.toString()).to.equal(
        ethers.utils.parseUnits('100', await spotInstance.decimals()).toString(),
    );

    // mint token id 1 to recipientWallet
    await pbmInstance.mint(1, 1, recipientWallet.address);
    expect(await pbmInstance.balanceOf(orchestratorWallet.address, 1)).to.equal(5);
    expect(await pbmInstance.balanceOf(recipientWallet.address, 1)).to.equal(1);

    const recipientBeforeBalance = await pbmInstance.getUserBalance(
        recipientWallet.address,
        1,
    );
    expect(recipientBeforeBalance.walletBalance.toString()).to.equal(
        ethers.utils.parseUnits('0', await spotInstance.decimals()).toString(),
    );
    expect(recipientBeforeBalance.availableBalance.toString()).to.equal(
        ethers.utils.parseUnits('0', await spotInstance.decimals()).toString(),
    );

    await pbmInstance
        .connect(orchestratorWallet)
        .safeTransferFrom(
            orchestratorWallet.address,
            recipientWallet.address,
            1,
            ethers.utils.parseUnits('20', await spotInstance.decimals()),
            '0x',
        );
    const afterBalance = await pbmInstance.getUserBalance(
        orchestratorWallet.address,
        1,
    );
    expect(afterBalance.walletBalance.toString()).to.equal(
        ethers.utils.parseUnits('80', await spotInstance.decimals()).toString(),
    );
    expect(afterBalance.availableBalance.toString()).to.equal(
        ethers.utils.parseUnits('80', await spotInstance.decimals()).toString(),
    );

    const recipientAfterBalance = await pbmInstance.getUserBalance(
        recipientWallet.address,
        1,
    );
    expect(recipientAfterBalance.walletBalance.toString()).to.equal(
        ethers.utils.parseUnits('20', await spotInstance.decimals()).toString(),
    );
    expect(recipientAfterBalance.availableBalance.toString()).to.equal(
        ethers.utils.parseUnits('20', await spotInstance.decimals()).toString(),
    );

    // recipientWallet still only has 1 token id 1 after transfer
    expect(await pbmInstance.balanceOf(orchestratorWallet.address, 1)).to.equal(5);
    expect(await pbmInstance.balanceOf(recipientWallet.address, 1)).to.equal(1);
  });
});
