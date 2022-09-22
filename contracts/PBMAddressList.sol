// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; 

import "@openzeppelin/contracts/access/Ownable.sol";

import "./IPBMAddressList.sol";

contract PBMAddressList is Ownable, IPBMAddressList {

    // list of merchants who are able to receive the underlying ERC-20 tokens
    mapping (address => bool) internal merchantList ; 
    // list of merchants who are unable to receive the PBM tokens
    mapping (address => bool) internal blacklistedAddresses ; 

    /**
     * @dev See {IPBMAddressList-blacklistAddresses}.
     *
     * Requirements:
     *
     * - caller must be owner 
     */
    function blacklistAddresses(address[] memory addresses) 
    external
    override
    onlyOwner
    {
        for (uint256 i = 0; i < addresses.length; i++) {
            blacklistedAddresses[addresses[i]] = true;
        }
    }  

    /**
     * @dev See {IPBMAddressList-unBlacklistAddresses}.
     *
     * Requirements:
     *
     * - caller must be owner 
     */
    function unBlacklistAddresses(address[] memory addresses) 
    external 
    override
    onlyOwner
    {
        for (uint256 i = 0; i < addresses.length; i++) {
            blacklistedAddresses[addresses[i]] = false;
        } 
    }

    /**
     * @dev See {IPBMAddressList-isBlacklisted}.
     *
     */
    function isBlacklisted(address _address)
    external 
    override
    view 
    returns (bool)
    {
        return blacklistedAddresses[_address];  
    }

    /**
     * @dev See {IPBMAddressList-addMerchantAddresses}.
     *
     * Requirements:
     *
     * - caller must be owner 
     */
    function addMerchantAddresses(address[] memory addresses) 
    external
    override
    onlyOwner
    {
        for (uint256 i = 0; i < addresses.length; i++) {
            merchantList[addresses[i]] = true;
        }
    }  

    /**
     * @dev See {IPBMAddressList-removeMerchantAddresses}.
     *
     * Requirements:
     *
     * - caller must be owner 
     */
    function removeMerchantAddresses(address[] memory addresses) 
    external 
    override
    onlyOwner
    {
        for (uint256 i = 0; i < addresses.length; i++) {
            merchantList[addresses[i]] = false;
        } 
    }

    /** 
     * @dev See {IPBMAddressList-isMerchant}.
     *
     */
    function isMerchant(address _address)
    external 
    override
    view 
    returns (bool)
    {
        return merchantList[_address];  
    }

}
