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

  const amazonOrchestrator = '0xDF4BF9d0fF8748445b3eaE0e21D34e37A5264194';
  const amazonOrchestrator2 = '0xc2DF1084cfb5e79eD627Ae56bB5CdDE6a3791748';
  const grabOrchestrator = '0xc10cc0344086e1fd95951bc4c2aac6c2d746ce56';
  const whitelistTxn1 = await pbm.addToWhitelist(amazonOrchestrator);
  await whitelistTxn1.wait();
  const whitelistTxn2 = await pbm.addToWhitelist(amazonOrchestrator2);
  await whitelistTxn2.wait();
  const whitelistTxn3 = await pbm.addToWhitelist(grabOrchestrator);
  await whitelistTxn3.wait();
  const whitelistDeployer = await pbm.addToWhitelist(deployer);
  await whitelistDeployer.wait();

  const mintTo = [
    amazonOrchestrator,
    amazonOrchestrator2,
    grabOrchestrator,
    deployer,
  ];
  for (let i = 0; i < mintTo.length; i++) {
    const mintTxn = await pbm.mint(1, 50, mintTo[i]);
    await mintTxn.wait();
    const addUserBalanceTxn = await pbm.addUserBalance(
      1,
      ethers.utils.parseUnits('500', await xsgd.decimals()),
      mintTo[i],
    );
    await addUserBalanceTxn.wait();
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
