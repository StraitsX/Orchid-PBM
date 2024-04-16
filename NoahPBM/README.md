## Noah PBM

Noah is the name of our internal blockchain crawler system for the Project Orchid payment network. PBM refers to Purpose Bound Money smart contracts. You can find more information about PBM at [EIP-7291](https://eips.ethereum.org/EIPS/eip-7291).

Noah PBM defines a set of standards that PBM implementations must adhere to in order to function with our internal Noah Crawler.

The following interface and standards are defined for Noah PBM:

## ICompliantService

`ICompliantService` defines a set of events required to be emitted for compliance check purposes. Additionally, it outlines common functions for country / campaign-specific compliance checks. 

This interface facilitates interoperability and consistency across different PBM implementations.