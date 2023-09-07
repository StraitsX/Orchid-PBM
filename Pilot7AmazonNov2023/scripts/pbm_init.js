const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmDeployment = await deployments.get('PBM');
  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmDeployment.address)
    .connect(deployerSigner);

  const expiryDate = 1725739503; // Sunday, September 8, 2024 4:05:03 AM GMT+08:00
  // mumbai xsgd address
  const xsgdAddress = "0x16e28369bc318636abbf6cb1035da77ffbf4a3bc"
  await pbm.initialise(
    xsgdAddress,
    expiryDate
  );
  console.log('PBM initialised');
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
