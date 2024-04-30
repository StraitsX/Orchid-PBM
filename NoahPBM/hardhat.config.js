require('dotenv').config({ debug: true });
require("@nomicfoundation/hardhat-toolbox");
require('hardhat-contract-sizer');
require("hardhat-gas-reporter");
require("hardhat-tracer");
require('hardhat-abi-exporter');
require('hardhat-deploy');
const { Wallet } = require('ethers');

const DEPLOYER_MNEMONIC = process.env.DEPLOYER_MNEMONIC;
const POLYGON_RPC_URL = process.env.POLYGON_MAINNET_NODE_HTTP_URL;
const POLYGON_SCAN_API_KEY = process.env.POLYGON_SCAN_API_KEY;
const MUMBAI_SCAN_API_KEY = process.env.MUMBAI_SCAN_API_KEY;

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
        only: ['PBM'],
        spacing: 2,
    },
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            deploy: ['deploy/'],
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
            accounts: [
                Wallet.fromMnemonic(DEPLOYER_MNEMONIC).privateKey,
            ],
            url: POLYGON_RPC_URL,
            network_id: 137,
            confirmations: 2,
            timeoutBlocks: 200,
            gas: 6000000,
            gasPrice: 230000000000,
            skipDryRun: true,
            saveDeployments: true,
            deploy: [ 'deploy/' ],
            tags: ["mainnet"],
        },
    },
    etherscan: {
        apiKey: {
            mumbai: MUMBAI_SCAN_API_KEY,
            polygon: POLYGON_SCAN_API_KEY,
            sepolia: process.env.SEPOLIA_SCAN_API_KEY,
            holesky: process.env.ETHER_SCAN_API_KEY,
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
                network: 'polygon',
                chainId: 137,
                urls: {
                    apiURL: 'https://api.polygonscan.com/api',
                    browserURL: 'https://polygonscan.com',
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
        ],
    },
    namedAccounts: {
        deployer: {
            default: 0,
        }
    }
};