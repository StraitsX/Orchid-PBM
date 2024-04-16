// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Holds the underlying wrapped token for a list of campaign PBM
interface NoahPBMTreasury {
  
    /// @notice gets the spot type of underlying ERC20 tokens each of the the PBM type holds
    /// @param tokenId The id for the PBM in query
    /// @return Returns the spot type, could only be either "XSGD" or "DSGD"
    function getSpotType(uint256 tokenId) external view returns (string memory);

    /// @notice 
    function increaseTrasuryBalance(address campaignPBM, address erc20token, uint256 amount) external;

    /// @notice 
    function decreaseTreasuryBalanace(address campaignPBM, address erc20token, uint256 amount) external;
 
    /// @notice Call this function to allow the treasury to pull money from a designated wallet
    /// and credit it to treasury smart contract
    function depositForPBMAddress() external;
}
