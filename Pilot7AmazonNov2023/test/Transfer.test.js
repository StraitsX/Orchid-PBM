const { ethers } = require('hardhat');
const { expect } = require('chai');
async function deploy(name, ...params) {
    const Contract = await ethers.getContractFactory(name);
    return await Contract.deploy(...params).then((f) => f.deployed());
}
describe('Transfer', async () => {
    let pbmInstance,
        owner,
        customerWallet,
        fundDisbursementAddr,
        recipientWallet,
        spotInstance,
        orderValue;
    beforeEach(async () => {
        // Deploy PBM and initialise
        [owner, customerWallet, fundDisbursementAddr, recipientWallet] =
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

    it('transfer ', async () => {
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

        const beforeBalance = await pbmInstance.getUserBalance(
            customerWallet.address,
            1,
        );
        expect(beforeBalance.walletBalance.toString()).to.equal(
            ethers.utils.parseUnits('20', await spotInstance.decimals()).toString(),
        );
        expect(beforeBalance.availableBalance.toString()).to.equal(
            ethers.utils.parseUnits('5', await spotInstance.decimals()).toString(),
        );

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

        await pbmInstance.connect(customerWallet).safeTransferFrom(customerWallet.address, recipientWallet.address, 1, 1, "0x");
        const afterBalance = await pbmInstance.getUserBalance(
            customerWallet.address,
            1,
        );
        expect(afterBalance.walletBalance.toString()).to.equal(
            ethers.utils.parseUnits('15', await spotInstance.decimals()).toString(),
        );
        expect(afterBalance.availableBalance.toString()).to.equal(
            ethers.utils.parseUnits('0', await spotInstance.decimals()).toString(),
        );

        const recipientAfterBalance = await pbmInstance.getUserBalance(
            recipientWallet.address,
            1,
        );
        expect(recipientAfterBalance.walletBalance.toString()).to.equal(
            ethers.utils.parseUnits('5', await spotInstance.decimals()).toString(),
        );
        expect(recipientAfterBalance.availableBalance.toString()).to.equal(
            ethers.utils.parseUnits('5', await spotInstance.decimals()).toString(),
        );
    });

});
