// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

// TBD: add param docs for load, loadto. Check all params documented.

/**
 *  @dev This interface extends IPBMRC1, adding functions for working with non-preloaded PBMs.
 *  Non-preloaded PBMs are minted as empty containers without any underlying tokens of value,
 *  allowing the loading of the underlying token to happen at a later stage.
 */
import "./IPBM.sol";
interface IPBMRC2 is IPBM {

    /// @notice This function extends IPBMRC1 to mint PBM tokens as empty containers without underlying tokens of value.
    /// @dev The loading of the underlying token of value can be done by calling the `load` function. The function parameters should be identical to IPBMRC1
    function mint(address receiver, uint256 tokenId, uint256 amount, bytes calldata data) external;

    /// @notice This function extends IPBMRC1 to mint PBM tokens as empty containers without underlying tokens of value.
    /// @dev The loading of the underlying token of value can be done by calling the `load` function. The function parameters should be identical to IPBMRC1
    function batchMint(address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) external;

    /// Given a PBM token id, wrap an amount of ERC20 tokens that is purpose bound by `tokenId`
    /// function will pull ERC20 tokens from msg.sender
    /// Approval must be given to the PBM smart contract in order to for the pbm to pull money from msg.sender
    /// underlying data structure must record how much the msg.sender has loaded in for the particular pbm `tokenId`
    /// in this function call, the msg.sender is the user bearing the PBM token
    /// loading conditions can be specify in this function.
    /// @dev allocates underlying token to be used exclusively by the PBM token `tokenId` type
    function load(uint256 tokenId, uint256 amount, address caller) external returns (uint256);

    /// Given a PBM token id, wrap an amount of ERC20 tokens into it.
    /// function will pull ERC20 tokens from msg.sender
    /// underlying data structure will record how much the msg.sender has loaded into the PBM to be given to a recipient
    /// @dev allocates underlying token to be used exclusively by the PBM token `tokenId` type for `recipient`
    function loadTo(uint256 tokenId, uint256 amount, address recipient, address caller) external returns (uint256);

    /// @notice Retrieves the balance of the underlying ERC-20 token associated with a specific PBM token type and user address.
    /// This function provides a way to check the amount of the underlying token that a user has loaded into a particular PBM token.
    /// @param tokenId The identifier of the PBM token type for which the underlying token balance is being queried.
    /// @param user The address of the user whose underlying token balance is being queried.
    /// @return The balance of the underlying ERC-20 token associated with the specified PBM token type and user address.
    function underlyingBalanceOf(uint256 tokenId, address user) external view returns (uint256);

    /// @notice Unloads the underlying token from the PBM smart contract by extracting the specified amount of the token for the caller.
    /// Emits {TokenUnload} event.
    /// @dev The underlying token will be removed and transferred to the address of the caller (msg.sender).
    /// @param tokenId Identifier of the PBM token type to be unloaded.
    /// @param amount The quantity of the corresponding tokens to be unloaded.
    function unload(uint256 tokenId, uint256 amount, address caller) external;

    /// Emitted when an underlying token is loaded into a PBM
    /// @param caller Address by which ERC20token is taken from.
    /// @param to Address by which the token is loaded and assigned to
    /// @param tokenId Identifier of the PBM token types being loaded
    /// @param amount The quantity of tokens to be loaded
    /// @param ERC20Token The address of the underlying ERC-20 token.
    /// @param ERC20TokenValue The amount of underlying ERC-20 tokens loaded
    event TokenLoad(address caller, address to, uint256 tokenId, uint256 amount, address ERC20Token, uint256 ERC20TokenValue);

    /// @notice Emitted when an underlying token is unloaded from a PBM.
    /// This event indicates the process of releasing the underlying token from the PBM smart contract.
    /// @param caller The address initiating the token unloading process.
    /// @param from The address from which the token is being unloaded and removed.
    /// @param tokenId Identifier of the PBM token types being unloaded.
    /// @param amount The quantity of the corresponding unloaded tokens.
    /// @param ERC20Token The address of the underlying ERC-20 token.
    /// @param ERC20TokenValue The amount of unloaded underlying ERC-20 tokens transferred.
    event TokenUnload(address caller, address from, uint256 tokenId, uint256 amount, address ERC20Token, uint256 ERC20TokenValue);
}