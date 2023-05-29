// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IPBMTokenManager.sol";
import "./NoDelegateCall.sol";

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PBMTokenManager is Ownable, IPBMTokenManager, NoDelegateCall {
    using Strings for uint256;

    // counter used to create new token types
    uint256 internal tokenTypeCount = 0;

    // structure representing all the details of a PBM type
    struct TokenConfig {
        string name;
        uint256 amount;
        uint256 expiry;
        address creator;
        uint256 balanceSupply;
        string uri;
        string postExpiryURI;
    }

    // mapping of token ids to token details
    mapping(uint256 => TokenConfig) internal tokenTypes;

    constructor() {}

    /**
     * @dev See {IPBMTokenManager-createPBMTokenType}.
     *
     * Requirements:
     *
     * - caller must be owner ( PBM contract )
     * - contract must not be expired
     * - token expiry must be less than contract expiry
     * - `amount` should not be 0
     */
    function createTokenType(
        string memory companyName,
        uint256 spotAmount,
        uint256 tokenExpiry,
        address creator,
        string memory tokenURI,
        string memory postExpiryURI,
        uint256 contractExpiry
    ) external override onlyOwner noDelegateCall {
        require(tokenExpiry <= contractExpiry, "Invalid token expiry-1");
        require(tokenExpiry > block.timestamp, "Invalid token expiry-2");
        require(spotAmount != 0, "Spot amount is 0");

        string memory tokenName = string(abi.encodePacked(companyName, spotAmount.toString()));
        tokenTypes[tokenTypeCount].name = tokenName;
        tokenTypes[tokenTypeCount].amount = spotAmount;
        tokenTypes[tokenTypeCount].expiry = tokenExpiry;
        tokenTypes[tokenTypeCount].creator = creator;
        tokenTypes[tokenTypeCount].balanceSupply = 0;
        tokenTypes[tokenTypeCount].uri = tokenURI;
        tokenTypes[tokenTypeCount].postExpiryURI = postExpiryURI;

        emit NewPBMTypeCreated(tokenTypeCount, tokenName, spotAmount, tokenExpiry, creator);
        tokenTypeCount += 1;
    }

    /**
     * @dev See {IPBMTokenManager-revokePBM}.
     *
     * Requirements:
     *
     * - caller must be owner ( PBM contract )
     * - token must be expired
     * - `tokenId` should be a valid id that has already been created
     * - `sender` must be the token type creator
     */
    function revokePBM(uint256 tokenId, address sender) external override onlyOwner {
        require(
            sender == tokenTypes[tokenId].creator && block.timestamp >= tokenTypes[tokenId].expiry,
            "PBM not revokable"
        );
        tokenTypes[tokenId].balanceSupply = 0;
    }

    /**
     * @dev See {IPBMTokenManager-increaseBalanceSupply}.
     *
     * Requirements:
     *
     * - caller must be owner ( PBM contract )
     * - `tokenId` should be a valid id that has already been created
     * - `sender` must be the token type creator
     */
    function increaseBalanceSupply(uint256[] memory tokenIds, uint256[] memory amounts) external override onlyOwner {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(
                tokenTypes[tokenIds[i]].amount != 0 && block.timestamp < tokenTypes[tokenIds[i]].expiry,
                "PBM: Invalid Token Id(s)"
            );
            tokenTypes[tokenIds[i]].balanceSupply += amounts[i];
        }
    }

    /**
     * @dev See {IPBMTokenManager-decreaseBalanceSupply}.
     *
     * Requirements:
     *
     * - caller must be owner ( PBM contract )
     * - `tokenId` should be a valid id that has already been created
     * - `sender` must be the token type creator
     */
    function decreaseBalanceSupply(uint256[] memory tokenIds, uint256[] memory amounts) external override onlyOwner {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(
                tokenTypes[tokenIds[i]].amount != 0 && block.timestamp < tokenTypes[tokenIds[i]].expiry,
                "PBM: Invalid Token Id(s)"
            );
            tokenTypes[tokenIds[i]].balanceSupply -= amounts[i];
        }
    }

    /**
     * @dev See {IPBMTokenManager-uri}.
     *
     */
    function uri(uint256 tokenId) external view override returns (string memory) {
        if (block.timestamp >= tokenTypes[tokenId].expiry) {
            return tokenTypes[tokenId].postExpiryURI;
        }
        return tokenTypes[tokenId].uri;
    }

    /**
     * @dev See {IPBMTokenManager-areTokensValid}.
     *
     */
    function areTokensValid(uint256[] memory tokenIds) external view override returns (bool) {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (block.timestamp > tokenTypes[i].expiry || tokenTypes[i].amount == 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * @dev See {IPBMTokenManager-getTokenDetails}.
     *
     * Requirements:
     *
     * - `tokenId` should be a valid id that has already been created
     */
    function getTokenDetails(
        uint256 tokenId
    ) external view override returns (string memory, uint256, uint256, address) {
        require(tokenTypes[tokenId].amount != 0, "PBM: Invalid Token Id(s)");
        return (
            tokenTypes[tokenId].name,
            tokenTypes[tokenId].amount,
            tokenTypes[tokenId].expiry,
            tokenTypes[tokenId].creator
        );
    }

    /**
     * @dev See {IPBMTokenManager-getPBMRevokeValue}.
     *
     * Requirements:
     *
     * - `tokenId` should be a valid id that has already been created
     */
    function getPBMRevokeValue(uint256 tokenId) external view override returns (uint256) {
        require(tokenTypes[tokenId].amount != 0, "PBM: Invalid Token Id(s)");
        return tokenTypes[tokenId].amount * tokenTypes[tokenId].balanceSupply;
    }

    /**
     * @dev See {IPBMTokenManager-getTokenValue}.
     *
     * Requirements:
     *
     * - `tokenId` should be a valid id that has already been created
     */
    function getTokenValue(uint256 tokenId) external view override returns (uint256) {
        require(
            tokenTypes[tokenId].amount != 0 && block.timestamp < tokenTypes[tokenId].expiry,
            "PBM: Invalid Token Id(s)"
        );
        return tokenTypes[tokenId].amount;
    }

    /**
     * @dev See {IPBMTokenManager-getTokenCount}.
     *
     * Requirements:
     *
     * - `tokenId` should be a valid id that has already been created
     */
    function getTokenCount(uint256 tokenId) external view override returns (uint256) {
        require(
            tokenTypes[tokenId].amount != 0 && block.timestamp < tokenTypes[tokenId].expiry,
            "PBM: Invalid Token Id(s)"
        );
        return tokenTypes[tokenId].balanceSupply;
    }

    /**
     * @dev See {IPBMTokenManager-getTokenCreator}.
     *
     * Requirements:
     *
     * - `tokenId` should be a valid id that has already been created
     */
    function getTokenCreator(uint256 tokenId) external view override returns (address) {
        require(
            tokenTypes[tokenId].amount != 0 && block.timestamp < tokenTypes[tokenId].expiry,
            "PBM: Invalid Token Id(s)"
        );
        return tokenTypes[tokenId].creator;
    }
}
