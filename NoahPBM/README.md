## Noah PBM

Noah is the name of our internal blockchain crawler system for the Project Orchid payment network. PBM refers to Purpose Bound Money smart contracts. You can find more information about PBM at [EIP-7291](https://eips.ethereum.org/EIPS/eip-7291).

Noah PBM defines a set of standards that PBM implementations must adhere to in order to function with our internal Noah Crawler.

The following interface and standards are defined for Noah PBM:

## ICompliantService

`ICompliantService` defines a set of events required to be emitted for compliance check purposes. Additionally, it outlines common functions for country / campaign-specific compliance checks. 

This interface facilitates interoperability and consistency across different PBM implementations.

## Proxy and upgradeability 

If upgradeability is required on a PBM, the recommended approach is to use [Openzeppelin](https://docs.openzeppelin.com/contracts/5.x/api/proxy#UUPSUpgradeable-_authorizeUpgrade-address-) `TransparentUpgradeableProxy`

UUPS is not required unless we want to upgrade the proxy itself on a regular basis. We want to keep things simple and just use a TransparentProxy at the expense of being able to upgrade the proxy contract itself. 

Proxy contracts are copied from th [Openzeppelin Github](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.1/contracts/proxy/transparent/TransparentUpgradeableProxy.sol) repo for ease of deployment and acts as a snaphot.

# NoahPaymentManager
Noah PBM defines a payment manager smart contract that helps seperates the logic of making payments from the PBM business logic itself. 
The NoahpaymentManager is to be used inconjunction with an oracle service to subscribe to various payment events 

# Development notes

This repository uses nix to standardize the deployment environment. You may
visit https://nixos.org/download to download nix before running any scripts.

nix environment can be initialized with `nix develop` which would start a nix
shell. Run `npm install` to install the relevant nodejs packages required to run
the scripts in this repository.

# Running tests
`npx hardhat clean` `npx hardhat compile` `npx hardhat test`
`npx hardhat test test/myfile.js`

# Deploying
hardhat.config.js is configured for the following networks:
`npx hardhat deploy --network polygon` 
`npx hardhat deploy --network holesky`

To deploy a specific file, use the tags param. Tags are defined at the end of
each deployment file, e.g.
`npx hardhat deploy --network holesky --tags pbm --reset`


# Deploy with ledger nano

Define hardhat config like so, in order to have a dedicated network / account space for hardhat-ledger plugin to work.

To deploy, execute `npx hardhat deploy --network holeskyLedger --tags LedgerDeployMockContract --reset` 

```
    holeskyLedger: {
      // delete this -> accounts: [ad6cf9712936300786e38758eac9c21c3c25259ec3bf0826e1eed363349ef2f4],
      ledgerAccounts: [
        "0x992b27192082aa84334904c337309B9D219777CA",
      ],
      url: process.env.HOLESKY_NODE_HTTP_URL,
      network_id: 17000,
      saveDeployments: true,
      deploy: ["deploy/"],
      tags: ["holeskyLedger"],
    },
```

This is because the `accounts` field and the `ledgerAccounts` cannot co-exists when we use `hardhat-deploy` plugin. 

The reason can be found by looking at the [source code of hardhat-deploy](https://github.com/wighawag/hardhat-deploy/blob/master/src/helpers.ts), signers are defined in an if-else condition and not to be used in tandem.


Check the following output to match the public address of your ledger nano like so: 

```  
console.log(await ethers.getSigner());
```


Deploying or signing a transaction from the signer public wallet address will result in the provider trying to connect to the Ledger wallet and find a derivation path for that address. 

By default, the derivation paths that are tried start [from m/44'/60'/0'/0'/0 and go way up to m/44'/60'/20'/0'/0](https://github.com/NomicFoundation/hardhat/blob/11f13e547d2b665c9335d7850dd928cf32ff60b1/packages/hardhat-ledger/src/provider.ts#L346). 

Side note on how local providers are injected [can be found here](https://github.com/NomicFoundation/hardhat/blob/11f13e547d2b665c9335d7850dd928cf32ff60b1/packages/hardhat-core/src/internal/core/providers/accounts.ts#L19).