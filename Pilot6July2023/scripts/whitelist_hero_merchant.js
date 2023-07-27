const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const addressListDeployment = await deployments.get('PBMAddressList');
  const addressList = (await ethers.getContractFactory('PBMAddressList')).attach(addressListDeployment.address).connect(deployerSigner);

  const heroMerchants = [];
  const heroNFTIDs = []
  await addressList.addHeroMerchant(heroMerchants, heroNFTIDs)
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
