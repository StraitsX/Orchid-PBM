// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0;

import '@openzeppelin/contracts/interfaces/IERC20.sol'; 
import "@openzeppelin/contracts/utils/Address.sol" ; 

/// @title TokenHelper
/// @notice Contains helper methods for interacting with ERC20 tokens that do not consistently return true/false
library ERC20Helper {
    /// @notice Transfers tokens from msg.sender to a recipient
    /// @dev Calls transfer on token contract, errors with TF if transfer fails
    /// @param token The contract address of the token which will be transferred
    /// @param to The recipient of the transfer
    /// @param value The value of the transfer
    function safeTransfer(
        address token,
        address to,
        uint256 value
    ) internal {
        require(token!=address(0), "ERC20: Nil address"); 
        require(Address.isContract(token), "ERC20: EOA provided"); 
        (bool success, bytes memory data) =
            token.call(abi.encodeWithSelector(IERC20.transfer.selector, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'Interaction with the spot token failed.');
    }

    /// @notice Transfers tokens from msg.sender to a recipient
    /// @dev Calls transfer on token contract, errors with TF if transfer fails
    /// @param token The contract address of the token which will be transferred
    /// @param from The sender of the transfer
    /// @param to The recipient of the transfer
    /// @param value The value of the transfer
    function safeTransferFrom(
        address token,
        address from, 
        address to,
        uint256 value
    ) internal {
        require(token!=address(0), "ERC20: Nil address"); 
        require(Address.isContract(token), "ERC20: EOA provided"); 
        (bool success, bytes memory data) =
            token.call(abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'ERC20: Insufficent balance or approval');
    }
}