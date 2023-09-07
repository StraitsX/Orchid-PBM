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

  // mint PBM token 0 -> 1 xsgd, 1 -> 2 xsgd, 2 -> 5 xsgd, 3 -> 0.1 xsgd, 4 -> 1 dsgd
  // const tjAddr = '0x56285Cbc175a9c7eB347d95a15633D95f894ba7b';
  // const victorAddr = '0xE3639cd0EbE69F9f5189b9DEfe95C81BC89CBF69';
  // const grabAddr = '0x9aa230b2a1817ae5b4841c7bd59705e48080bfc1';
  const grabDevAddr = '0x5395e64f7fa3049826d3d0138bdff32ac79b3eab';
  const gloria = '0x64b1ab364d0fc2a2df9e00ffbc65ab34dfb73b3d'
  const tianwei = '0xe036517f1c5577277a9fe442f43f670530f30a64'
  const fomo1 = '0xed8bd195e027d21ca94f2ac11dd70767e212f60d'
  const fomo2 = '0xfd92d326f5363826ba960cc2983cf80593e60f03'

  // mint dummy XSGD
  // await xsgd.mint(swap.address, ethers.utils.parseUnits('1000000', 6))
  // await xsgd.mint(victorAddr, ethers.utils.parseUnits('1000000', 6))

  const mintTo = [fomo1, fomo2];
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
