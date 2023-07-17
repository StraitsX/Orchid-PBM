const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmDeployment = await deployments.get('PBM');
  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmDeployment.address)
    .connect(deployerSigner);
  const XSGD = await ethers.getContractFactory('Spot');
  const xsgd = await XSGD.attach(
    '0x16e28369bc318636abbf6cb1035da77ffbf4a3bc',
  ).connect(deployerSigner); // XSGD deployed on mumbai
  await xsgd.increaseAllowance(pbm.address, 10000000000);

  // mint to deployer for testing
  // await pbm.batchMint([0, 1, 2], [5, 5, 5], deployer);

  const grabAddresses = [
    '0xe9601df4dfda0d44ad3d22d66a5c0df80bc043db',
    '0xd660286a399195dfe82e507ae8c4bb0b807dca4d',
    '0x836a012cbdc0294427bf1275161f4fa0a95c2deb',
    '0x7cb0ad3880740bf734f534789375319646c63664',
    '0xbf5865b700651bb8cc3c2790c555b05d948d4276',
    '0x119175ea3feac05811e5101b546e59ec713e1bc8',
    '0x51afd1624d043a03a8bc5de7cd67e8b85a15143e',
    '0x6004e25699ebf2d7a057fd4dd4684a1539d00a74',
    '0x0430954e86ef809634cdfb36456c2316b1ea8558',
  ];

  for (let i = 0; i < grabAddresses.length; i++) {
    await pbm.batchMint([0, 1, 2], [5, 5, 5], grabAddresses[i]);
    console.log(`minted PBM token 0, 1, 2 to address ${grabAddresses[i]}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
