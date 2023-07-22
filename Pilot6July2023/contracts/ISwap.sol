// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ISwap {
    /// @dev This function is used to swap DSGD to XSGD.
    /// @param DSGDAmount The amount of DSGD to swap.
    function swapDSGDtoXSGD(uint256 DSGDAmount) external;

    /// @dev This function is used to recover any ERC20 tokens that are sent to the contract by mistake.
    /// @param _token The address of the token to recover.
    function recoverERC20(address _token) external;
}
