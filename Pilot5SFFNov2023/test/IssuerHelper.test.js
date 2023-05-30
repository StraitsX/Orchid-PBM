const { expect } = require('chai');
const { ethers } = require('hardhat');
const { signMetaTxRequest } = require('../src/signer');

async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}

describe('IssuerHelper', function () {
  beforeEach(async function () {
    // Get the signers
    [deployer, whitelister, wallet, other] = await ethers.getSigners();

    // Deploy a mock ERC20 token
    this.erc20Token = await deploy('Spot');

    // Deploy the PBM contract
    this.pbm = await deploy('PBM');

    // Deploy the MinimalForwarder contract
    this.minimalForwarder = await deploy('MinimalForwarder');

    // Deploy the IssuerHelper contract
    this.issuerHelper = await deploy(
      'IssuerHelper',
      this.pbm.address,
      this.minimalForwarder.address,
    );

    this.addressList = await deploy('PBMAddressList');

    await this.issuerHelper.addWhitelister(deployer.address);

    // Add the whitelister and wallet as allowed entities
    await this.issuerHelper.addWhitelister(whitelister.address);
    await this.issuerHelper.addWhitelistedWallet(wallet.address);

    // Give the wallet some tokens
    await this.erc20Token.mint(
      wallet.address,
      ethers.utils.parseUnits('1000', 18),
    );

    // create PBM envelope token type
    currentDate = new Date();
    currentEpoch = Math.floor(currentDate / 1000);
    var targetEpoch = currentEpoch + 100000; // Expiry is set to 1 day 3.6 hours from current time
    await this.pbm
      .connect(deployer)
      .initialise(
        this.erc20Token.address,
        targetEpoch + 100000000,
        this.addressList.address,
      );
    await this.pbm
      .connect(deployer)
      .createPBMTokenType(
        'testPBMenvelope',
        5,
        targetEpoch,
        deployer.address,
        'uri',
        'expired_uri',
      );
  });

  async function relay(forwarder, request, signature, whitelist) {
    // Decide if we want to relay this request based on a whitelist
    const accepts = !whitelist || whitelist.includes(request.to);
    if (!accepts) throw new Error(`Rejected request to ${request.to}`);

    // Validate request on the forwarder contract
    const valid = await forwarder.verify(request, signature);

    if (!valid) throw new Error(`Invalid request`);

    // Send meta-tx through relayer to the forwarder contract
    const gasLimit = (parseInt(request.gas) * 1.5).toString();
    return await forwarder.execute(request, signature, { gasLimit });
  }

  describe('meta txn', function () {
    it('should call the addWhitelistedWallet thru a metatxn', async function () {
      const { minimalForwarder, issuerHelper } = this;

      const { request, signature } = await signMetaTxRequest(
        whitelister.provider,
        minimalForwarder,
        {
          from: whitelister.address,
          to: issuerHelper.address,
          data: issuerHelper.interface.encodeFunctionData(
            'addWhitelistedWallet',
            [other.address],
          ),
        },
      );

      const whitelist = [issuerHelper.address];

      // Check whitelister's initial ether balance
      const initialWhitelisterBalance = await ethers.provider.getBalance(
        whitelister.address,
      );
      await relay(minimalForwarder, request, signature, whitelist);

      // Check whitelister's final ether balance
      const finalWhitelisterBalance = await ethers.provider.getBalance(
        whitelister.address,
      );
      expect(await issuerHelper.whitelistedWallets(other.address)).to.equal(
        true,
      );

      // Compare initial and final balances to ensure that whitelister didn't pay gas
      expect(initialWhitelisterBalance).to.equal(finalWhitelisterBalance);
    });

    it('should fail if caller is not an allowed whitelister', async function () {
      const { minimalForwarder, issuerHelper } = this;
      const { request, signature } = await signMetaTxRequest(
        other.provider,
        minimalForwarder,
        {
          from: other.address,
          to: issuerHelper.address,
          data: issuerHelper.interface.encodeFunctionData(
            'addWhitelistedWallet',
            [other.address],
          ),
        },
      );
      const whitelist = [issuerHelper.address];

      // Check other's initial ether balance
      const initialOtherBalance = await ethers.provider.getBalance(
        other.address,
      );

      await relay(minimalForwarder, request, signature, whitelist);

      // Check other's final ether balance
      const finalOtherBalance = await ethers.provider.getBalance(other.address);

      // Compare initial and final balances to ensure that other didn't pay gas
      expect(initialOtherBalance).to.equal(finalOtherBalance);

      // based on the forwarder contract implementation
      // here the excute function call would finish
      // but the underlying addWhitelistedWallet function call of this meta txn would be reverted
      // and the state of the issuer helper contract would remain unchanged
      // the returndata returned by the execute function would contain the revert reason
      // and the error message emitted by the underlying function call
      // in order to inspect the returndata might need to emit an event in the execute function call
      // will leave it to the forwarder contract implenmentor to figure out the details

      expect(await issuerHelper.whitelistedWallets(other.address)).to.equal(
        false,
      );
    });

    it('should call the processLoadAndSafeTransfer thru a metatxn', async function () {
      const { pbm, addressList, erc20Token, issuerHelper, minimalForwarder } =
        this;

      // mint envelope to wallet
      await pbm.mint(0, 1, wallet.address);

      // Grant permission to the issuerHelper to transfer the envelope token
      await pbm.connect(wallet).setApprovalForAll(issuerHelper.address, true);

      // Grant allowance to the issuerHelper contract by the wallet
      await erc20Token
        .connect(wallet)
        .approve(issuerHelper.address, ethers.utils.parseUnits('100', 18));

      // add other wallet as a merchat
      await addressList
        .connect(deployer)
        .addMerchantAddresses([other.address], 'other');

      // Check the initial balances
      const initialOtherBalance = await erc20Token.balanceOf(other.address);
      const initialWalletBalance = await erc20Token.balanceOf(wallet.address);

      // Perform the processLoadAndSafeTransferFrom metatxn call
      const { request, signature } = await signMetaTxRequest(
        wallet.provider,
        minimalForwarder,
        {
          from: wallet.address,
          to: issuerHelper.address,
          data: issuerHelper.interface.encodeFunctionData(
            'processLoadAndSafeTransferFrom',
            [
              erc20Token.address,
              wallet.address,
              other.address,
              0,
              ethers.utils.parseUnits('50', 18),
            ],
          ),
        },
      );

      const whitelist = [issuerHelper.address];

      // Check wallet's initial ether balance
      const initialWalletEthBalance = await ethers.provider.getBalance(
        wallet.address,
      );

      await relay(minimalForwarder, request, signature, whitelist);

      // Check wallet's final ether balance
      const finalWalletEthBalance = await ethers.provider.getBalance(
        wallet.address,
      );

      // Compare initial and final balances to ensure that other didn't pay gas
      expect(initialWalletEthBalance).to.equal(finalWalletEthBalance);

      // Check the final balances
      const finalOtherBalance = await erc20Token.balanceOf(other.address);
      const finalWalletBalance = await erc20Token.balanceOf(wallet.address);
      expect(finalOtherBalance.sub(initialOtherBalance)).to.equal(
        ethers.utils.parseUnits('50', 18),
      );
      expect(initialWalletBalance.sub(finalWalletBalance)).to.equal(
        ethers.utils.parseUnits('50', 18),
      );
      expect((await pbm.balanceOf(other.address, 0)) == 1).to.equal(true);
    });
  });

  describe('processLoadAndSafeTransfer', function () {
    it('should transfer tokens from wallet to IssuerHelper and call loadAndSafeTransfer on PBM', async function () {
      const { pbm, addressList, erc20Token, issuerHelper } = this;
      // Grant allowance to the issuerHelper contract by the wallet
      await erc20Token
        .connect(wallet)
        .approve(issuerHelper.address, ethers.utils.parseUnits('100', 18));
      // mint envelope to wallet
      await pbm.mint(0, 1, wallet.address);

      // Grant permission to the issuerHelper to transfer the envelope token
      await pbm.connect(wallet).setApprovalForAll(issuerHelper.address, true);

      // add other wallet as a merchat
      await addressList
        .connect(deployer)
        .addMerchantAddresses([other.address], 'other');

      // Check the initial balances
      const initialOtherBalance = await erc20Token.balanceOf(other.address);
      const initialWalletBalance = await erc20Token.balanceOf(wallet.address);

      // Check wallet's initial ether balance
      const initialWalletEthBalance = await ethers.provider.getBalance(
        wallet.address,
      );
      // Perform the processLoadAndSafeTransfer function call
      txn = await issuerHelper
        .connect(wallet)
        .processLoadAndSafeTransferFrom(
          erc20Token.address,
          wallet.address,
          other.address,
          0,
          ethers.utils.parseUnits('50', 18),
        );
      receipt = await txn.wait();

      // Calculate the gas used and cost
      const gasUsed = receipt.gasUsed;
      const gasPrice = txn.gasPrice;
      const gasCost = gasUsed.mul(gasPrice);

      // Check wallet's final ether balance
      const finalWalletEthBalance = await ethers.provider.getBalance(
        wallet.address,
      );

      // Check if the wallet's Ether balance changes equal to the gas used for the transaction
      expect(initialWalletEthBalance.sub(finalWalletEthBalance)).to.equal(
        gasCost,
      );

      // Check the final balances
      const finalOtherBalance = await erc20Token.balanceOf(other.address);
      const finalWalletBalance = await erc20Token.balanceOf(wallet.address);
      expect(finalOtherBalance.sub(initialOtherBalance)).to.equal(
        ethers.utils.parseUnits('50', 18),
      );
      expect(initialWalletBalance.sub(finalWalletBalance)).to.equal(
        ethers.utils.parseUnits('50', 18),
      );
      expect((await pbm.balanceOf(other.address, 0)) == 1).to.equal(true);
    });

    it('should fail if caller is not an allowed whitelister', async function () {
      const { issuerHelper } = this;
      await expect(
        issuerHelper.connect(other).addWhitelistedWallet(wallet.address),
      ).to.be.revertedWith('Caller is not an allowed whitelister');
    });

    it('should fail if wallet is not whitelisted', async function () {
      const { issuerHelper, erc20Token } = this;
      await issuerHelper.removeWhitelistedWallet(wallet.address);
      await expect(
        issuerHelper
          .connect(whitelister)
          .processLoadAndSafeTransferFrom(
            erc20Token.address,
            wallet.address,
            other.address,
            0,
            ethers.utils.parseUnits('50', 18),
          ),
      ).to.be.revertedWith('Wallet is not whitelisted');
    });
  });
});
