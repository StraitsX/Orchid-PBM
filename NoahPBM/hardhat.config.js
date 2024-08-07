require("dotenv").config({ debug: true });
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ledger");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("hardhat-tracer");
require("hardhat-abi-exporter");
require("hardhat-deploy");
const { Wallet } = require("ethers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
  abiExporter: {
    path: "./abi",
    runOnCompile: true,
    clear: true,
    flat: true,
    only: ["PBM"],
    spacing: 2,
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      deploy: ["deploy/"],
    },
    holesky: {
      accounts: [
        Wallet.fromMnemonic(process.env.DEPLOYER_MNEMONIC).privateKey,
        Wallet.fromMnemonic(process.env.ADMIN_MNEMONIC).privateKey,
      ],
      url: process.env.HOLESKY_NODE_HTTP_URL,
      network_id: 17000,
      saveDeployments: true,
      deploy: ["deploy/"],
      tags: ["holesky"],
    },

    holeskyLedger: {
      ledgerAccounts: [
        "0x992b27192082aa84334904c337309B9D219777CA",
      ],

      url: process.env.HOLESKY_NODE_HTTP_URL,
      network_id: 17000,
      saveDeployments: true,
      deploy: ["deploy/"],
      tags: ["holeskyLedger"],
    },

    sepolia: {
      accounts: [
        Wallet.fromMnemonic(process.env.DEPLOYER_MNEMONIC).privateKey,
        Wallet.fromMnemonic(process.env.ADMIN_MNEMONIC).privateKey,
      ],
      url: process.env.SEPOLIA_NODE_HTTP_URL,
      network_id: 11155111,
      saveDeployments: true,
      deploy: ["deploy/"],
      tags: ["sepolia"],
    },
    polygon: {
      accounts: [Wallet.fromMnemonic(process.env.DEPLOYER_MNEMONIC).privateKey],
      url: process.env.POLYGON_MAINNET_NODE_HTTP_URL,
      network_id: 137,
      confirmations: 2,
      timeoutBlocks: 200,
      gas: 6000000,
      gasPrice: 230000000000,
      skipDryRun: true,
      saveDeployments: true,
      deploy: ["deploy/"],
      tags: ["mainnet"],
    },
    orcSubnet: {
      accounts: [Wallet.fromMnemonic(process.env.DEPLOYER_MNEMONIC).privateKey],
      url: process.env.ORC_SUBNET_NODE_HTTP_URL,
      network_id: 234560,
      saveDeployments: true,
      deploy: ["deploy/"],
      tags: ["orcSubnet"],
    },
    fuji: {
      accounts: [Wallet.fromMnemonic(process.env.DEPLOYER_MNEMONIC).privateKey],
      url: process.env.FUJI_NODE_HTTP_URL,
      network_id: 43113,
      saveDeployments: true,
      deploy: ["deploy/"],
      tags: ["fuji"],
    },
    avax: {
      accounts: [Wallet.fromMnemonic(process.env.DEPLOYER_MNEMONIC).privateKey],
      url: process.env.AVAX_NODE_HTTP_URL,
      network_id: 43114,
      saveDeployments: true,
      deploy: ["deploy/"],
      tags: ["avax"],
    },
    straitsxSubnet: {
      accounts: [Wallet.fromMnemonic(process.env.DEPLOYER_MNEMONIC).privateKey],
      url: process.env.STRAITSX_SUBNET_HTTP_URL,
      network_id: 5566,
      saveDeployments: true,
      deploy: ["deploy/"],
      tags: ["straitsxSubnet"],
    }
  },
  etherscan: {
    apiKey: {
      polygon: process.env.POLYGON_SCAN_API_KEY,
      sepolia: process.env.SEPOLIA_SCAN_API_KEY,
      holesky: process.env.ETHER_SCAN_API_KEY,
      fuji: process.env.SNOW_SCAN_API_KEY,
      avax: process.env.SNOW_SCAN_API_KEY,
    },
    customChains: [
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://api-sepolia.etherscan.io/api",
          browserURL: "https://sepolia.etherscan.io/",
        },
      },
      {
        network: "polygon",
        chainId: 137,
        urls: {
          apiURL: "https://api.polygonscan.com/api",
          browserURL: "https://polygonscan.com",
        },
      },
      {
        network: "holesky",
        chainId: 17000,
        urls: {
          apiURL: "https://api-holesky.etherscan.io/api",
          browserURL: "https://holesky.etherscan.io/",
        },
      },
      {
        network: "fuji",
        chainId: 43113,
        urls: {
          apiURL:
              "https://api-testnet.snowscan.xyz/api",
          browserURL: "https://testnet.snowscan.xyz",
        },
      },
      {
        network: "avax",
        chainId: 43114,
        urls: {
          apiURL:
              "https://api.snowscan.xyz/api",
          browserURL: "https://snowscan.xyz/",
        },
      },
    ],
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
};
