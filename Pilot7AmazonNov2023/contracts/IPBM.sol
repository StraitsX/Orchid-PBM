// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

/// @title PBM interface
/// @notice The PBM (purpose bound money) allows us to add logical requirements on the use of ERC-20 tokens. The PBM acts as wrapper around the ERC-20 tokens and implements the necessary logic.
interface IPBM {
    /// @notice sets the address of the underlying ERC20 token, Contract Expiry, and the address of pbm address list
    /// @param _spotToken address of the underlying ERC20 token
    /// @param _expiry contract wide expiry ( in epoch )
    function initialise(address _spotToken, uint256 _expiry) external;

    /// @notice Creates a new PBM token type with the data provided
    /// @param spotAmount Amount of the underlying ERC-20 tokens the PBM type wraps around
    /// @param tokenExpiry The expiry date (in epoch) for this particular PBM token type
    /// @param tokenURI the URI (returns json) of PBM type that will follows the Opensea NFT metadata standard
    /// @param postExpiryURI the URI (returns json) of expired PBM type that will follows the Opensea NFT metadata standard
    /**
     * example response of token URI, ref : https://docs.opensea.io/docs/metadata-standards
     * {
     *     "name": "StraitsX-12",
     *     "description": "12$ SGD test voucher",
     *     "image": "https://gateway.pinata.cloud/ipfs/QmQ1x7NHakFYin9bHwN7zy4NdSYS84w6C33hzxpZwCAFPu",
     *     "attributes": [
     *         {
     *         "trait_type": "Value",
     *         "value": "12"
     *         }
     *     ]
     * }
     */
    function createPBMTokenType(
        uint256 spotAmount,
        uint256 tokenExpiry,
        string memory tokenURI,
        string memory postExpiryURI
    ) external;

    /// @notice Creates new PBM copies ( ERC1155 NFT ) of an existing PBM token type after ensuring it is backed by the necessary value of the underlying ERC-20 tokens
    /// @param tokenId The identifier of the PBM token type
    /// @param amount The number of the PBMs that are to be created
    /// @param receiver The wallet address to which the created PBMs need to be transferred to
    function mint(uint256 tokenId, uint256 amount, address receiver) external;

    /// @notice Creates new PBM copies ( ERC1155 NFT ) of multiple existing PBM token types after ensuring they are backed by the necessary value of the underlying ERC-20 tokens
    /// @param tokenId The identifier of the PBM account type
    /// @param amount The number of the PBMs that are to be created for each tokenId
    /// @param receivers The wallet addresses to which the created PBMs need to be transferred to
    function mintBatch(uint256 tokenId, uint256 amount, address[] memory receivers) external;

    /// @notice Doesn't transfer the underlying ERC20 tokens. Instead, it only updates the user balances within this contract.
    /// @param from The account from which the balance is moving from
    /// @param to The account which is receiving the balance
    /// @param id The identifier of the PBM token type(account id)
    /// @param amount The number of (quantity) the PBM type, which should always be 1.
    /// @param data To record any data associated with the transaction, can be left blank if none
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) external;

    /// @notice Doesn't transfer the underlying ERC20 tokens. Instead, it only updates the user balances within this contract.
    /// @param from The account from which the balance is moving from
    /// @param to The account which is receiving the balance
    /// @param ids The identifiers of the different PBM token type(account ids)
    /// @param amounts The number of (quantity) the PBM type, which should always be 1.
    /// @param data To record any data associated with the transaction, can be left blank if none.
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external;

    /// @notice Allows the creator of the PBM type to retrive all the locked up ERC-20 once they have expired for that particular token type
    function revokePBM() external;

    /// @notice Get the details of the PBM Token type
    /// @param tokenId The identifier of the PBM token type
    /// @return amount Amount of the underlying ERC-20 tokens the PBM type wraps around
    /// @return expiry The expiry date (in epoch) for this particular PBM token type.
    function getTokenDetails(uint256 tokenId) external view returns (uint256, uint256);

    /// @notice Get the URI of the tokenid
    /// @param tokenId The identifier of the PBM token type
    /// @return uri The URI link , which will povide a response that follows the Opensea metadata standard
    function uri(uint256 tokenId) external view returns (string memory);

    /// @notice Emitted when a PBM type creator withdraws the underlying ERC-20 tokens from all the remaining expired PBMs
    /// @param beneficiary the address ( PBM type creator ) which receives the ERC20 Token
    /// @param ERC20Token The address of the underlying ERC-20 token
    /// @param ERC20TokenValue The number of underlying ERC-20 tokens transferred
    event PBMrevokeWithdraw(address beneficiary, address ERC20Token, uint256 ERC20TokenValue);
}
