// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol" ; 

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
    uint256 public contractExpiry ; 

    constructor(string memory _uriPostExpiry) ERC1155("") {
        pbmTokenManager = address(new PBMTokenManager(_uriPostExpiry)) ; 
    }

    function initialise(address _spotToken, uint256 _expiry, address _pbmAddressList)
    external 
    override
    onlyOwner
    {
        require(!initialised, "PBM: Already initialised"); 
        require(Address.isContract(_spotToken), "Invalid spot token"); 
        require(Address.isContract(_pbmAddressList), "Invalid spot token"); 
        spotToken = _spotToken;
        contractExpiry = _expiry; 
        pbmAddressList = _pbmAddressList; 

        initialised = true ; 
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
    function createPBMTokenType(string memory companyName, uint256 spotAmount, uint256 tokenExpiry,address creator, string memory tokenURI) 
    external 
    override
    onlyOwner 
    {        
        PBMTokenManager(pbmTokenManager).createTokenType(companyName, spotAmount, tokenExpiry, creator,  tokenURI, contractExpiry);
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
    function mint(uint256 tokenId, uint256 amount, address receiver) 
    external  
    override
    whenNotPaused
    {
        require(!IPBMAddressList(pbmAddressList).isBlacklisted(receiver), "PBM: 'to' address blacklisted");
        uint256 valueOfNewTokens = amount*(PBMTokenManager(pbmTokenManager).getTokenValue(tokenId)); 

        //Transfer the spot token from the user to the contract to wrap it
        ERC20Helper.safeTransferFrom(spotToken, msg.sender, address(this), valueOfNewTokens);

        // mint the token if the contract - wrapping the xsgd
        PBMTokenManager(pbmTokenManager).increaseBalanceSupply(serialise(tokenId), serialise(amount)) ; 
        _mint(receiver, tokenId, amount, ''); 
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
    function batchMint(uint256[] memory tokenIds, uint256[] memory amounts, address receiver) 
    external 
    override
    whenNotPaused
    {   
        require(!IPBMAddressList(pbmAddressList).isBlacklisted(receiver), "PBM: 'to' address blacklisted");
        require(tokenIds.length == amounts.length, "Unequal ids and amounts supplied"); 

        // calculate the value of the new tokens
        uint256 valueOfNewTokens = 0 ; 

        for (uint256 i = 0; i < tokenIds.length; i++) {
            valueOfNewTokens += (amounts[i]*(PBMTokenManager(pbmTokenManager).getTokenValue(tokenIds[i])));  
        } 

        // Transfer spot tokenf from user to contract to wrap it
        ERC20Helper.safeTransferFrom(spotToken, msg.sender, address(this), valueOfNewTokens);
        PBMTokenManager(pbmTokenManager).increaseBalanceSupply(tokenIds, amounts);
        _mintBatch(receiver, tokenIds, amounts, '');
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
    function safeTransferFrom( address from, address to, uint256 id, uint256 amount, bytes memory data) 
    public   
    override(ERC1155, IPBM)
    whenNotPaused  
    {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: caller is not token owner nor approved"
        );
        require(!IPBMAddressList(pbmAddressList).isBlacklisted(to), "PBM: 'to' address blacklisted");

        if (IPBMAddressList(pbmAddressList).isMerchant(to)){
            uint256 valueOfTokens = amount*(PBMTokenManager(pbmTokenManager).getTokenValue(id)); 

            // burn and transfer underlying ERC-20
            _burn(from, id, amount);
            PBMTokenManager(pbmTokenManager).decreaseBalanceSupply(serialise(id), serialise(amount)) ; 
            ERC20Helper.safeTransfer(spotToken, to, valueOfTokens);
            emit MerchantPayment(from, to, serialise(id), serialise(amount), spotToken, valueOfTokens);

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
    function safeBatchTransferFrom(address from,address to,uint256[] memory ids,uint256[] memory amounts, bytes memory data) 
    public  
    override(ERC1155, IPBM)
    whenNotPaused 
    {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: caller is not token owner nor approved"
        );
        require(!IPBMAddressList(pbmAddressList).isBlacklisted(to), "PBM: 'to' address blacklisted");
        require(ids.length == amounts.length, "Unequal ids and amounts supplied"); 

        if (IPBMAddressList(pbmAddressList).isMerchant(to)) {
            uint256 valueOfTokens = 0 ; 
            for (uint256 i = 0; i < ids.length; i++) {
                valueOfTokens += (amounts[i]*(PBMTokenManager(pbmTokenManager).getTokenValue(ids[i]))) ; 
            } 

            _burnBatch(from, ids, amounts);
            PBMTokenManager(pbmTokenManager).decreaseBalanceSupply(ids, amounts);
            ERC20Helper.safeTransfer(spotToken, to, valueOfTokens);

            emit MerchantPayment(from, to, ids, amounts, spotToken, valueOfTokens);

        } else {
            _safeBatchTransferFrom(from, to, ids, amounts, data);
        }
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
    function revokePBM(uint256 tokenId) 
    external 
    override
    whenNotPaused 
    {
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
    function getTokenDetails(uint256 tokenId) 
    external 
    view 
    override
    returns (string memory, uint256, uint256, address) 
    {
        return PBMTokenManager(pbmTokenManager).getTokenDetails(tokenId); 
    }

    /**
     * @dev See {IPBM-uri}.
     *
     */ 
    function uri(uint256 tokenId)
    public  
    view
    override(ERC1155, IPBM)
    returns (string memory)
    {
        return PBMTokenManager(pbmTokenManager).uri(tokenId);
    }

    /**
     * @dev see {Pausable _pause}
     *
     * Requirements : 
     * - caller should be owner
     */
    function pause() 
    external 
    onlyOwner
    {
        _pause();
    }

    /**
     * @dev see {Pausable _unpause}
     *
     * Requirements : 
     * - caller should be owner
     */
    function unpause()
    external 
    onlyOwner
    {
        _unpause();
    }

    function serialise(uint256 num)
    internal 
    pure
    returns (uint256[] memory) {
        uint256[] memory array  = new uint256[](1) ; 
        array[0] = num ; 
        return array ;
    }
}