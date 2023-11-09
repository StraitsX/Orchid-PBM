const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  // const pbmDeployment = await deployments.get('PBM');

  const pbmAddr = '0xF28A99687a5d40Cb18c1d555f5e2d4b17a7ACFD4';
  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmAddr)
    .connect(deployerSigner);

  // mainnet xsgd and dsgd
  const xsgdAddress = '0xa05245Ade25cC1063EE50Cf7c083B4524c1C4302';
  const dsgdAddress = '0xcFf17e464626aDEF615FFC1Ecdb1661f1Ed1ca16';

  const XSGD = await ethers.getContractFactory('Spot');
  const xsgd = await XSGD.attach(xsgdAddress).connect(deployerSigner);

  // increase allowance for PBM
  await xsgd.increaseAllowance(
    pbm.address,
    ethers.utils.parseUnits('10', await xsgd.decimals()),
  );

  const DSGD = await ethers.getContractFactory('Spot');
  const dsgd = await DSGD.attach(dsgdAddress).connect(deployerSigner);
  // increase allowance for PBM
  // await dsgd.increaseAllowance(pbm.address, ethers.utils.parseUnits('45780', await dsgd.decimals()));

  const swapAddr = '0xd910e00b08a58fACa8355a1d5b3675A9329e64f4';
  // const swapDeployment = await deployments.get('Swap');
  const swap = (await ethers.getContractFactory('Swap'))
    .attach(swapAddr)
    .connect(deployerSigner);

  // mint PBM token 0 -> 1 xsgd, 1 -> 2 dsgd, 2 -> 5 xsgd, 3 -> 0.1 xsgd
  const test1 = '0xed8bd195e027d21ca94f2ac11dd70767e212f60d';
  const test2 = '0xfd92d326f5363826ba960cc2983cf80593e60f03';
  const jacob = '0x8CC4D23D8556Fdb5875F17b6d6D7149380F24D93';

  // mint dummy XSGD
  // await xsgd.mint(swap.address, ethers.utils.parseUnits('1000000', 6))
  // await xsgd.mint(victorAddr, ethers.utils.parseUnits('1000000', 6))

  const mintTo = [jacob];
  for (let i = 0; i < mintTo.length; i++) {
    const mintTxn = await pbm.batchMint([0], [100], mintTo[i]);
    const receipt = await mintTxn.wait();
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
