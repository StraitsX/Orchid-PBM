const { ethers } = require('hardhat');
const { expect } = require('chai');
async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}
describe('Order Management', async () => {
  let pbmInstance,
    owner,
    customerWallet,
    fundDisbursementAddr,
    addrs,
    spotInstance,
    orderValue;
  beforeEach(async () => {
    // Deploy PBM and initialise
    [owner, customerWallet, fundDisbursementAddr, ...addrs] =
      await ethers.getSigners();
    pbmInstance = await deploy('PBM');
    spotInstance = await deploy('Spot');

    let currentDate = new Date();
    let currentEpoch = Math.floor(currentDate / 1000);
    let expectedExpiry = currentEpoch + 100000; // Expiry is set to 1 day 3.6 hours from current time
    orderValue = ethers.utils.parseUnits('15', await spotInstance.decimals());
    await pbmInstance.initialise(spotInstance.address, expectedExpiry);

    // Whitelist addr1
    await pbmInstance.addToWhitelist(owner.address);

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

    // mint spot to user
    await spotInstance.mint(owner.address, spotTokenAmount);

    // mint token id 1 to customerWallet
    await spotInstance.increaseAllowance(pbmInstance.address, spotTokenAmount);
    await pbmInstance.mint(1, 1, customerWallet.address);
  });

  it('should allow whitelisted address to create an order', async () => {
    const balance = await pbmInstance.getUserBalance(customerWallet.address, 1);
    expect(balance.walletBalance.toString()).to.equal(
      ethers.utils.parseUnits('20', await spotInstance.decimals()).toString(),
    );
    expect(balance.availableBalance.toString()).to.equal(
      ethers.utils.parseUnits('20', await spotInstance.decimals()).toString(),
    );
    const orderId = 'order1';
    const tx = await pbmInstance
      .connect(owner)
      .createOrder(
        customerWallet.address,
        1,
        orderId,
        orderValue,
        fundDisbursementAddr.address,
      );
    await tx.wait();

    const orderIdHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(orderId),
    );

    const order = await pbmInstance.orders(orderIdHash);
    expect(order.orderValue).to.equal(orderValue);
    expect(order.status).to.equal(0); // 0 = PENDING
    const afterBalance = await pbmInstance.getUserBalance(
      customerWallet.address,
      1,
    );
    expect(afterBalance.walletBalance.toString()).to.equal(
      ethers.utils.parseUnits('20', await spotInstance.decimals()).toString(),
    );
    expect(afterBalance.availableBalance.toString()).to.equal(
      ethers.utils.parseUnits('5', await spotInstance.decimals()).toString(),
    );
  });

  it('should allow whitelisted address to redeem an order', async () => {
    // create order
    const orderId = 'order2';
    const createTx = await pbmInstance
      .connect(owner)
      .createOrder(
        customerWallet.address,
        1,
        orderId,
        orderValue,
        fundDisbursementAddr.address,
      );
    await createTx.wait();

    const orderIdHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(orderId),
    );

    const redeemTx = await pbmInstance
      .connect(owner)
      .redeemOrder(orderId, 1, customerWallet.address); // assuming orderValue is needed to identify the order
    await redeemTx.wait();

    const redeemedOrder = await pbmInstance.orders(orderIdHash);
    expect(redeemedOrder.status).to.equal(1); // 1 = REDEEMED
    const afterBalance = await pbmInstance.getUserBalance(
      customerWallet.address,
      1,
    );
    expect(afterBalance.walletBalance.toString()).to.equal(
      ethers.utils.parseUnits('5', await spotInstance.decimals()).toString(),
    );
    expect(afterBalance.availableBalance.toString()).to.equal(
      ethers.utils.parseUnits('5', await spotInstance.decimals()).toString(),
    );
    expect(
      (await spotInstance.balanceOf(fundDisbursementAddr.address)).toString(),
    ).to.equal(
      ethers.utils.parseUnits('15', await spotInstance.decimals()).toString(),
    );
  });

  it('should allow whitelisted address to cancel an order', async () => {
    // create order
    const orderId = 'order3';
    const createTx = await pbmInstance
      .connect(owner)
      .createOrder(
        customerWallet.address,
        1,
        orderId,
        orderValue,
        fundDisbursementAddr.address,
      );
    await createTx.wait();

    const orderIdHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(orderId),
    );
    const cancelTx = await pbmInstance.connect(owner).cancelOrder(orderId, 1);
    await cancelTx.wait();

    const cancelOrder = await pbmInstance.orders(orderIdHash);
    expect(cancelOrder.status).to.equal(2); // 2 = CANCELLED
    const afterBalance = await pbmInstance.getUserBalance(
      customerWallet.address,
      1,
    );
    expect(afterBalance.walletBalance.toString()).to.equal(
      ethers.utils.parseUnits('20', await spotInstance.decimals()).toString(),
    );
    expect(afterBalance.availableBalance.toString()).to.equal(
      ethers.utils.parseUnits('20', await spotInstance.decimals()).toString(),
    );
  });
});
