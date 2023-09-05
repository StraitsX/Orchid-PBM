const { deployments } = require('hardhat');
const hre = require('hardhat');

async function main() {
  const heroNFTDeployment = await deployments.get('HeroNFT');

  console.log('Verifying HeroNFT');

  await hre.run('verify:verify', {
    address: heroNFTDeployment.address,
    constructorArguments: [],
  });
  console.log(`Verified HeroNFT at ${heroNFTDeployment.address}`);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
