// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract HeroNFT is ERC1155, Ownable, Pausable, ERC1155Burnable, ERC1155Supply {
    constructor() ERC1155("") {}

    // better open a dedicated repo on github to store the metadata
    string baseURI = "https://raw.githubusercontent.com/StraitsX/NFT/main/heroNFT2023SEP/heroNFT2023SEP/";
    mapping(address => bool) public whitelisted;

    function setURI(string memory baseUri) public onlyOwner {
        baseURI = baseUri;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function uri(uint256 token_id) public view override returns (string memory) {
        return string(abi.encodePacked(baseURI, Strings.toString(token_id), ".json"));
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function mint(address account, uint256 id, uint256 amount, bytes memory data) public onlyWhitelisted {
        require(amount == 1, "HeroNFT: Amount must be 1");
        require(balanceOf(account, id) == 0, "HeroNFT: Account already owns this token_id");
        _mint(account, id, amount, data);
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyWhitelisted {
        _mintBatch(to, ids, amounts, data);
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override(ERC1155, ERC1155Supply) whenNotPaused {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    modifier onlyWhitelisted() {
        require(whitelisted[msg.sender] || msg.sender == owner(), "Caller is not an whitelisted address nor the owner");
        _;
    }

    function addWhitelisted(address _whitelistAddress) external onlyOwner {
        whitelisted[_whitelistAddress] = true;
    }

    function removeWhitelisted(address _whitelistAddress) external onlyOwner {
        whitelisted[_whitelistAddress] = false;
    }
}
