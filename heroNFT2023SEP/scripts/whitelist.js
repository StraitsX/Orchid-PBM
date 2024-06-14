const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const HeroNFT = await ethers.getContractFactory('HeroNFT');
  const heroNFTDeployment = await deployments.get('HeroNFT');
  const heroNFT = await HeroNFT.attach(heroNFTDeployment.address).connect(
    deployerSigner,
  );

  const pbmAddr = '0x5D95B020AA8DA9315C9D59593c83A762C9A5A402';
  // whitelist PBM to be minter
  await heroNFT.addWhitelisted(pbmAddr, {gasPrice: ethers.utils.parseUnits('15', 'gwei')});

  console.log(`Whitelisted PBM: ${pbmAddr} to be minter`);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
