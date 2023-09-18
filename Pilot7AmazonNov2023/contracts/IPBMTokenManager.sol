// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title PBMTokenManager Interface.
/// @notice The PBMTokenManager is the stores details of the different data types.
interface IPBMTokenManager {
    /// @notice Returns the URI (metadata) for the PBM with the corresponding tokenId
    /// @param tokenId The id for the PBM in query
    /// @return Returns the metadata URI for the PBM
    function uri(uint256 tokenId) external view returns (string memory);

    /// @notice Checks if tokens Ids have been created and are not expired
    /// @param tokenIds The ids for the PBM in query
    /// @return Returns true if all the tokenId are valid else false
    function areTokensValid(uint256[] memory tokenIds) external view returns (bool);

    /// @notice gets the amount of underlying ERC20 tokens each of the the PBM type holds
    /// @param tokenId The id for the PBM in query
    /// @return Returns the initial ERC20 balance of the PBM account
    function getTokenValue(uint256 tokenId) external view returns (uint256);

    /// @notice Retreive the details for a PBM
    /// @param tokenId The id for the PBM in query
    /// @return spotAmount Amount of underlying ERC20 held by the each of the PBM token
    /// @return expiry  Expiry time (in epoch) for the PBM type
    function getTokenDetails(uint256 tokenId) external view returns (uint256 spotAmount, uint256 expiry);

    /// @notice Creates a PBM token type, with all its necessary details
    /// @param spotAmount The number of ERC-20 tokens that is used as the underlying currency for PBM
    /// @param tokenExpiry The expiry date (in epoch) of th PBM type
    /// @param tokenURI the URI containting the metadata (opensea standard for ERC1155) for the  PBM type
    /// @param postExpiryURI the URI containting the metadata (opensea standard for ERC1155) for the expired PBM type
    /// @param contractExpiry the expiry time (in epoch) for the overall PBM contract
    function createTokenType(
        uint256 spotAmount,
        uint256 tokenExpiry,
        string memory tokenURI,
        string memory postExpiryURI,
        uint256 contractExpiry
    ) external;

    /// @notice Event emitted when a new PBM token type is created
    /// @param tokenId The account from which the tokens were sent, i.e. the balance decreased
    /// @param amount The amount of tokens that were transferred
    /// @param expiry The time (in epoch) when the PBM type will expire
    event NewPBMTypeCreated(uint256 tokenId, uint256 amount, uint256 expiry);
}
