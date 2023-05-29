const { assert, expect } = require('chai');
const { ethers} = require("hardhat");
async function deploy(name, ...params) {
    const Contract = await ethers.getContractFactory(name);
    return await Contract.deploy(...params).then(f => f.deployed());
}

describe("PBM", async () => {
    const accounts = [];

    before(async ()=>{
        (await ethers.getSigners()).forEach((signer,index) => {
            accounts[index] = signer;
        });
    });

    async function init() {
        let spot = await deploy("Spot");
        let pbm = await deploy("PBM");
        let addressList = await deploy("PBMAddressList");
        await pbm.initialise(spot.address, Math.round(new Date().getTime() / 1000 + 86400 * 30), addressList.address);
        return [spot, pbm, addressList];
    }


    describe("PBM and Spot Set up test", async () => {
        let spot;
        let pbm;
        let addressList;

        before(async () => {
            let [_spot, _pbm, _addressList] = await init();
            spot = _spot;
            pbm = _pbm;
            addressList = _addressList
        })

        it('Should deploy smart contract', async () => {
            assert(pbm.address !== '');
            assert(spot.address !== '');
            assert(addressList.address !== '');
        });

        it('PBM Should initialized with Spot token address', async () => {
            var pbm_spot = await pbm.spotToken();
            assert.equal(spot.address, pbm_spot);
        });

    });

    describe("PBM minting test", async () => {
        let spot = null;
        let pbm = null;

        before(async () => {
            let [_spot, _pbm] = await init();
            spot = _spot;
            pbm = _pbm;
        })

        it('Minting before non existing token type throws an error', async () => {
            await expect(pbm.mint(0, 1, accounts[0].address)).to.be.revertedWith("PBM: Invalid Token Id(s)");
        });

        it('Create token type successfully', async () => {
            let currentDate = new Date();
            let currentEpoch = Math.floor(currentDate / 1000);
            let targetEpoch = currentEpoch + 100000; // Expiry is set to 1 day 3.6 hours from current time
            const pbmTokenManagerAddress = await pbm.pbmTokenManager();
            const PBMTokenManagerContract = await ethers.getContractFactory("PBMTokenManager");
            const pbmTokenManager = await PBMTokenManagerContract.attach(pbmTokenManagerAddress);

            // listen to pbmTokenManager contract for the NewPBMTypeCreated event
            let filter = pbmTokenManager.filters.NewPBMTypeCreated();
            await pbm.createPBMTokenType('STXDiscount5', 5, targetEpoch, accounts[0].address, 'beforeExpiryURI', 'postExpiryURI');
            let events = await pbmTokenManager.queryFilter(filter);
            expect(events.length).to.equal(1);

            let tokenDetails = await pbm.getTokenDetails(0);
            assert.equal(tokenDetails['0'], 'STXDiscount55');
            assert.equal(tokenDetails['1'].toString(), '5');
            assert.equal(tokenDetails['2'], targetEpoch);
            assert.equal(tokenDetails['3'], accounts[0].address.toString());
        })

        it('Minting a PBM envelope token successfully', async () => {
            await pbm.mint(0, 1, accounts[0].address);
            let balance = await pbm.balanceOf(accounts[0].address, 0);
            assert.equal(balance.toString(), '1');
        });

        it('Create another 2 new token types and batch mint successfully', async() => {
            let currentDate = new Date();
            let currentEpoch = Math.floor(currentDate / 1000);
            let targetEpoch = currentEpoch + 100000
            await pbm.createPBMTokenType('STX10Discount', 10, targetEpoch, accounts[0].address, 'beforeExpiryURI', 'postExpiryURI');
            await pbm.createPBMTokenType('STX15Discount', 15, targetEpoch, accounts[0].address, 'beforeExpiryURI', 'postExpiryURI');
            await pbm.batchMint([1,2], [2,4], accounts[0].address);
            let balanceOfToken1 = await pbm.balanceOf(accounts[0].address, 1);
            let balanceOfToken2 = await pbm.balanceOf(accounts[0].address, 2);
            assert.equal(balanceOfToken1.toString(), '2');
            assert.equal(balanceOfToken2.toString(), '4');
        });
    });


})