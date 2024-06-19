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
        string discountType; // percent or fixed
        uint256 discountValue; // cashback amount could be either a percent or a fixed amount
        uint256 minAmount; // use to check whether the mint amount is met
        uint256 discountCap;
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
     * - `discountValue` should not be 0
     * - `discountType` should be either fixed or percent
     */
    function createTokenType(
        string memory companyName,
        string memory discountType,
        uint256 discountValue,
        uint256 minAmount,
        uint256 discountCap,
        uint256 tokenExpiry,
        address creator,
        string memory tokenURI,
        string memory postExpiryURI,
        uint256 contractExpiry
    ) external override onlyOwner noDelegateCall {
        require(tokenExpiry <= contractExpiry, "Invalid token expiry-1");
        require(tokenExpiry > block.timestamp, "Invalid token expiry-2");
        require(discountValue != 0, "Discount value is 0");
        require(
            keccak256(abi.encodePacked(discountType)) == keccak256(abi.encodePacked("fixed")) ||
                keccak256(abi.encodePacked(discountType)) == keccak256(abi.encodePacked("percent")),
            "Invalid discount type"
        );

        string memory tokenName = string(abi.encodePacked(companyName, discountValue.toString()));

        tokenTypes[tokenTypeCount] = TokenConfig({
            name: tokenName,
            discountType: discountType,
            discountValue: discountValue,
            minAmount: minAmount,
            discountCap: discountCap,
            expiry: tokenExpiry,
            creator: creator,
            balanceSupply: 0,
            uri: tokenURI,
            postExpiryURI: postExpiryURI
        });

        emit NewPBMTypeCreated(tokenTypeCount, tokenName, discountType, discountValue, tokenExpiry, creator);
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
     * @dev See {IPBMTokenManager-isTokenRevoked}.
     *
     * Note: token is revoked if it is expired, balance supply is 0 and discount value is not 0 (token id is created before)
     */
    function isTokenRevoked(uint256 tokenId) external view override returns (bool) {
        return
            block.timestamp >= tokenTypes[tokenId].expiry &&
            tokenTypes[tokenId].discountValue != 0 &&
            tokenTypes[tokenId].balanceSupply == 0;
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
                tokenTypes[tokenIds[i]].discountValue != 0 && block.timestamp < tokenTypes[tokenIds[i]].expiry,
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
                tokenTypes[tokenIds[i]].discountValue != 0 && block.timestamp < tokenTypes[tokenIds[i]].expiry,
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
            if (block.timestamp > tokenTypes[i].expiry || tokenTypes[i].discountValue == 0) {
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
    ) external view override returns (string memory, string memory, uint256, uint256, uint256, uint256, address) {
        require(tokenTypes[tokenId].discountValue != 0, "PBM: Invalid Token Id(s)");
        return (
            tokenTypes[tokenId].name,
            tokenTypes[tokenId].discountType,
            tokenTypes[tokenId].discountValue,
            tokenTypes[tokenId].minAmount,
            tokenTypes[tokenId].discountCap,
            tokenTypes[tokenId].expiry,
            tokenTypes[tokenId].creator
        );
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
            tokenTypes[tokenId].discountValue != 0 && block.timestamp < tokenTypes[tokenId].expiry,
            "PBM: Invalid Token Id(s)"
        );
        return tokenTypes[tokenId].discountValue;
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
            tokenTypes[tokenId].discountValue != 0 && block.timestamp < tokenTypes[tokenId].expiry,
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
            tokenTypes[tokenId].discountValue != 0 && block.timestamp < tokenTypes[tokenId].expiry,
            "PBM: Invalid Token Id(s)"
        );
        return tokenTypes[tokenId].creator;
    }
}
