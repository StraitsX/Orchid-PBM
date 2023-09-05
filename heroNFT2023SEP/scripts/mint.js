const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const HeroNFT = await ethers.getContractFactory('HeroNFT');
  const heroNFTAddr = '0x9eA317880C2667136fe1a13976BeB3D7F523620D'
  // const heroNFTDeployment = await deployments.get('HeroNFT');
  const heroNFT = await HeroNFT.attach(heroNFTAddr).connect(
    deployerSigner,
  );

  const grabAddr = '0x9aa230b2a1817ae5b4841c7bd59705e48080bfc1'

  // for this heroNFT will start token id from 1. 0 is reserved
  const targetAddress = [grabAddr];
  for (let i = 0; i < targetAddress.length; i++) {
    let mintTx = await heroNFT.mintUniqueBatch(
      targetAddress[i],
      [1, 2, 3, 4],
      [1, 1, 1, 1],
      '0x',
    );
    const receipt = await mintTx.wait();
    console.log(receipt.transactionHash);
    console.log(`minted HeroNFT token 1, 2, 3, 4 to address ${targetAddress[i]}`);
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
