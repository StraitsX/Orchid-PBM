const { assert, expect } = require('chai');
const { ethers } = require('hardhat');
const { deploy, initPBM, parseUnits, createTokenType } = require('./testHelper.js');


async function init() {
  let xsgdToken = await deploy('Spot', 'XSGD', 'XSGD', 6);
  let bsgdToken = await deploy('Spot', 'BSGD', 'BSGD', 6);

  let noahPaymentManager = await deploy('NoahPaymentManager');
  let pbm = await deploy('PBMPayment');
  let addressList = await deploy('PBMMerchantAddressList');

  return [xsgdToken, bsgdToken, noahPaymentManager, pbm, addressList]
}

describe('PBMPayment Test', async () => {
  /** Initialise Wallet Addresses */
  const accounts = [];

  before(async () => {
    (await ethers.getSigners()).forEach((signer, index) => {
      accounts[index] = signer;
    });
  });

  /** Initialise Smart contracts Required for tests. */
  let xsgdToken;
  let bsgdToken;
  let noahPaymentManager;
  let pbm;
  let addressList;

  beforeEach(async () => {
    [xsgdToken, bsgdToken, noahPaymentManager, pbm, addressList] = await init();

    // Init accts with spot tokens
    await xsgdToken.mint(accounts[0].address, parseUnits('10000', await xsgdToken.decimals()));
    await xsgdToken.mint(accounts[1].address, parseUnits('10000', await xsgdToken.decimals()));

    await pbm.initialise(
      Math.round(new Date().getTime() / 1000 + 86400 * 30),
      addressList.address,
      noahPaymentManager.address
    )

  });

  /** Verify Deployments first */
  it('Should ensure initialisation done correctly', async () => {
    assert(xsgdToken.address !== '');
    assert(noahPaymentManager.address !== '');
    assert(pbm.address !== '');


    assert.equal(await xsgdToken.name(), 'XSGD');
    assert.equal(await xsgdToken.symbol(), 'XSGD');
    assert.equal(await xsgdToken.decimals(), 6);

    expect(await xsgdToken.balanceOf(accounts[0].address)).to.equals(10000000000)
    expect(await xsgdToken.balanceOf(accounts[1].address)).to.equals(10000000000)

  });


  /** PBM Payment related & end to end tests */
  describe('PBM Payment Mint and Token Details Test', async () => {

    it('Should have been initialised properly', async () => {
      assert(await pbm.pbmAddressList() != '');
      assert(await pbm.pbmTokenManager() != '');
      assert(await pbm.noahPaymentManager() != '');
      assert(await pbm.contractExpiry() != 0);
    });

    describe('PBM Token Details Test', async () => { 
      it('PBM displays the correct token information', async () => {
        await createTokenType(pbm, 'Test-1XSGD', '1', xsgdToken, accounts[0]);

        tokenDetails = await pbm.getTokenDetails(0);
        expect(tokenDetails[0]).to.equals('Test-1XSGD1000000');
        expect(tokenDetails[1]).to.equals('1000000');
        expect(tokenDetails[3]).to.equals(accounts[0].address);
      });

      it('Create token type with invalid spot type should revert with error', async () => {
        await expect(
          createTokenType(pbm, 'Test-1BSGD', '1', bsgdToken, accounts[0]),
        ).to.be.revertedWith('SpotType must be XUSD or XSGD');
      });

      it('Create token type successfully', async () => {
        const pbmTokenManagerAddress = await pbm.pbmTokenManager();
        const PBMTokenManagerContract = await ethers.getContractFactory(
          'PBMTokenManager',
        );
        const pbmTokenManager = await PBMTokenManagerContract.attach(
          pbmTokenManagerAddress,
        );

        // listen to pbmTokenManager contract for the NewPBMTypeCreated event
        let filter = pbmTokenManager.filters.NewPBMTypeCreated();

        await createTokenType(pbm, 'Test-1XSGD', '1', xsgdToken, accounts[0]);
        let events = await pbmTokenManager.queryFilter(filter);
        expect(events.length).to.equal(1);
        expect(events[0].event).to.equal('NewPBMTypeCreated');

        let tokenDetails = await pbm.getTokenDetails(0);
        assert.equal(tokenDetails['0'], 'Test-1XSGD1000000');
        assert.equal(tokenDetails['1'].toString(), '1000000');
        assert.equal(tokenDetails['3'], accounts[0].address.toString());
      });

      it('Non owner update metadata uri would revert with error', async () => {
        await createTokenType(pbm, 'Test-1XSGD', '1', xsgdToken, accounts[0]);
        let metadataUri = await pbm.uri(0);
        expect(metadataUri).to.equal('beforeExpiryURI')
        await expect(pbm.connect(accounts[1]).updateTokenURI(0, 'updatedURI')).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it('Owner update metadata uri successfully', async () => {
        await createTokenType(pbm, 'Test-1XSGD', '1', xsgdToken, accounts[0]);
        let metadataUri = await pbm.uri(0);
        expect(metadataUri).to.equal('beforeExpiryURI')
        await pbm.updateTokenURI(0, 'updatedURI');
        expect(await pbm.uri(0)).to.equal('updatedURI');
      });

            
      it('Update token expiry successfully', async () => {
        await createTokenType(pbm, 'Test-1XSGD', '1', xsgdToken, accounts[0]);
        let tokenDetails = await pbm.getTokenDetails(0);
        const originalExpiry = tokenDetails['2'].toString();
        await pbm.updateTokenExpiry(0, originalExpiry + 100);
        let afterDetails = await pbm.getTokenDetails(0);
        expect(afterDetails['2'].toString()).to.equal(originalExpiry+100);
      });


    });


    describe('PBM Minting Test', async () => {

      it('throws an error when minting non existing token type', async () => {
        await expect(pbm.mint(0, 1, accounts[0].address)).to.be.revertedWith(
          'PBM: Invalid Token Id(s)',
        );
      });

      it('Only owner should be able to mint unbacked PBM tokens', async () => {
        await createTokenType(pbm, 'Test-1XSGD', '1', xsgdToken, accounts[0]);

        await pbm.mintUnbackedPBM(0, 1, accounts[10].address);
        expect(await pbm.balanceOf(accounts[10].address, 0)).to.equal(1);

        // Non owner tries to mint should be prevented.
        await expect(
          pbm.connect(accounts[1]).mintUnbackedPBM(0, 1, accounts[10].address)
        ).to.be.revertedWith(
          'Ownable: caller is not the owner'
        );

      });

      it('Minting a PBM token before approving ERC20 spending should revert with error', async () => {
        await createTokenType(pbm, 'Test-1XSGD', '1', xsgdToken, accounts[0]);
        await expect(pbm.mint(0, 1, accounts[0].address)).revertedWith(
          'ERC20: Insufficent balance or approval',
        );
      });

      it('Minting a XSGD PBM token successfully and deduct from minter', async () => {
        await createTokenType(pbm, 'Test-1XSGD', '1', xsgdToken, accounts[0]);
        
        await xsgdToken.increaseAllowance(
          pbm.address,
          parseUnits('1', await xsgdToken.decimals()),
        );
        await pbm.mint(0, 1, accounts[0].address);
        let balance = await pbm.balanceOf(accounts[0].address, 0);
        let XSGDBalance = await xsgdToken.balanceOf(pbm.address);
        let noahXSGDBalance = await xsgdToken.balanceOf(noahPaymentManager.address);
        let minterXSGDBalance = await xsgdToken.balanceOf(accounts[0].address);

        assert.equal(balance.toString(), '1');
        assert.equal(XSGDBalance.toString(), '0');
        assert.equal(noahXSGDBalance.toString(), '1000000');
        assert.equal(minterXSGDBalance.toString(), '9999000000');
      });
      

      it('PBM ', async () => { });
      it('PBM ', async () => { });

    });

    // Tear down tests
    // Revoke from noah pbm test
    // Recovery of erc20 token tests

    it('PBM expiry should work as intended', async () => { });
    it('PBM should call swap on NoahPBM if inadequate payment currency', async () => { });
    it('PBM should be able to combine various PBM types in accordance to combination logic', async () => { });

  });



});

