const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);
  const gasPrice = ethers.utils.parseUnits('15', 'gwei');

  // const pbmDeployment = await deployments.get('PBM');

  const pbmAddr = '0xD2D74e2136D60A3c0D252C6dE4102a82f2511DEF';
  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmAddr)
    .connect(deployerSigner);

  // mainnet xsgd and dsgd
  const xsgdAddress = '0xd769410dc8772695A7f55a304d2125320A65c2a5';
  const dsgdAddress = '0x4B68D02791986Ce280072C558dc56a25b8A1E079';

  const XSGD = await ethers.getContractFactory('Spot');
  const xsgd = await XSGD.attach(xsgdAddress).connect(deployerSigner);

  // increase allowance for PBM
  await xsgd.increaseAllowance(pbm.address, ethers.utils.parseUnits('1000000', await xsgd.decimals()), {gasPrice: gasPrice});

  const DSGD = await ethers.getContractFactory('Spot');
  const dsgd = await DSGD.attach(dsgdAddress).connect(deployerSigner);
  // increase allowance for PBM
  await dsgd.increaseAllowance(pbm.address, ethers.utils.parseUnits('1000000', await dsgd.decimals()), {gasPrice: gasPrice});

  const swapAddr = '0xc863d9c8e9e05118c08278160a90E047c1E91A11'
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

  const mintTo = [deployer];
  for (let i = 0; i < mintTo.length; i++) {
    const mintTxn = await pbm.batchMint([0,1,2,3], [20000,10000,20000,100000], mintTo[i]);
    const receipt = await mintTxn.wait()
    console.log(`minted PBM token 0,1,2,3 to address ${mintTo[i]}`);
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
