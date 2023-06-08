// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.9;

interface IIssuerHelper {

    /**
     * @dev Transfers ERC20 tokens from a funding wallet to the contract.
     * @param erc20Token The address of the ERC20 token contract.
     * @param fundingWallet The address of the wallet that the contract will pull ERC20 token from.
     * @param merchantWallet The address of the wallet that will receive the token.
     * @param tokenId The ID of the token to be transferred.
     * @param amount The amount of ERC20 tokens to be transferred.
     */
    function processLoadAndSafeTransferFrom(
        address erc20Token,
        address fundingWallet,
        address merchantWallet,
        uint256 tokenId,
        uint256 amount
    ) external;

    /**
     * @dev Adds a wallet to the whitelist.
     * @param _wallet The address of the wallet to be added to the whitelist.
     */
    function addWhitelistedWallet(address _wallet) external;

    /**
     * @dev Removes a wallet from the whitelist.
     * @param _wallet The address of the wallet to be removed from the whitelist.
     */
    function removeWhitelistedWallet(address _wallet) external;

    /**
     * @dev Adds an address to the list of allowed whitelisters.
     * @param _whitelister The address to be added to the list of allowed whitelisters.
     */
    function addWhitelister(address _whitelister) external;

    /**
     * @dev Removes an address from the list of allowed whitelisters.
     * @param _whitelister The address to be removed from the list of allowed whitelisters.
     */
    function removeWhitelister(address _whitelister) external;
}
