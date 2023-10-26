// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./ERC20Helper.sol";

contract WXSGD is ERC20, Ownable, ReentrancyGuard {
    IERC20 public xsgdToken;

    event Wrapped(address indexed user, uint256 amount);
    event Unwrapped(address indexed user, uint256 amount);
    event Recovered(address token, uint256 amount);

    constructor(address _xsgdToken) ERC20("WXSGD", "WXSGD") {
        xsgdToken = IERC20(_xsgdToken);
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    function wrap(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        ERC20Helper.safeTransferFrom(address(xsgdToken), msg.sender, address(this), amount);
        _mint(msg.sender, amount);
        emit Wrapped(msg.sender, amount);
    }

    function unwrap(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        _burn(msg.sender, amount);
        ERC20Helper.safeTransfer(address(xsgdToken), msg.sender, amount);
        emit Unwrapped(msg.sender, amount);
    }

    // make sure we can recover any ERC20 tokens locked in the contract if something went wrong
    function recoverERC20(address _token) external onlyOwner nonReentrant {
        IERC20 erc20 = IERC20(_token);
        uint256 recoverAmount = erc20.balanceOf(address(this));
        ERC20Helper.safeTransfer(address(erc20), owner(), recoverAmount);
        emit Recovered(_token, recoverAmount);
    }
}
