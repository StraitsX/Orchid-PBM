const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const HeroNFT = await ethers.getContractFactory('HeroNFT');
  const heroNFTDeployment = await deployments.get('HeroNFT');
  const heroNFT = await HeroNFT.attach(heroNFTDeployment.address).connect(
    deployerSigner,
  );

  const pbmAddr = '0xb9f5fc449dDd21302Ab52aF1FfeA8d7A49614D3b';
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
