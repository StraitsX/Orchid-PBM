const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  // const pbmDeployment = await deployments.get('PBM');

  const pbmAddr = '0xD2D74e2136D60A3c0D252C6dE4102a82f2511DEF';
  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmAddr)
    .connect(deployerSigner);

  // mainnet xsgd and dsgd
  const xsgdAddress = '0xDC3326e71D45186F113a2F448984CA0e8D201995';
  const dsgdAddress = '0x057B501fD1daF8FB0E232C7003AaFe5500e4efc0';

  const XSGD = await ethers.getContractFactory('Spot');
  const xsgd = await XSGD.attach(xsgdAddress).connect(deployerSigner);

  // increase allowance for PBM
  await xsgd.increaseAllowance(pbm.address, ethers.utils.parseUnits('1', await xsgd.decimals()));

  const DSGD = await ethers.getContractFactory('Spot');
  const dsgd = await DSGD.attach(dsgdAddress).connect(deployerSigner);
  // increase allowance for PBM
  // await dsgd.increaseAllowance(pbm.address, 10000000000000);

  const swapAddr = '0x287E63eE76855a0eaFc5cDf3e0950253916c8aE6'
  // const swapDeployment = await deployments.get('Swap');
  const swap = (await ethers.getContractFactory('Swap'))
    .attach(swapAddr)
    .connect(deployerSigner);

  // mint PBM token 0 -> 1 xsgd, 1 -> 2 xsgd, 2 -> 5 xsgd, 3 -> 0.1 xsgd, 4 -> 1 dsgd
  const tjAddr = '0x56285Cbc175a9c7eB347d95a15633D95f894ba7b';
  const victorAddr = '0x4Ef6462589a2D509fc05dA74511FFB4275D36615';
  const grabAddr = '0x9aa230b2a1817ae5b4841c7bd59705e48080bfc1';

  // mint dummy XSGD
  // await xsgd.mint(swap.address, ethers.utils.parseUnits('1000000', 6))
  // await xsgd.mint(victorAddr, ethers.utils.parseUnits('1000000', 6))

  const mintTo = [grabAddr];
  for (let i = 0; i < mintTo.length; i++) {
    await pbm.batchMint([0], [1], mintTo[i]);
    console.log(`minted PBM token 0 to address ${mintTo[i]}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
