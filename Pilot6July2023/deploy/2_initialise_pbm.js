module.exports = async ({ getNamedAccounts, deployments, ethers }) => {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmDeployment = await deployments.get('PBM');
  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmDeployment.address)
    .connect(deployerSigner);
  const addressListDeployment = await deployments.get('PBMAddressList');
  const dsgdDeployment = await deployments.get('Spot');
  const swapDeployment = await deployments.get('Swap');

  const expiryDate = 1716469200; // Tue May 23 2024 21:00:00 GMT+0800 (Taipei Standard Time) 2024-05-23T21:00:00+08:00

  // Polygon XSGD address = "0xDC3326e71D45186F113a2F448984CA0e8D201995"
  // Mumbai XSGD address = "0x16e28369bc318636abbf6cb1035da77ffbf4a3bc"
  const xsgdAddress = '0x16e28369bc318636abbf6cb1035da77ffbf4a3bc';
  // Mumbai heroNFT address = "0x03d757C5b2BA632Af155794328aA98eF46999efC"
  const heroNFTAddresss = '0x03d757C5b2BA632Af155794328aA98eF46999efC';

  await pbm.initialise(
    xsgdAddress,
    dsgdDeployment.address,
    swapDeployment.address,
    expiryDate,
    addressListDeployment.address,
    heroNFTAddresss,
  );
  console.log('PBM initialised');
};
