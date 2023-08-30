const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmDeployment = await deployments.get('PBM');
  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmDeployment.address)
    .connect(deployerSigner);


  const xsgdAddress = '0x16e28369bc318636abbf6cb1035da77ffbf4a3bc';

  const XSGD = await ethers.getContractFactory('Spot');
  const xsgd = await XSGD.attach(xsgdAddress).connect(deployerSigner); // XSGD deployed on mumbai

  const expiryDate = 1716469200; // Tue May 23 2024 21:00:00 GMT+0800 (Taipei Standard Time) 2024-05-23T21:00:00+08:00


  // creating token id 0: XSGD pbm - 1 XSGD
  await pbm.createPBMTokenType(
    'test-amazn',
    ethers.utils.parseUnits('20', await xsgd.decimals()),
    expiryDate,
    deployer,
    'https://raw.githubusercontent.com/StraitsX/NFT-Metadata/main/pilot6July2023/1XSGD.json',
    'https://raw.githubusercontent.com/StraitsX/NFT-Metadata/main/pilot6July2023/expired1XSGD.json',
  );
  console.log('PBM Token type 0 created');
  await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
