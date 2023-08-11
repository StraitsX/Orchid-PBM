module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  await deploy('PBMAddressList', {
    from: deployer,
    args: [],
    log: true,
  });
  await deploy('PBM', {
    from: deployer,
    args: [],
    log: true,
  });
  const dsgdDeployment = await deploy('Spot', {
    from: deployer,
    args: ['DSGD', 'DSGD', 2],
    log: true,
  });

  const xsgdDeployment = await deploy('Spot', {
    from: deployer,
    args: ['XSGD', 'XSGD', 6],
    log: true,
  });

  // Mumbai XSGD address = "0x16e28369bc318636abbf6cb1035da77ffbf4a3bc"
  await deploy('Swap', {
    from: deployer,
    args: [dsgdDeployment.address, xsgdDeployment.address],
    log: true,
  });
};
