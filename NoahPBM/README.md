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