// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @dev Implementation of the basic standard ERC-20 token.
 * Used for testing
 * _Available since v3.1._
 */
contract Spot is ERC20, Pausable, Ownable {
    using Strings for uint256;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
