module.exports = async ({ getNamedAccounts, deployments, ethers }) => {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmDeployment = await deployments.get('PBM');
  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmDeployment.address)
    .connect(deployerSigner);
  const addressListDeployment = await deployments.get('PBMAddressList');
  const merchantHelperDeployment = await deployments.get('MerchantHelper');

  // const currentDate = new Date();
  // const currentEpoch = Math.floor(currentDate / 1000);
  const expiryDate = 1716469200; // Tue May 23 2024 21:00:00 GMT+0800 (Taipei Standard Time) 2024-05-23T21:00:00+08:00

  // Polygon XSGD address = "0xDC3326e71D45186F113a2F448984CA0e8D201995"
  // Mumbai XSGD address = "0x16e28369bc318636abbf6cb1035da77ffbf4a3bc"
  const address = '0x16e28369bc318636abbf6cb1035da77ffbf4a3bc';
  await pbm.initialise(address, expiryDate, addressListDeployment.address, merchantHelperDeployment.address);
  console.log('PBM initialised');
};
