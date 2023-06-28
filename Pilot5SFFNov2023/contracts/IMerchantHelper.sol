// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.9;

/**
 * @notice This contract pulls ERC20 token from a list of merchant wallets on behalf of PBM smart contract.
 * @dev ERC20 approved must be granted to this contract in advance.
 */
interface IMerchantHelper {
    /**
     * @notice This function allows the contract owner to add a PBM address to the list of allowed PBMs to pull ERC20 tokens.
     * @param _allowedPBM The address to be added to the list of allowed PBMs
     */
    function addAllowedPBM(address _allowedPBM) external;

    /**
     * @notice This function allows the contract owner to remove a PBM address from the list of allowed PBMs
     * @param _allowedPBM The address to be removed from the list of allowed PBMs
     */
    function removeAllowedPBM(address _allowedPBM) external;

    /**
     * @notice This function allows the contract owner to add an address to the list of whitelisted merchants
     * @param _merchant The address to be added to the list of whitelisted merchants
     */
    function addWhitelistedMerchant(address _merchant) external;

    /**
     * @notice This function allows the contract owner to remove an address from the list of whitelisted merchants
     * @param _merchant The address to be removed from the list of whitelisted merchants
     */
    function removeWhitelistedMerchant(address _merchant) external;

    /**
     * @notice This function enables an allowed PBM to cashback a specific amount of a specific ERC20 token from a whitelisted merchant to a user
     * @param _user The address of the user to receive the cashback
     * @param _amount The amount of the ERC20 token to be cashbacked
     * @param _erc20TokenAddress The address of the ERC20 token to be cashbacked
     * @param _merchantAddress The address of the whitelisted merchant from which the cashback is to be made
     */
    function cashBack(address _user, uint256 _amount, address _erc20TokenAddress, address _merchantAddress) external;
}
