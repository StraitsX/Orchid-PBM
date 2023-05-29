// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./IPBMAddressList.sol";

contract PBMAddressList is Ownable, IPBMAddressList {
    // list of merchants who are able to receive the underlying ERC-20 tokens
    mapping(address => bool) internal merchantList;
    // list of merchants who are unable to receive the PBM tokens
    mapping(address => bool) internal blacklistedAddresses;

    /**
     * @dev See {IPBMAddressList-blacklistAddresses}.
     *
     * Requirements:
     *
     * - caller must be owner
     */
    function blacklistAddresses(address[] memory addresses, string memory metadata) external override onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            blacklistedAddresses[addresses[i]] = true;
        }
        emit Blacklist("add", addresses, metadata);
    }

    /**
     * @dev See {IPBMAddressList-unBlacklistAddresses}.
     *
     * Requirements:
     *
     * - caller must be owner
     */
    function unBlacklistAddresses(address[] memory addresses, string memory metadata) external override onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            blacklistedAddresses[addresses[i]] = false;
        }
        emit Blacklist("remove", addresses, metadata);
    }

    /**
     * @dev See {IPBMAddressList-isBlacklisted}.
     *
     */
    function isBlacklisted(address _address) external view override returns (bool) {
        return blacklistedAddresses[_address];
    }

    /**
     * @dev See {IPBMAddressList-addMerchantAddresses}.
     *
     * Requirements:
     *
     * - caller must be owner
     */
    function addMerchantAddresses(address[] memory addresses, string memory metadata) external override onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            merchantList[addresses[i]] = true;
        }
        emit MerchantList("add", addresses, metadata);
    }

    /**
     * @dev See {IPBMAddressList-removeMerchantAddresses}.
     *
     * Requirements:
     *
     * - caller must be owner
     */
    function removeMerchantAddresses(address[] memory addresses, string memory metadata) external override onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            merchantList[addresses[i]] = false;
        }
        emit MerchantList("remove", addresses, metadata);
    }

    /**
     * @dev See {IPBMAddressList-isMerchant}.
     *
     */
    function isMerchant(address _address) external view override returns (bool) {
        return merchantList[_address];
    }
}
