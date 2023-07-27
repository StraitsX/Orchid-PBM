const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmDeployment = await deployments.get('PBM');

  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmDeployment.address)
    .connect(deployerSigner);

  // xsgd on mumbai: 0x16e28369bc318636abbf6cb1035da77ffbf4a3bc
  const XSGD = await ethers.getContractFactory('Spot');
  const xsgd = await XSGD.attach(
    '0x16e28369bc318636abbf6cb1035da77ffbf4a3bc',
  ).connect(deployerSigner); // XSGD deployed on mumbai

  // increase allowance for PBM
  await xsgd.increaseAllowance(pbm.address, 10000000000);

  const dsgdDeployment = await deployments.get('Spot');
  const dsgd = (await ethers.getContractFactory('Spot'))
    .attach(dsgdDeployment.address)
    .connect(deployerSigner);
  // increase allowance for PBM
  await dsgd.increaseAllowance(pbm.address, 10000000000);

  // mint PBM token 0, 1, 2, 3
  const mintTo = []
  for (let i = 0; i < mintTo.length; i++) {
    await pbm.batchMint([0, 1, 2, 3], [50, 50, 50, 50], mintTo[i]);
    console.log(`minted PBM token 0, 1, 2 to address ${mintTo[i]}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
