module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  // await deploy('PBMAddressList', {
  //   from: deployer,
  //   args: [],
  //   log: true,
  // });
  await deploy("PBM", {
    from: deployer,
    args: [],
    log: true,
  });
  // const dsgdDeployment = await deploy('Spot', {
  //   from: deployer,
  //   args: ['DSGD', 'DSGD', 2],
  //   log: true,
  // });

  // const xsgdDeployment = await deploy('Spot', {
  //   from: deployer,
  //   args: ['XSGD', 'XSGD', 6],
  //   log: true,
  // });

  const xsgdAddress = "0xDC3326e71D45186F113a2F448984CA0e8D201995";
  const dsgdAddress = "0x057B501fD1daF8FB0E232C7003AaFe5500e4efc0";

  // Mumbai XSGD address = "0x16e28369bc318636abbf6cb1035da77ffbf4a3bc"
  await deploy("Swap", {
    from: deployer,
    args: [dsgdAddress, xsgdAddress],
    log: true,
  });
};

module.exports.tags = ["pbm"];
