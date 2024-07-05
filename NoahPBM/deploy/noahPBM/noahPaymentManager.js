module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying noahPaymentManager Contract...");
  const noahPaymentManagerrDeployment = await deploy("NoahPaymentManager", {
    from: deployer,
    log: true,
  });
  console.log(`NoahPaymentManager deployed at ${noahPaymentManagerrDeployment.address}`);
};

module.exports.tags = ["NoahPaymentManager"];
