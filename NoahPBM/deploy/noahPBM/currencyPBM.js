module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying CurrencyPBM Contract...");
  const currencyPBMDeployment = await deploy("CurrencyPBM", {
    from: deployer,
    log: true,
  });
  console.log(`CurrencyPBM deployed at ${currencyPBMDeployment.address}`);
};

module.exports.tags = ["CurrencyPBM"];
