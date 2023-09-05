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

  const addresListAddr = '0x42e2a9716F63684B9DCe70Bbe4e493437f6a7Bc9'
  const addressList = (await ethers.getContractFactory('PBMAddressList')).attach(addresListAddr).connect(deployerSigner);
  console.log('addressList address', addressList.address);

  // mainnet xsgd and dsgd
  const xsgdAddress = '0xDC3326e71D45186F113a2F448984CA0e8D201995';
  const dsgdAddress = '0x057B501fD1daF8FB0E232C7003AaFe5500e4efc0';

  // const dummyDSGD = (await ethers.getContractFactory('Spot')).attach(xsgdAddress).connect(deployerSigner);
  // const dummyXSGD = (await ethers.getContractFactory('Spot')).attach(dsgdAddress).connect(deployerSigner);
  // const swapDeployment = await deployments.get('Swap');
  const swapAddr = '0x287E63eE76855a0eaFc5cDf3e0950253916c8aE6';
    const swap = (await ethers.getContractFactory('Swap')).attach(swapAddr).connect(deployerSigner);
  console.log('swap address', swap.address);

  const expiryDate = 1704038400; // 2024-01-01T00:00:00+08:00

  const heroNFTAddresss = '0x9eA317880C2667136fe1a13976BeB3D7F523620D';

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
