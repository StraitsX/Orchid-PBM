require('dotenv').config({ debug: true });
require("@nomicfoundation/hardhat-toolbox");
require('hardhat-contract-sizer');
require("hardhat-gas-reporter");
require("hardhat-tracer");
require('hardhat-abi-exporter');
require('hardhat-deploy');
const { Wallet } = require('ethers');

const DEPLOYER_MNEMONIC = process.env.DEPLOYER_MNEMONIC;
const ALCHEMY_ACCESS_TOKEN = process.env.ALCHEMY_ACCESS_TOKEN;
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
            deploy: ['migrations/'],
        },
        mumbai: {
            accounts: [
                Wallet.fromMnemonic(DEPLOYER_MNEMONIC).privateKey,
            ],
            url: `https://polygon-mumbai.g.alchemy.com/v2/${ALCHEMY_ACCESS_TOKEN}`,
            network_id: 80001,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: true,
            saveDeployments: true,
            deploy: ['migrations/'],
            tags: ["testnet"],
        },
        polygon: {
            accounts: [
                Wallet.fromMnemonic(DEPLOYER_MNEMONIC).privateKey,
            ],
            url: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_ACCESS_TOKEN}`,
            network_id: 137,
            confirmations: 2,
            timeoutBlocks: 200,
            gas: 4500000,
            gasPrice: 35000000000,
            skipDryRun: true,
            saveDeployments: true,
            deploy: [ 'migrations/' ],
            tags: ["mainnet"],
        },
    },
    etherscan: {
        apiKey: {
            mumbai: MUMBAI_SCAN_API_KEY,
            polygon: POLYGON_SCAN_API_KEY,
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
        ],
    },
    namedAccounts: {
        deployer: {
            default: 0,
        }
    }
};