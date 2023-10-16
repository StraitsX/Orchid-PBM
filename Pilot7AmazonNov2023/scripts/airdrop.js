const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmDeployment = await deployments.get('PBM');

  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmDeployment.address)
    .connect(deployerSigner);

  // xsgd on mumbai: 0x16e28369bc318636abbf6cb1035da77ffbf4a3bc
  const xsgdAddress = '0x16e28369bc318636abbf6cb1035da77ffbf4a3bc';

  const XSGD = await ethers.getContractFactory('Spot');
  const xsgd = await XSGD.attach(xsgdAddress).connect(deployerSigner); // XSGD deployed on mumbai

  const grabTestAccounts = [
    '0x2ad7685a8024d63b9b38aa815d992c67d181cfa9',
    '0x8e88a3d334a671256752e2e80fbcb53e2679b56f',
    '0x83d1336b344f332a589d21cb0616c82f221e9f91',
    '0x40e80ec25b69aff0345902ded017fe8db41db2a1',
    '0x2f4f73c66ced7fe2e43b95ffbdadd031d0d4139a',
    '0xe237e46901d6e6553513cf6dc432bf66a8a02ec3',
    '0x8bae4fac1ba677c7e0c3ec93a10ca5ab213c63fb',
  ];
  for (let i = 0; i < grabTestAccounts.length; i++) {
    const airDropTxn = await pbm.safeTransferFrom(
      deployer,
      grabTestAccounts[i],
      1,
      ethers.utils.parseUnits('10', await xsgd.decimals()),
      '0x',
    );
    await airDropTxn.wait();
    console.log(`airdropped PBM token 1 to address ${grabTestAccounts[i]}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
