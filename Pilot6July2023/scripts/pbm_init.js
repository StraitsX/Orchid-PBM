const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmDeployment = await deployments.get('PBM');
  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmDeployment.address)
    .connect(deployerSigner);

  console.log('PBM address', pbmDeployment.address);

  // const addressListDeployment = await deployments.get('PBMAddressList');

  const addresListAddr = '0x200898584f14c4213787556d40693c163CC677Af';
  const addressList = (await ethers.getContractFactory('PBMAddressList'))
    .attach(addresListAddr)
    .connect(deployerSigner);
  console.log('addressList address', addressList.address);

  // mainnet xsgd and dsgd
  const xsgdAddress = '0xa05245Ade25cC1063EE50Cf7c083B4524c1C4302';
  const dsgdAddress = '0xcFf17e464626aDEF615FFC1Ecdb1661f1Ed1ca16';

  // const dummyDSGD = (await ethers.getContractFactory('Spot')).attach(xsgdAddress).connect(deployerSigner);
  // const dummyXSGD = (await ethers.getContractFactory('Spot')).attach(dsgdAddress).connect(deployerSigner);
  // const swapDeployment = await deployments.get('Swap');
  const swapAddr = '0xd910e00b08a58fACa8355a1d5b3675A9329e64f4';
  const swap = (await ethers.getContractFactory('Swap'))
    .attach(swapAddr)
    .connect(deployerSigner);
  console.log('swap address', swap.address);

  const expiryDate = 1762696800; // Sunday, November 9, 2025 10:00:00 PM GMT+08:00

  const heroNFTAddresss = '0x9e6c68947bEe1b7b79909E315B2461317537821f';

  await pbm.initialise(
    xsgdAddress,
    dsgdAddress,
    swap.address,
    expiryDate,
    addressList.address,
    heroNFTAddresss,
  );
  console.log('PBM initialised');
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
