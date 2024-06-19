// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Holds the underlying wrapped token for a list of campaign PBM
interface INoahPBMTreasury {
    
    /// @notice gets the spot type of underlying ERC20 tokens each of the the PBM type holds
    /// @param pbmAddress Contract address for the campaign PBM
    /// @param erc20token Contract address for the erc20 token
    /// @return value Returns the token balance
    function getPBMCampaignTokenBalance(address pbmAddress, address erc20token) external view returns (uint256 value);

    /// @notice Call this function to allow the treasury to pull money from a designated wallet
    /// and credit it to treasury smart contract
    function depositForPBMAddress(address creditForPBM, address erc20token, uint256 value) external;

    /// @notice Call this function to allow the owner to withdraw money on behalf of the PBM
    function withdrawFromPBMAddress(address withdrawFromPBM, address to, address erc20token, uint256 value) external;

    /// @notice Allows the owner to rescue ERC20 tokens sent to this contract.
    /// @param erc20token smart contract address 
    /// @param value amount of funds to be withdrawn
    function recoverERC20Tokens(address erc20token, uint256 value) external;

    /// @notice Allows the owner to rescue ALL ERC20 tokens sent to this contract.
    /// @param erc20token smart contract address 
    function recoverAllERC20Tokens(address erc20token) external;

}
