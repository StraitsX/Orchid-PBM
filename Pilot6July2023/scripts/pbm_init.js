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

  const addresListAddr = '0xD6A39Ea66EEC7dff0F95B6415fE7B9b5Dcd13609'
  const addressList = (await ethers.getContractFactory('PBMAddressList')).attach(addresListAddr).connect(deployerSigner);
  console.log('addressList address', addressList.address);

  // mainnet xsgd and dsgd
  const xsgdAddress = '0xd769410dc8772695A7f55a304d2125320A65c2a5';
  const dsgdAddress = '0x4B68D02791986Ce280072C558dc56a25b8A1E079';

  // const dummyDSGD = (await ethers.getContractFactory('Spot')).attach(xsgdAddress).connect(deployerSigner);
  // const dummyXSGD = (await ethers.getContractFactory('Spot')).attach(dsgdAddress).connect(deployerSigner);
  // const swapDeployment = await deployments.get('Swap');
  const swapAddr = '0xc863d9c8e9e05118c08278160a90E047c1E91A11';
    const swap = (await ethers.getContractFactory('Swap')).attach(swapAddr).connect(deployerSigner);
  console.log('swap address', swap.address);

  const expiryDate = 1893456000; // 2030-01-01T00:00:00+08:00

  const heroNFTAddresss = '0xbA7894a04CFB920C725128a957D1a853fBb4773D';

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
