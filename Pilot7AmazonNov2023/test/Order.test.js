const { ethers } = require('hardhat');
const { expect } = require('chai');
async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}
describe('Order Management', async () => {
  let pbmInstance,
    owner,
    orchestratorWallet,
    customerWallet,
    customer2Wallet,
    fundDisbursementAddr,
    addrs,
    spotInstance,
    orderValue,
    orderId,
    orderIdHash,
    spotTokenAmount;
  beforeEach(async () => {
    // Deploy PBM and initialise
    [
      owner,
      orchestratorWallet,
      customerWallet,
      customer2Wallet,
      fundDisbursementAddr,
      ...addrs
    ] = await ethers.getSigners();
    pbmInstance = await deploy('PBM');
    spotInstance = await deploy('Spot', 'XSGD', 'XSGD', 6);

    let currentDate = new Date();
    let currentEpoch = Math.floor(currentDate / 1000);
    let expectedExpiry = currentEpoch + 100000; // Expiry is set to 1 day 3.6 hours from current time
    orderValue = ethers.utils.parseUnits('10', await spotInstance.decimals());
    orderId = 'order1';
    orderIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(orderId));
    await pbmInstance.initialise(spotInstance.address, expectedExpiry);

    // Whitelist addr1
    await pbmInstance.addToWhitelist(orchestratorWallet.address);

    spotTokenAmount = ethers.utils.parseUnits(
      '10',
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
    await spotInstance.mint(owner.address, spotTokenAmount * 10000);

    // mint token id 1 to customerWallet
    await pbmInstance.mint(1, 1, customerWallet.address);
    await spotInstance.increaseAllowance(pbmInstance.address, spotTokenAmount);
    await pbmInstance.addUserBalance(
      1,
      spotTokenAmount,
      customerWallet.address,
    );

    const balance = await pbmInstance.getUserBalance(customerWallet.address, 1);
    expect(balance.walletBalance.toString()).to.equal(
      ethers.utils.parseUnits('10', await spotInstance.decimals()).toString(),
    );
    expect(balance.availableBalance.toString()).to.equal(
      ethers.utils.parseUnits('10', await spotInstance.decimals()).toString(),
    );
  });

  describe('Order Creation', async () => {
    it('should not allow non-whitelisted address / non PBM owner to create an order', async () => {
      await expect(
        pbmInstance
          .connect(owner)
          .createOrder(
            customerWallet.address,
            1,
            orderId,
            orderValue,
            fundDisbursementAddr.address,
          ),
      ).to.be.revertedWith(
        'Caller is not token owner or approved to create order on behalf of user',
      );
    });
    it('should not allow whitelisted address without approval to create an order', async () => {
      await expect(
        pbmInstance
          .connect(orchestratorWallet)
          .createOrder(
            customerWallet.address,
            1,
            orderId,
            orderValue,
            fundDisbursementAddr.address,
          ),
      ).to.be.revertedWith(
        'Caller is not token owner or approved to create order on behalf of user',
      );
    });
    it('should allow whitelisted address to create an order with user approval', async () => {
      // customer wallet set approval for orchestrator to create order
      await pbmInstance
        .connect(customerWallet)
        .setApprovalForAll(orchestratorWallet.address, true);
      const orderId = 'order1';
      const tx = await pbmInstance
        .connect(orchestratorWallet)
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

      const order = await pbmInstance.getOrder(orderId);
      expect(order.orderValue).to.equal(orderValue);
      expect(order.status).to.equal(0); // 0 = PENDING
      const afterBalance = await pbmInstance.getUserBalance(
        customerWallet.address,
        1,
      );
      expect(afterBalance.walletBalance.toString()).to.equal(
        ethers.utils.parseUnits('10', await spotInstance.decimals()).toString(),
      );
      expect(afterBalance.availableBalance.toString()).to.equal(
        ethers.utils.parseUnits('0', await spotInstance.decimals()).toString(),
      );
    });

    it('should allow whitelisted address to create order for grab wallet without grab user approval', async () => {
      // mint token id 1 to customer2Wallet grab wallet
      const grabWallet = customer2Wallet;
      await pbmInstance.mint(1, 1, grabWallet.address);
      await spotInstance.increaseAllowance(
        pbmInstance.address,
        spotTokenAmount,
      );
      await pbmInstance.addUserBalance(1, spotTokenAmount, grabWallet.address);
      const tx = await pbmInstance
        .connect(orchestratorWallet)
        .createOrderGrab(
          grabWallet.address,
          1,
          orderId,
          orderValue,
          fundDisbursementAddr.address,
        );
      await tx.wait();

      const order = await pbmInstance.orders(orderIdHash);
      expect(order.orderValue).to.equal(orderValue);
      expect(order.status).to.equal(0); // 0 = PENDING
      const afterBalance = await pbmInstance.getUserBalance(
        grabWallet.address,
        1,
      );
      expect(afterBalance.walletBalance.toString()).to.equal(
        ethers.utils.parseUnits('10', await spotInstance.decimals()).toString(),
      );
      expect(afterBalance.availableBalance.toString()).to.equal(
        ethers.utils.parseUnits('0', await spotInstance.decimals()).toString(),
      );
    });
  });

  describe('Order Redemption & cancellation', async () => {
    beforeEach(async () => {
      await pbmInstance
        .connect(customerWallet)
        .setApprovalForAll(orchestratorWallet.address, true);
      // create order
      const createTx = await pbmInstance
        .connect(orchestratorWallet)
        .createOrder(
          customerWallet.address,
          1,
          orderId,
          orderValue,
          fundDisbursementAddr.address,
        );
      await createTx.wait();
    });

    it('should not allow non whitelisted address to redeem an order', async () => {
      await expect(
        pbmInstance
          .connect(owner)
          .redeemOrder(orderId, 1, customerWallet.address),
      ).to.be.revertedWith('You are not authorized to call this function');
    });
    it('should allow whitelisted address to redeem an order', async () => {
      const redeemTx = await pbmInstance
        .connect(orchestratorWallet)
        .redeemOrder(orderId, 1, customerWallet.address); // assuming orderValue is needed to identify the order
      await redeemTx.wait();

      const redeemedOrder = await pbmInstance.getOrder(orderId);
      expect(redeemedOrder.status).to.equal(1); // 1 = REDEEMED
      const afterBalance = await pbmInstance.getUserBalance(
        customerWallet.address,
        1,
      );
      expect(afterBalance.walletBalance.toString()).to.equal(
        ethers.utils.parseUnits('0', await spotInstance.decimals()).toString(),
      );
      expect(afterBalance.availableBalance.toString()).to.equal(
        ethers.utils.parseUnits('0', await spotInstance.decimals()).toString(),
      );
      expect(
        (await spotInstance.balanceOf(fundDisbursementAddr.address)).toString(),
      ).to.equal(
        ethers.utils.parseUnits('10', await spotInstance.decimals()).toString(),
      );
    });

    it('should allow whitelisted address to cancel an order', async () => {
      const cancelTx = await pbmInstance
        .connect(orchestratorWallet)
        .cancelOrder(orderId, 1);
      await cancelTx.wait();

      const cancelOrder = await pbmInstance.orders(orderIdHash);
      expect(cancelOrder.status).to.equal(2); // 2 = CANCELLED
      const afterBalance = await pbmInstance.getUserBalance(
        customerWallet.address,
        1,
      );
      expect(afterBalance.walletBalance.toString()).to.equal(
        ethers.utils.parseUnits('10', await spotInstance.decimals()).toString(),
      );
      expect(afterBalance.availableBalance.toString()).to.equal(
        ethers.utils.parseUnits('10', await spotInstance.decimals()).toString(),
      );
    });
  });
});
