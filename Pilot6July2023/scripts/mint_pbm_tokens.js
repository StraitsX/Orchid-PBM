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
  await xsgd.increaseAllowance(pbm.address, ethers.utils.parseUnits('2', await xsgd.decimals()));

  const DSGD = await ethers.getContractFactory('Spot');
  const dsgd = await DSGD.attach(dsgdAddress).connect(deployerSigner);
  // increase allowance for PBM
  // await dsgd.increaseAllowance(pbm.address, ethers.utils.parseUnits('45780', await dsgd.decimals()));

  const swapAddr = '0x287E63eE76855a0eaFc5cDf3e0950253916c8aE6'
  // const swapDeployment = await deployments.get('Swap');
  const swap = (await ethers.getContractFactory('Swap'))
    .attach(swapAddr)
    .connect(deployerSigner);

  // mint PBM token 0 -> 1 xsgd, 1 -> 2 dsgd, 2 -> 5 xsgd, 3 -> 0.1 xsgd
  const test1 = '0xed8bd195e027d21ca94f2ac11dd70767e212f60d'
  const test2 = '0xfd92d326f5363826ba960cc2983cf80593e60f03'

  // mint dummy XSGD
  // await xsgd.mint(swap.address, ethers.utils.parseUnits('1000000', 6))
  // await xsgd.mint(victorAddr, ethers.utils.parseUnits('1000000', 6))

  const mintTo = [test1, test2];
  for (let i = 0; i < mintTo.length; i++) {
    const mintTxn = await pbm.batchMint([3], [10], mintTo[i]);
    const receipt = await mintTxn.wait()
    console.log(`minted PBM token 3 to address ${mintTo[i]}`);
    console.log(`txn hash ${receipt.transactionHash}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
