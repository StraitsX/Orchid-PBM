// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./ERC20Helper.sol";
import "./PBMTokenManager.sol";
import "./IPBM.sol";
import "./IPBMAddressList.sol";

/// @title A payment PBM relies on an external smart contract to manage the underlying ERC-20 tokens.
contract PBMPayment is ERC1155, Ownable, Pausable, IPBM {
    // address of the token manager. Token manager is incharge of managing the wrapped ERC-20 tokens
    address public pbmTokenManager = address(0);

    // address of the PBM-Addresslist which will define compliance or business logic behaviours.
    address public pbmAddressList = address(0);

    // tracks contract initialisation
    bool internal initialised = false;

    // time of expiry ( epoch )
    uint256 public contractExpiry;

    constructor() ERC1155("") {
        pbmTokenManager = address(new PBMTokenManager());
    }

    function initialise(
        uint256 _expiry,
        address _pbmAddressList
    ) external override onlyOwner {
        require(!initialised, "PBM: Already initialised");
        require(Address.isContract(_pbmAddressList), "Invalid pbm address list");

        contractExpiry = _expiry;
        pbmAddressList = _pbmAddressList;

        initialised = true;
    }

    /**
     * @dev See {IPBM-createPBMTokenType}.
     *
     * Requirements:
     *
     * - caller must be owner
     * - contract must not be expired
     * - `tokenExpiry` must be less than contract expiry
     * - `amount` should not be 0
     * - `spotType` should be either "XSGD" or "DSGD"
     */
    function createPBMTokenType(
        string memory companyName,
        address spotAddress,
        uint256 spotAmount,
        string memory spotType,
        uint256 tokenExpiry,
        address creator,
        string memory tokenURI,
        string memory postExpiryURI
    ) external override onlyOwner {
        PBMTokenManager(pbmTokenManager).createTokenType(
            companyName,
            spotAddress,
            spotAmount,
            spotType,
            tokenExpiry,
            creator,
            tokenURI,
            postExpiryURI,
            contractExpiry
        );
    }


    /**
     * @dev See {IPBM-mint}.
     *     
     * IMPT: Before minting, the caller should approve the contract address to spend ERC-20 tokens on behalf of the caller.
     *       This can be done by calling the `approve` or `increaseMinterAllowance` functions of the ERC-20 contract and specifying `_spender` to be the PBM contract address. 
             Ref : https://eips.ethereum.org/EIPS/eip-20

       WARNING: Any contracts that externally call these mint() and batchMint() functions should implement some sort of reentrancy guard procedure (such as OpenZeppelin's ReentrancyGuard).
     *
     * Requirements:
     *
     * - contract must not be paused
     * - tokens must not be expired
     * - `tokenId` should be a valid id that has already been created
     * - caller should have the necessary amount of the ERC-20 tokens required to mint
     * - caller should have approved the PBM contract to spend the ERC-20 tokens
     * - receiver should not be blacklisted
     */
    function mint(uint256 tokenId, uint256 amount, address receiver) external override whenNotPaused {
        require(!IPBMAddressList(pbmAddressList).isBlacklisted(receiver), "PBM: 'to' address blacklisted");
        uint256 valueOfNewTokens = amount * (PBMTokenManager(pbmTokenManager).getTokenValue(tokenId));

        //Transfer the spot token from the user to the contract to wrap it
        spotToken = getSpotAddress(tokenId);
        ERC20Helper.safeTransferFrom(spotToken, msg.sender, address(this), valueOfNewTokens);

        // TODO: Move the spot token to NoahPaymentManager
        // Alternatively, can skip this step, and just mint unbacked tokens

        // mint the token if the contract - wrapping the xsgd
        PBMTokenManager(pbmTokenManager).increaseBalanceSupply(serialise(tokenId), serialise(amount));
        _mint(receiver, tokenId, amount, "");
    }

    /**
     * @dev See {IPBM-batchMint}.
     *     
     * IMPT: Before minting, the caller should approve the contract address to spend ERC-20 tokens on behalf of the caller.
     *       This can be done by calling the `approve` or `increaseMinterAllowance` functions of the ERC-20 contract and specifying `_spender` to be the PBM contract address. 
             Ref : https://eips.ethereum.org/EIPS/eip-20

       WARNING: Any contracts that externally call these mint() and batchMint() functions should implement some sort of reentrancy guard procedure (such as OpenZeppelin's ReentrancyGuard).
     *
     * Requirements:
     *
     * - contract must not be paused
     * - tokens must not be expired
     * - `tokenIds` should all be valid ids that have already been created
     * - `tokenIds` and `amounts` list need to have the same number of values
     * - caller should have the necessary amount of the ERC-20 tokens required to mint
     * - caller should have approved the PBM contract to spend the ERC-20 tokens
     * - receiver should not be blacklisted
     */
    function batchMint(
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        address receiver
    ) external override whenNotPaused {
        require(!IPBMAddressList(pbmAddressList).isBlacklisted(receiver), "PBM: 'to' address blacklisted");
        require(tokenIds.length == amounts.length, "Unequal ids and amounts supplied");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            uint256 amount = amounts[i];

            uint256 valueOfNewTokens = amount * (PBMTokenManager(pbmTokenManager).getTokenValue(tokenId));

            // Get spotToken address based on tokenId
            spotToken = getSpotAddress(tokenId);

            // Transfer spot tokens from user to contract to wrap it
            ERC20Helper.safeTransferFrom(spotToken, msg.sender, address(this), valueOfNewTokens);

            // Increase balance supply
            PBMTokenManager(pbmTokenManager).increaseBalanceSupply(serialise(tokenId), serialise(amount));
        }

        _mintBatch(receiver, tokenIds, amounts, "");
    }

    /**
     * @dev See {IPBM-safeTransferFrom}.
     *
     *
     * Requirements:
     *
     * - contract must not be paused
     * - tokens must not be expired
     * - `tokenId` should be a valid ids that has already been created
     * - caller should have the PBMs that are being transferred (or)
     *          caller should have the approval to spend the PBMs on behalf of the owner (`from` addresss)
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override(ERC1155, IPBM) whenNotPaused {
        _validateTransfer(from, to);

        if (IPBMAddressList(pbmAddressList).isMerchant(to)) {
            uint256 valueOfTokens = amount * (PBMTokenManager(pbmTokenManager).getTokenValue(id));

            // Burn PBM ERC1155 Tokens
            _burn(from, id, amount);
            PBMTokenManager(pbmTokenManager).decreaseBalanceSupply(serialise(id), serialise(amount));

            // swap dsgd to xsgd if token id wraps dsgd
            valueOfTokens = _swapIfNeeded(id, valueOfTokens);

            // TODO Call NoahPaymentManager instead to transfer erc20 tokens.
            // ERC20Helper.safeTransfer(xsgdToken, to, valueOfTokens);

            emit MerchantPayment(from, to, serialise(id), serialise(amount), xsgdToken, valueOfTokens);

        } else {
            _safeTransferFrom(from, to, id, amount, data);
        }
    }

    /**
     * @dev See {IPBM-safeBatchTransferFrom}.
     *
     *
     * Requirements:
     *
     * - contract must not be paused
     * - tokens must not be expired
     * - `tokenIds` should all be  valid ids that has already been created
     * - `tokenIds` and `amounts` list need to have the same number of values
     * - caller should have the PBMs that are being transferred (or)
     *          caller should have the approval to spend the PBMs on behalf of the owner (`from` addresss)
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public override(ERC1155, IPBM) whenNotPaused {
        _validateTransfer(from, to);
        require(ids.length == amounts.length, "Unequal ids and amounts supplied");

        if (IPBMAddressList(pbmAddressList).isMerchant(to)) {
            uint256 sumOfTokens = 0;
            for (uint256 i = 0; i < ids.length; i++) {
                uint256 tokenId = ids[i];
                uint256 amount = amounts[i];
                uint256 valueOfTokens = (amount * (PBMTokenManager(pbmTokenManager).getTokenValue(tokenId)));
                valueOfTokens = _swapIfNeeded(tokenId, valueOfTokens);
                sumOfTokens += valueOfTokens;
            }

            _burnBatch(from, ids, amounts);
            PBMTokenManager(pbmTokenManager).decreaseBalanceSupply(ids, amounts);
            ERC20Helper.safeTransfer(xsgdToken, to, sumOfTokens);

            emit MerchantPayment(from, to, ids, amounts, xsgdToken, sumOfTokens);

        } else {
            _safeBatchTransferFrom(from, to, ids, amounts, data);
        }
    }

    function _validateTransfer(address from, address to) internal {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: caller is not token owner nor approved"
        );
        require(!IPBMAddressList(pbmAddressList).isBlacklisted(to), "PBM: 'to' address blacklisted");
    }

    /**
     *   @notice approval must be given to allow the simple swapcontract to pull money from the PBM smart contract
     *    to initiate a swap.
     */
    function _swapIfNeeded(uint256 tokenId, uint256 amount) internal returns (uint256) {
        if (
            keccak256(abi.encodePacked((PBMTokenManager(pbmTokenManager).getSpotType(tokenId)))) ==
            keccak256(abi.encodePacked("DSGD"))
        ) {
            ERC20(dsgdToken).increaseAllowance(swapContract, amount);
            uint256 xsgdAmount = ISwap(swapContract).swapDSGDtoXSGD(amount);
            return xsgdAmount;
        }
        return amount;
    }   

    /**
     * @dev See {IPBM-revokePBM}.
     *
     * Requirements:
     *
     * - `tokenId` should be a valid ids that has already been created
     * - caller must be the creator of the tokenType
     * - token must be expired
     */
    function revokePBM(uint256 tokenId) external override whenNotPaused {
        uint256 valueOfTokens = PBMTokenManager(pbmTokenManager).getPBMRevokeValue(tokenId);

        PBMTokenManager(pbmTokenManager).revokePBM(tokenId, msg.sender);

        spotToken = getSpotAddress(tokenId);
        // transfering underlying ERC20 tokens
        ERC20Helper.safeTransfer(spotToken, msg.sender, valueOfTokens);

        emit PBMrevokeWithdraw(msg.sender, tokenId, spotToken, valueOfTokens);
    }

    /**
     * @dev See {IPBM-getTokenDetails}.
     *
     */
    function getTokenDetails(
        uint256 tokenId
    ) external view override returns (string memory, uint256, uint256, address) {
        return PBMTokenManager(pbmTokenManager).getTokenDetails(tokenId);
    }

    /**
     * @dev See {IPBM-balanceOf}.
     */
    function balanceOf(address account, uint256 tokenId) public view override returns (uint256) {
        require(account != address(0), "ERC1155: balance query for the zero address");
        if (PBMTokenManager(pbmTokenManager).areTokensValid(serialise(tokenId))) {
            return super.balanceOf(account, tokenId);
        } else {
            return 0;
        }
    }

    /**
     * @dev See {IPBM-getSpotAddress}.
     *
     */
    function getSpotAddress(uint256 tokenId) public view override returns (address) {
        string memory spotType = PBMTokenManager(pbmTokenManager).getSpotType(tokenId);
        return keccak256(abi.encodePacked(spotType)) == keccak256(abi.encodePacked("XSGD")) ? xsgdToken : dsgdToken;
    }

    /**
     * @dev See {IPBM-uri}.
     *
     */
    function uri(uint256 tokenId) public view override(ERC1155, IPBM) returns (string memory) {
        return PBMTokenManager(pbmTokenManager).uri(tokenId);
    }

    // @dev recoverAllERC20 is a function to recover all the balance of a specific ERC20 token from the PBM contract
    // @param _token ERC20 token address
    // requirements:
    // - caller must be the owner
    function recoverAllERC20(address _token) public onlyOwner {
        ERC20 erc20 = ERC20(_token);
        ERC20Helper.safeTransfer(address(erc20), owner(), erc20.balanceOf(address(this)));
    }

    // @dev recoverERC20 is a function to recover specific amount of a ERC20 token from the PBM contract
    // @param _token ERC20 token address
    // @param amount amount of ERC20 token to recover
    // requirements:
    // - caller must be the owner
    function recoverERC20(address _token, uint256 amount) public onlyOwner {
        ERC20 erc20 = ERC20(_token);
        ERC20Helper.safeTransfer(address(erc20), owner(), amount);
    }

    // @dev see { PBMTokenManager - updateTokenExpiry}
    // requirements:
    // - caller must be the owner
    function updateTokenExpiry(uint256 tokenId, uint256 expiry) external onlyOwner {
        PBMTokenManager(pbmTokenManager).updateTokenExpiry(tokenId, expiry);
    }

    // @dev see { PBMTokenManager - updateTokenURI}
    // requirements:
    // - caller must be the owner
    function updateTokenURI(uint256 tokenId, string memory tokenURI) external onlyOwner {
        PBMTokenManager(pbmTokenManager).updateTokenURI(tokenId, tokenURI);
    }

    // @dev see { PBMTokenManager - updatePostExpiryURI}
    // requirements:
    // - caller must be the owner
    function updatePostExpiryURI(uint256 tokenId, string memory postExpiryURI) external onlyOwner {
        PBMTokenManager(pbmTokenManager).updatePostExpiryURI(tokenId, postExpiryURI);
    }

    /**
     * @dev see {Pausable _pause}
     *
     * Requirements :
     * - caller should be owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev see {Pausable _unpause}
     *
     * Requirements :
     * - caller should be owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    function serialise(uint256 num) internal pure returns (uint256[] memory) {
        uint256[] memory array = new uint256[](1);
        array[0] = num;
        return array;
    }
}
