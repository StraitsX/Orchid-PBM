require('dotenv').config({ debug: true });
require('@nomicfoundation/hardhat-toolbox');
require('hardhat-contract-sizer');
require('hardhat-gas-reporter');
require('hardhat-tracer');
require('hardhat-abi-exporter');
require('hardhat-deploy');
const { Wallet } = require('ethers');

const DEPLOYER_MNEMONIC = process.env.DEPLOYER_MNEMONIC;
const POLYGON_MUMBAI_NODE_HTTP_URL = process.env.POLYGON_MUMBAI_NODE_HTTP_URL;
const POLYGON_MAINNET_NODE_HTTP_URL = process.env.POLYGON_MAINNET_NODE_HTTP_URL;
const ARB_TESTNET_NODE_HTTP_URL = process.env.ARB_TESTNET_NODE_HTTP_URL;

const POLYGON_SCAN_API_KEY = process.env.POLYGON_SCAN_API_KEY;
const MUMBAI_SCAN_API_KEY = process.env.MUMBAI_SCAN_API_KEY;
const ARB_SCAN_API_KEY = process.env.ARB_SCAN_API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.9',
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
    path: './abi',
    runOnCompile: true,
    clear: true,
    flat: true,
    only: ['HeroNFT'],
    spacing: 2,
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      deploy: ['deploy/'],
    },
    mumbai: {
      accounts: [Wallet.fromMnemonic(DEPLOYER_MNEMONIC).privateKey],
      url: POLYGON_MUMBAI_NODE_HTTP_URL,
      network_id: 80001,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      saveDeployments: true,
      deploy: ['deploy/'],
      tags: ['testnet'],
    },
    amoy: {
      accounts: [
        Wallet.fromMnemonic(DEPLOYER_MNEMONIC).privateKey,
      ],
      url: process.env.AMOY_RPC_URL,
      network_id: 80002,
      saveDeployments: true,
      deploy: ["deploy/"],
      tags: ["amoy"],
    },
    polygon: {
      accounts: [Wallet.fromMnemonic(DEPLOYER_MNEMONIC).privateKey],
      url: POLYGON_MAINNET_NODE_HTTP_URL,
      network_id: 137,
      confirmations: 2,
      timeoutBlocks: 200,
      gas: 6000000,
      gasPrice: 230000000000,
      skipDryRun: true,
      saveDeployments: true,
      deploy: ['deploy/'],
      tags: ['mainnet'],
    },
  },
  etherscan: {
    apiKey: {
      mumbai: MUMBAI_SCAN_API_KEY,
      polygon: POLYGON_SCAN_API_KEY,
      arbgo: ARB_SCAN_API_KEY,
    },
    customChains: [
      {
        network: 'mumbai',
        chainId: 80001,
        urls: {
          apiURL: 'https://api-testnet.polygonscan.com/api',
          browserURL: 'https://mumbai.polygonscan.com',
        },
      },
      {
        network: 'polygon',
        chainId: 137,
        urls: {
          apiURL: 'https://api.polygonscan.com/api',
          browserURL: 'https://polygonscan.com',
        },
      },
      {
        network: 'arbgo',
        chainId: 421613,
        urls: {
          apiURL: 'https://api-goerli.arbiscan.io/',
          browserURL: 'https://goerli.arbiscan.io/',
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
