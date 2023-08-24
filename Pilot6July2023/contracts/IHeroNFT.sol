// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface IHeroNFT is IERC1155 {
    function mintUnique(address account, uint256 id, uint256 amount, bytes calldata data) external;
}
