const { deployments } = require('hardhat');
const hre = require('hardhat');
async function main() {
  const addressListDeployment = await deployments.get('PBMAddressList');
  const pbmDeployment = await deployments.get('PBM');
  const dsgdDeployment = await deployments.get('Spot');
  const swapDeployment = await deployments.get('Swap');

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
    address: dsgdDeployment.address,
    constructorArguments: ['DSGD', 'DSGD'],
  });
  console.log(`Verified DSGD test token at ${dsgdDeployment.address}`);

  console.log('Verifying Swap');
  await hre.run('verify:verify', {
    address: swapDeployment.address,
    constructorArguments: [dsgdDeployment.address, dsgdDeployment.address],
  });

  console.log(`Verified Swap at ${swapDeployment.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
