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

  console.log('dummy DSGD on arbitrum: ', dsgdDeployment.address);

  const xsgdDeployment = await deploy('Spot', {
    from: deployer,
    args: ['XSGD', 'XSGD', 6],
    log: true,
  });

  // bridged XSGD on arbitrum: 0xa05245Ade25cC1063EE50Cf7c083B4524c1C4302
  // const xsgdAddress = '0xa05245Ade25cC1063EE50Cf7c083B4524c1C4302';
  // const dsgdAddress = '0x057B501fD1daF8FB0E232C7003AaFe5500e4efc0';

  // Mumbai XSGD address = "0x16e28369bc318636abbf6cb1035da77ffbf4a3bc"
  await deploy('Swap', {
    from: deployer,
    args: [dsgdDeployment.address, xsgdDeployment.address],
    log: true,
  });
};
