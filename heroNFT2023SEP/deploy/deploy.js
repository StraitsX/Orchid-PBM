const { getNamedAccounts, deployments } = require('hardhat');
const hre = require('hardhat');
module.exports = async () => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log('Deploying contracts with the account:', deployer);

  const heroNFT = await deploy('HeroNFT', {
    from: deployer,
    args: [],
    log: true,
  });
  console.log(`Deployed HeroNFT to ${heroNFT.address}`);
};
