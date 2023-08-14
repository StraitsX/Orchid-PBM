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
  // mainnet dummy XSGD = "0x787bD10Bb65AE206f70759D88a2ffc0F2653C0F6"
  // const dummyXSGD = "0x787bD10Bb65AE206f70759D88a2ffc0F2653C0F6"
  // mainnet dummy dsgd 2 decimals = "0xB8952917c73100867fE4c27Bd4dD683436fCA9a2"
  // const dummyDsgd = "0xB8952917c73100867fE4c27Bd4dD683436fCA9a2"

  // realXSGD on polygon
  const realXSGD = "0xDC3326e71D45186F113a2F448984CA0e8D201995"
  await deploy('Swap', {
    from: deployer,
    args: [dsgdDeployment.address, realXSGD],
    log: true,
  });
};
