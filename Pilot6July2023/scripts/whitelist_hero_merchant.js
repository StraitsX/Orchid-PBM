const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const addressListDeployment = await deployments.get('PBMAddressList');
  const addressList = (await ethers.getContractFactory('PBMAddressList')).attach(addressListDeployment.address).connect(deployerSigner);

  const heroMerchants = ["0xC17Bc5397e2B38FEE9161c184f155b4C9e6c7E1f", "0x496B3A30b4e0eC67937AaA0643666a4D837C4421", "0x74C6FA8D7D5A93b810D9FCdc87d4E039949B7F55", "0x917E03aEf2DA8140628983ff456F049e9a31ab9a"];
  const heroNFTIDs = [1,2,3,4]
  await addressList.addHeroMerchant(heroMerchants, heroNFTIDs)
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
