require('dotenv').config({ debug: true });
require("@nomicfoundation/hardhat-toolbox");
require('hardhat-contract-sizer');
require("hardhat-gas-reporter");
require("hardhat-tracer");
require('hardhat-abi-exporter');
require('hardhat-deploy');
const { Wallet } = require('ethers');

const DEPLOYER_MNEMONIC = process.env.DEPLOYER_MNEMONIC;
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL;
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL;
const POLYGON_SCAN_API_KEY = process.env.POLYGON_SCAN_API_KEY;
const MUMBAI_SCAN_API_KEY = process.env.MUMBAI_SCAN_API_KEY;
const ARBI_RPC_URL = process.env.ARBI_RPC_URL;
const ARBI_SCAN_API_KEY = process.env.ARBI_SCAN_API_KEY;

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
            loggingEnabled: true,
        },
        mumbai: {
            accounts: [
                Wallet.fromMnemonic(DEPLOYER_MNEMONIC).privateKey,
            ],
            url: MUMBAI_RPC_URL,
            network_id: 80001,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: true,
            saveDeployments: true,
            deploy: ['deploy/'],
            tags: ["testnet"],
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
        arbitrum: {
            accounts: [
                Wallet.fromMnemonic(DEPLOYER_MNEMONIC).privateKey,
            ],
            url: ARBI_RPC_URL,
            network_id: 42161,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: true,
            saveDeployments: true,
            deploy: ['deploy/'],
            tags: ["mainnet"],
            loggingEnabled: true,
        }
    },
    etherscan: {
        apiKey: {
            mumbai: MUMBAI_SCAN_API_KEY,
            polygon: POLYGON_SCAN_API_KEY,
            arbitrum: ARBI_SCAN_API_KEY,
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
                network: 'arbitrum',
                chainId: 42161,
                urls: {
                    apiURL: 'https://api.arbiscan.io/api',
                    browserURL: 'https://arbiscan.io',
                },
            }
        ],
    },
    namedAccounts: {
        deployer: {
            default: 0,
        }
    }
};