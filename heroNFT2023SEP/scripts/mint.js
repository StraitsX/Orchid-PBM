const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const HeroNFT = await ethers.getContractFactory('HeroNFT');
  const heroNFTDeployment = await deployments.get('HeroNFT');
  const heroNFT = await HeroNFT.attach(heroNFTDeployment.address).connect(
    deployerSigner,
  );

  // for this heroNFT will start token id from 1. 0 is reserved
  const targetAddress = [deployer];
  for (let i = 0; i < targetAddress.length; i++) {
    let mintTx = await heroNFT.mintUniqueBatch(
      targetAddress[i],
      [1, 2, 3, 4],
      [1, 1, 1, 1],
      '0x',
    );
    const receipt = await mintTx.wait();
    console.log(receipt.transactionHash);
    console.log(`minted HeroNFT token 1, 2 to address ${targetAddress[i]}`);
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
