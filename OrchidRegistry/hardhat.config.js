// Import hardhat plugins
require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-web3");

// Import the secrets file
require('dotenv').config()

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.18", // First compiler version
      },
    ],
  },
  networks: {
    mumbai: {
      url: `${process.env.MUMBAI_RPC_URL}`,
      accounts: process.env.PRIVATE_KEYS.split(","),
    },
  },
  // Enter API_Key for polygonscan. Note the we use "etherscan" as keyword because the hardhat plugin looks for "etherscan" in the config. However, the API key should be a polygonscan API key. 
  etherscan: {
    apiKey: {
      polygonMumbai: `${process.env.POLYGONSCAN_API_KEY}`
    }
  },

};
