// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./ERC20Helper.sol";

contract Swap is Ownable, ReentrancyGuard {
    IERC20 public DSGDToken;
    IERC20 public XSGDToken;

    constructor(IERC20 _DSGDToken, IERC20 _XSGDToken) {
        DSGDToken = _DSGDToken;
        XSGDToken = _XSGDToken;
    }

    function swapDSGDtoXSGD(uint256 DSGDAmount) public nonReentrant {
        require(DSGDToken.balanceOf(msg.sender) >= DSGDAmount, "Insufficient DSGD balance");

        // Require that the contract has enough XSGD to swap
        require(XSGDToken.balanceOf(address(this)) >= DSGDAmount, "Contract has insufficient XSGD balance");

        // Transfer DSGD from the caller to this contract
        ERC20Helper.safeTransferFrom(address(DSGDToken), msg.sender, address(this), DSGDAmount);

        // Transfer XSGD from this contract to the caller
        ERC20Helper.safeTransfer(address(XSGDToken), msg.sender, DSGDAmount);
    }

    // This function is used to recover any ERC20 tokens that are sent to the contract by mistake
    function recoverERC20(address _token) public onlyOwner {
        IERC20 erc20 = IERC20(_token);
        ERC20Helper.safeTransfer(address(erc20), owner(), erc20.balanceOf(address(this)));
    }
}
