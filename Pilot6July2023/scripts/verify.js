const { deployments } = require('hardhat');
const hre = require('hardhat');
async function main() {
  const addressListDeployment = await deployments.get('PBMAddressList');
  const pbmDeployment = await deployments.get('PBM');
  const swapDeployment = await deployments.get('Swap');

  // mainnet fake stablecoin address
  // const xsgdAddress = '0x787bD10Bb65AE206f70759D88a2ffc0F2653C0F6';
  // const dsgdAddress = '0xd769410dc8772695A7f55a304d2125320A65c2a5';

  // mumbai xsgd and 2 decimals dsgd addresses
  const xsgdAddress = '0x16e28369bc318636abbf6cb1035da77ffbf4a3bc';
  const dsgdAddress = '0xD2a6a1F2954a04EF90152da0fC9E15b5c68E7A69';

  console.log('Verifying PBMAddressList');
  await hre.run('verify:verify', {
    address: addressListDeployment.address,
    constructorArguments: [],
  });
  console.log(`Verified PBMAddressList at ${addressListDeployment.address}`);

  console.log('Verifying PBM');

  await hre.run('verify:verify', {
    address: pbmDeployment.address,
    constructorArguments: [],
  });

  console.log(`Verified PBM at ${pbmDeployment.address}`);

  console.log('Verifying DSGD test token');
  await hre.run('verify:verify', {
    address: dsgdAddress,
    constructorArguments: ['DSGD', 'DSGD', 2],
  });
  console.log(`Verified DSGD test token at ${dsgdAddress}`);

  console.log('Verifying XSGD test token');
  await hre.run('verify:verify', {
    address: xsgdAddress,
    constructorArguments: ['XSGD', 'XSGD', 6],
  });
  console.log(`Verified XSGD test token at ${xsgdAddress}`);

  console.log('Verifying Swap');
  await hre.run('verify:verify', {
    address: swapDeployment.address,
    constructorArguments: [dsgdAddress, xsgdAddress],
  });

  console.log(`Verified Swap at ${swapDeployment.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
