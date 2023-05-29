# Orchid-PBM ( Commercial )

## Token Description
PBM or Purpose Bound Money is a protocol that implements a purpose layer in the form of smart contract code which specifies the conditions upon which an underlying digital currency can be used. The purpose layer could be programmed whereby the PBM can only be utilized (only) for its intended purposes, such as validity within a certain period, at specific retailers, and in predetermined denominations. Once the conditions specified in the Purpose Layer is met, the underlying backing currency will be released, and transferred to the recipient. 

When the conditions of a PBM is fulfilled, the underlying digital currency backing the PBM is released, and ownership is transferred to the target recipient. To fulfil the requirements to be a backing currency, a digital asset needs to be a good store of value, unit of account and a medium of exchange. Backing currency could come in the form of CBDCs, tokenised deposits or securely backed stablecoins. A backing currency could be in the form of a programmable money, whereby the digital currency itself could come with a set of usage criteria. For example, the backing currency could be implemented as an ERC-20 fungible token smart contract.

This implmentation of the PBM is developed to support mulitple issuers, issuing different PBM types each with their own configuration. It was designed to be piloted at large scale public event, where different sponors could issue their own PBMs through one singular contract which could be spent at on-site F&B stores for food. 

The PBM contract is built on the  ERC-1155 semi-fungible contract. 

## Pre-requisites
Ensure that you are using node 14.x, and using nvm is highly recommended. 

install nvm:
`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash`

install node 14.x (in this example, node 14.18.1):
`nvm install 14.18.1`
## Installation
install truffle:
`npm install -g truffle`

install ganache-cli:
`npm install -g ganache-cli`

clone the repo and cd into it
`git clone https://github.com/Xfers/Orchid-PBM.git`

install project npm dependencies:
`npm install`

intall plug-in dependencies manually
```
npm i truffle-plugin-verify
npm i truffle-contract-size
```

create .env file
`touch .env`

edit the .env file
`vi .env`


### .env considerations

-   If you wish to deploy to mainnet or testnets, including mumbai, you will also need to specify `DEPLOYER_MNEMONIC`, `ACCESS_TOKEN`.
-   `DEPLOYER_MNEMONIC` is the mnemonic of a HD wallet with which the deployer account is the first address. This deployer account will be used for deploying the contracts and should already have some ETH in it. If you do not have this, you can generate a mnemonic [here](https://iancoleman.io/bip39/#english) and get some testnet eth from this [faucet](https://faucet.metamask.io/).
-   `ACCESS_TOKEN` is your infura/alechemy project id. If you do not have one, please make an account on the [official infura website](https://infura.io/) or [official Alchemy website](https://dashboard.alchemyapi.io/) and create a project.
-   `POLYGON_SCAN_API_KEY` is the api key that you can retrieve from [polygonscan](https://polygonscan.com/myapikey)
-   `ETH_SCAN_API_KEY` is the api key that you cna retrive from [etherscan](httsp://etherscan.com/myapikey)
-   See the example .env file below for a full example.

#### Example .env file
```
DEPLOYER_MNEMONIC="increase claim burden grief voyage kingdom crawl master body dice firm siren engage glow museum flash fatigue minute letter rubber learn whale goat mass"
ACCESS_TOKEN=0123456789abcdef01234567abcdef01
POLYGON_SCAN_API_KEY="testkeyadfkjaadfad"
ETH_SCAN_API_KEY="testkeyadfkjaadfad"
```
## Setting up the RPC endpoint for your target blockchain newtork
Find and add the RPC endpoint for your target blockchain. For example, in the case of matic that would be 
```
    matic: {
      provider: () => new HD_WALLET_PROVIDER(DEPLOYER_MNEMONIC, `wss://polygon-mainnet.g.alchemy.com/v2/${ACCESS_TOKEN}`),
      network_id: 137,
      confirmations: 2,
      timeoutBlocks: 200,
      gas: 4500000,
      gasPrice: 35000000000,
      skipDryRun: true
    },

```
Your ACCESS_TOKEN as mentioned above will need to be set up with a service provider like infura or alchemy. 

# Deploying and setting up of smartcontracts

# Testing

For Polygon initial deployment:

Once your set up is done, in the root folder run the following commands. 
Ensure that you have enough crypto in the provided addresses and that gas and gasPrice are tuned according to the network. 
Replace "name" with your network identifier mentioned in [truffle-config.js]
```
truffle compile 
truffle migrate --network <name>
```

To run specific migration files, run `truffle migrate --network <name> -f 1 --to 2` , 1 and 2 being the file numbers you can see at the front of each file in the migrations folder.

# Going live 

If you plan on launching the PBM on a mainnet or testnet and want to use the PBM with an existing ERC20 on that network, ensure that you comment out the deployment of ERC20 in the the migration file `2_deploy_spot.js`. Then add the contract address of the ERC-20 token in the migration file `3_deploy_pbm.js`.  Both of the files can be found in the `migrations` folder. 

# Verfication of deployed smartcontracts 
Once you've added the necessary api keys to you .env file, and import/linked it up in the truffle config `api_keys` section, run the following command to verify your smartcontract. 

```
truffle run verify <ArtifactName>@<smartContractAddress> --network <EVM network>
```
Example : (Verfication of the PBM token contract on the polygon mainnet)
```
truffle run verify PBM@0x735e27546C7d2fE3c097F880E258C96eA66597b7 --network matic
```
# Testing

All tests are run with:
`npm run truffle-test`

or run a specific file of tests with:
`npm run truffle-test -- [file]`

to generate test coverage on all tests run:
`npm test`