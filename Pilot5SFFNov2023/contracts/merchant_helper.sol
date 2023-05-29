// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MerchantHelper is Ownable {
    using SafeERC20 for IERC20;

    // list of whitelisted merchant wallet addresses that
    // has granted ERC20 token approval to this smart contract.
    mapping(address => bool) public whitelistedMerchants;

    mapping(address => bool) public allowedPBMs;

    constructor() {}

    modifier onlyAllowedPBM() {
        require(allowedPBMs[msg.sender], "Caller is not an whitelisted PBM");
        _;
    }

    function addAllowedPBM(address _allowedPBM) external onlyOwner {
        allowedPBMs[_allowedPBM] = true;
    }

    function removeAllowedPBM(address _allowedPBM) external onlyOwner {
        allowedPBMs[_allowedPBM] = false;
    }

    function addWhitelistedMerchant(address _merchant) external onlyOwner {
        whitelistedMerchants[_merchant] = true;
    }

    function removeWhitelistedMerchant(address _merchant) external onlyOwner {
        whitelistedMerchants[_merchant] = false;
    }

    function cashBack(
        address _user,
        uint256 _amount,
        address _erc20TokenAddress,
        address _merchantAddress
    ) external onlyAllowedPBM {
        require(whitelistedMerchants[_merchantAddress], "Merchant not whitelisted.");

        IERC20 token = IERC20(_erc20TokenAddress);

        // either send back the XSGD or mint the prepaid PBM to send back to the user wallet
        token.safeTransferFrom(_merchantAddress, _user, _amount);
    }
}
