module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const gasPrice = 15000000000; // 15 gwei
  await deploy('PBMAddressList', {
    from: deployer,
    args: [],
    log: true,
    gasPrice: gasPrice,
  });
  await deploy('PBM', {
    from: deployer,
    args: [],
    log: true,
    gasPrice: gasPrice,
  });
  const dsgdDeployment = await deploy('Spot', {
    from: deployer,
    args: ['DSGD', 'DSGD', 2],
    log: true,
    gasPrice: gasPrice,
  });

  // const xsgdDeployment = await deploy('Spot', {
  //   from: deployer,
  //   args: ['XSGD', 'XSGD', 6],
  //   log: true,
  // });

  const xsgdAddress = '0xd769410dc8772695A7f55a304d2125320A65c2a5';
  const dsgdAddress = dsgdDeployment.address;
  console.log('DSGD address =', dsgdAddress);

  // Mumbai XSGD address = "0x16e28369bc318636abbf6cb1035da77ffbf4a3bc"
  await deploy('Swap', {
    from: deployer,
    args: [dsgdAddress, xsgdAddress],
    log: true,
    gasPrice: gasPrice,
  });
};
