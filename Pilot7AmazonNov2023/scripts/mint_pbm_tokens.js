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

  // increase allowance for PBM
  await xsgd.increaseAllowance(pbm.address, 10000000000000);

  const mintTo = [deployer];
  for (let i = 0; i < mintTo.length; i++) {
    await pbm.mint(1,1, mintTo[i]);
    console.log(`minted PBM token 1 to address ${mintTo[i]}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
