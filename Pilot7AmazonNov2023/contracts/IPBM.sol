// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

/// @title Purpose-Bound Money (PBM) Interface
/// @notice The PBM interface facilitates logical constraints on the use of ERC-20 tokens by acting as a wrapper around them.
interface IPBM {
    struct UserBalance {
        uint256 walletBalance;
        uint256 availableBalance;
    }

    struct Order {
        uint256 orderValue;
        string orderId;
        address customerWallet;
        address fundDisbursementAddress;
        OrderStatus status;
    }

    enum OrderStatus {
        PENDING,
        REDEEMED,
        CANCELLED
    }

    /// @notice Initializes the contract with the address of the underlying ERC20 token, contract expiration, and the PBM address list.
    /// @param _spotToken The address of the underlying ERC20 token.
    /// @param _expiry Global expiry timestamp for the contract.
    function initialise(address _spotToken, uint256 _expiry) external;

    /// @notice Creates a new PBM token type using the provided data.
    /// @param spotAmount Quantity of the underlying ERC-20 token that the PBM represents.
    /// @param tokenExpiry Expiration timestamp specific to this PBM token type.
    /// @param tokenURI URI pointing to metadata compliant with the Opensea NFT metadata standard.
    /// @param postExpiryURI URI pointing to metadata for the expired PBM type, following the Opensea NFT metadata standard.
    function createPBMTokenType(
        uint256 spotAmount,
        uint256 tokenExpiry,
        string memory tokenURI,
        string memory postExpiryURI
    ) external;

    /// @notice Mints a new PBM instance, essentially creating a PBM account for the specified user. (userAddress->tokenId will be an unique identifier)
    /// @param tokenId Identifier of the PBM token type. (account_id)
    /// @param amount Quantity of PBMs to be minted. When minting to a user directly this should always be 1. When minting to an orchestrator this could be more.
    /// @param receiver Address to receive the minted PBMs.
    function mint(uint256 tokenId, uint256 amount, address receiver) external;

    /// @notice Mints multiple PBM instances in a batch for multiple receivers. Essentially creating a PBM account for the each specified user. (userAddress->tokenId will be an unique identifier)
    /// @param tokenId Identifier of the PBM token type. (account_id)
    /// @param amount Quantity of PBMs to be minted for each receiver. When minting to a user directly this should always be 1. When minting to an orchestrator this could be more.
    /// @param receivers List of addresses to receive the minted PBMs.
    function mintBatch(uint256 tokenId, uint256 amount, address[] memory receivers) external;

    /// @notice Adds the specified amount of underlying ERC-20 tokens to a user's specific PBM token id.
    /// @notice Updates the user's wallet balance and available balance.
    /// @notice Emits a FundsAdded event.
    /// @param tokenId Identifier of the PBM token type. (account_id)
    /// @param spotAmount Quantity of underlying ERC-20 tokens to be added.
    /// @param recipientAddress Address of the user whose balance is to be updated.
    function addUserBalance(uint256 tokenId, uint256 spotAmount, address recipientAddress) external;

    /// @notice Transfers a PBM without moving the underlying ERC20 tokens.
    /// @param from Address sending the PBM.
    /// @param to Address receiving the PBM.
    /// @param id Identifier of the PBM token type being transferred.
    /// @param amount Amount of underlying spotToken to be transferred. (can not be greater than the available balance)
    /// @param data Optional additional data to accompany the transfer.
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) external;

    /// @notice Batch transfers multiple PBMs without moving the underlying ERC20 tokens. This function is unlikely to be used.
    /// @param from Address sending the PBMs.
    /// @param to Address receiving the PBMs.
    /// @param ids List of identifiers for the PBM token types being transferred.
    /// @param amounts List of amounts of underlying spotToken to be transferred. (can not be greater than the available balance)
    /// @param data Optional additional data to accompany the transfer.
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external;

    /// @notice Creates order with the order_id, and how much this order_id cost.
    /// @notice Escrows the user's currentBalance into the contract and update user availableBalance
    /// @notice User needs to call setApprovalForAll() to approve the caller to create order on behalf of user
    /// @param customerWalletAddr Address of the customer placing the order.
    /// @param tokenId Identifier of the PBM token type.
    /// @param orderId Platform-generated identifier for the order.
    /// @param orderValue Value of the order in underlying ERC-20 tokens.
    /// @param fundDisbursementAddr Merchant address to receive the ERC-20 tokens upon order redemption.
    function createOrder(
        address customerWalletAddr,
        uint256 tokenId,
        string memory orderId,
        uint256 orderValue,
        address fundDisbursementAddr
    ) external;

    /// @notice Creates order for grab wallet user with the order_id, and how much this order_id cost.
    /// @notice Escrows the user's currentBalance into the contract and update user availableBalance
    /// @notice Burns the token after the order is created.
    /// @param customerWalletAddr Address of the customer placing the order.
    /// @param tokenId Identifier of the PBM token type.
    /// @param orderId Platform-generated identifier for the order.
    /// @param orderValue Value of the order in underlying ERC-20 tokens.
    /// @param fundDisbursementAddr Merchant address to receive the ERC-20 tokens upon order redemption.
    function createOrderGrab(
        address customerWalletAddr,
        uint256 tokenId,
        string memory orderId,
        uint256 orderValue,
        address fundDisbursementAddr
    ) external;

    /// @notice Cancels a pending order, refunding the ERC-20 token value to the customer.
    /// @param orderId Platform-generated identifier for the order.
    /// @param tokenId Identifier of the PBM token type related to the order.
    function cancelOrder(string memory orderId, uint256 tokenId) external;

    /// @notice Redeems a pending order, releasing the ERC-20 token value to the specified merchant address.
    /// @param orderId Platform-generated identifier for the order.
    /// @param tokenId Identifier of the PBM token type related to the order.
    /// @param userWallet Address of the customer redeeming the order.
    function redeemOrder(string memory orderId, uint256 tokenId, address userWallet) external;

    /// @notice Fetches the balance details for a user for a specific PBM token.
    /// @param user The address of the user whose balance is to be queried.
    /// @param tokenId The identifier of the PBM token type.
    /// @return userBalance The total wrapped erc20 token balance of the user for the specified PBM token.(walletBalance, availableBalance)
    function getUserBalance(address user, uint256 tokenId) external view returns (UserBalance memory userBalance);

    /// @notice Fetches the order details for a specific order ID.
    /// @param orderId The unique identifier for the order.
    /// @return order The details of the order corresponding to the provided order ID (orderValue, orderId, customerWallet, fundDisbursementAddress, status).
    function getOrder(string calldata orderId) external view returns (Order memory order);

    /// @notice Allows the PBM contract owner to claim the underlying ERC-20 tokens after they expire.
    function revokePBM() external;

    /// @notice Retrieves details of a specific PBM token type.
    /// @param tokenId Identifier of the PBM token type.
    /// @return Amount of underlying ERC-20 tokens represented by the PBM.
    /// @return Expiration timestamp specific to this PBM token type.
    function getTokenDetails(uint256 tokenId) external view returns (uint256, uint256);

    /// @notice Retrieves the URI associated with a specific PBM token type.
    /// @param tokenId Identifier of the PBM token type.
    /// @return URI pointing to metadata compliant with the Opensea NFT metadata standard.
    function uri(uint256 tokenId) external view returns (string memory);

    /// @notice Emitted when a PBM's creator retrieves the ERC-20 tokens from expired PBMs.
    /// @param beneficiary Address of the PBM creator receiving the ERC-20 tokens.
    /// @param ERC20Token Address of the underlying ERC-20 token.
    /// @param ERC20TokenValue Quantity of underlying ERC-20 tokens being transferred.
    event PBMrevokeWithdraw(address beneficiary, address ERC20Token, uint256 ERC20TokenValue);
}
