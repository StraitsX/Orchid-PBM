const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const HeroNFT = await ethers.getContractFactory('HeroNFT');
  const heroNFTDeployment = await deployments.get('HeroNFT');
  const heroNFT = await HeroNFT.attach(heroNFTDeployment.address).connect(
    deployerSigner,
  );

  const pbmAddr = '0xD2D74e2136D60A3c0D252C6dE4102a82f2511DEF';
  // whitelist PBM to be minter
  await heroNFT.addWhitelisted(pbmAddr);

  console.log(`Whitelisted PBM: ${pbmAddr} to be minter`);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
