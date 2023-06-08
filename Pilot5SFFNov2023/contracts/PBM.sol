// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./ERC20Helper.sol";
import "./PBMTokenManager.sol";
import "./IPBM.sol";
import "./IPBMAddressList.sol";

contract PBM is ERC1155, Ownable, Pausable, IPBM {
    // undelrying ERC-20 tokens
    address public spotToken = address(0);
    // address of the token manager
    address public pbmTokenManager = address(0);
    // address of the PBM-Addresslist
    address public pbmAddressList = address(0);

    // tracks contract initialisation
    bool internal initialised = false;
    // time of expiry ( epoch )
    uint256 public contractExpiry;

    constructor() ERC1155("") {
        pbmTokenManager = address(new PBMTokenManager());
    }

    //mapping to keep track of how much an user has loaded to PBM
    mapping(address => uint256) public userWalletBalance;

    //mapping to keep track of how much an user is allowed to withdraw from PBM
    mapping(address => mapping(address => uint256)) private _allowances;

    function initialise(address _spotToken, uint256 _expiry, address _pbmAddressList) external override onlyOwner {
        require(!initialised, "PBM: Already initialised");
        require(Address.isContract(_spotToken), "Invalid spot token");
        require(Address.isContract(_pbmAddressList), "Invalid spot token");
        spotToken = _spotToken;
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
     */
    function createPBMTokenType(
        string memory companyName,
        uint256 spotAmount,
        uint256 tokenExpiry,
        address creator,
        string memory tokenURI,
        string memory postExpiryURI
    ) external override onlyOwner {
        PBMTokenManager(pbmTokenManager).createTokenType(
            companyName,
            spotAmount,
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

        // mint the token if the contract - wrapping the xsgd
        PBMTokenManager(pbmTokenManager).increaseBalanceSupply(serialise(tokenId), serialise(amount));
        _mint(receiver, tokenId, amount, "");
    }

    /**
     * @dev See {IPBM-batchMint}.
     *

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

        PBMTokenManager(pbmTokenManager).increaseBalanceSupply(tokenIds, amounts);
        _mintBatch(receiver, tokenIds, amounts, "");
    }

    /**
     * @dev See {IPBM-loadTo}.
     *
     * IMPT: Before loading, the caller should approve the contract address to spend ERC-20 tokens on behalf of the caller.
     *       This can be done by calling the `approve` or `increaseMinterAllowance` functions of the ERC-20 contract and specifying `_spender` to be the PBM contract address.
             Ref : https://eips.ethereum.org/EIPS/eip-20
     *
     * Requirements:
     *
     * - contract must not be paused
     * - tokens must not be expired
     * - `tokenId` should all be valid ids that have already been created
     * - caller should have the necessary amount of PBM envelope tokens required to load spot
     * - caller should have the necessary amount of the ERC-20 tokens required to load
     * - caller should have approved the PBM contract to spend the ERC-20 tokens
     */

    function loadTo(address user, uint256 tokenId, uint256 spotAmount) external whenNotPaused {
        require(balanceOf(user, tokenId) >= 1, "PBM: Don't have enough PBM envelope to load spot");
        ERC20Helper.safeTransferFrom(spotToken, _msgSender(), address(this), spotAmount);
        userWalletBalance[user] += spotAmount;
    }

    /**
     * @dev See {IPBM-unLoadFrom}.
     *
     *
     * Requirements:
     *
     * - contract must not be paused
     * - caller should have loaded to the PBM envelope before and the remaining balance should be more than the spotAmount
     * - caller should have enough allowance to spend the ERC-20 tokens on behalf of the user
     */

    function unLoadFrom(address user, uint256 spotAmount) external whenNotPaused {
        // check the spotAmount is not more than the userWalletBalance
        require(userWalletBalance[user] >= spotAmount, "PBM: User don't have enough spot to unload");
        address spender = _msgSender();
        // check allowance of the caller to spend the ERC-20 tokens on behalf of the user
        _spendAllowance(user, spender, spotAmount);
        // use safeTransfer here to unload the XSGD
        ERC20Helper.safeTransfer(spotToken, _msgSender(), spotAmount);
        userWalletBalance[user] -= spotAmount;
    }

    /**
     * @dev See {IPBM-setApproval}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */

    function setApproval(address spender, uint256 amount) public returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, amount);
        return true;
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    function _spendAllowance(address owner, address spender, uint256 amount) internal {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }

    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
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
     * - caller should have the approval to spend the PBMs on behalf of the owner (`from` addresss)
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override(ERC1155, IPBM) whenNotPaused {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: caller is not token owner nor approved"
        );
        require(!IPBMAddressList(pbmAddressList).isBlacklisted(to), "PBM: 'to' address blacklisted");
        require(amount == 1, "PBM: 'amount' is not 1");

        if (IPBMAddressList(pbmAddressList).isMerchant(to)) {
            // when call safeTransferFrom on a envelope PBM need to encode the payment amount into the data field
            // if the data field is not a valid uint256 type the transaction will revert
            uint spotAmount = abi.decode(data, (uint256));
            require(userWalletBalance[from] >= spotAmount, "PBM: Don't have enough spot to pay");
            userWalletBalance[from] -= spotAmount;
            ERC20Helper.safeTransfer(spotToken, to, spotAmount);
            emit MerchantPayment(from, to, serialise(id), serialise(amount), spotToken, spotAmount);
        }
        _safeTransferFrom(from, to, id, amount, data);
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
     * - caller should have the approval to spend the PBMs on behalf of the owner (`from` addresss)
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public override(ERC1155, IPBM) whenNotPaused {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: caller is not token owner nor approved"
        );
        require(!IPBMAddressList(pbmAddressList).isBlacklisted(to), "PBM: 'to' address blacklisted");
        require(ids.length == amounts.length, "Unequal ids and amounts supplied");

        if (IPBMAddressList(pbmAddressList).isMerchant(to)) {
            // when call safeTransferFrom on a envelope PBM need to encode the payment amount into the data field
            uint spotAmount = abi.decode(data, (uint256));
            require(userWalletBalance[from] >= spotAmount, "PBM: Don't have enough spot to pay");
            userWalletBalance[from] -= spotAmount;
            ERC20Helper.safeTransfer(spotToken, to, spotAmount);
            emit MerchantPayment(from, to, ids, amounts, spotToken, spotAmount);
        }
        _safeBatchTransferFrom(from, to, ids, amounts, data);
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
     * @dev See {IPBM-uri}.
     *
     */
    function uri(uint256 tokenId) public view override(ERC1155, IPBM) returns (string memory) {
        return PBMTokenManager(pbmTokenManager).uri(tokenId);
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
