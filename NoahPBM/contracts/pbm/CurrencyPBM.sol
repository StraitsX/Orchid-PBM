// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./PBMPayment.sol";

/// @title A CurrencyPBM PBM relies on an external smart contract to manage the underlying ERC-20 tokens.
contract CurrencyPBM is PBMPayment {
    constructor() PBMPayment() {}

    struct Payment {
        uint256 tokenId;
        uint256 amount;
        uint256 totalValue;
        uint256 refundedValue;
    }
    // sourceReferenceID => paymentIDAmount
    mapping(string => Payment) public paymentList;

    function _addToPaymentList(
        string memory sourceReferenceID,
        uint256 tokenId,
        uint256 amount,
        uint256 totalValue
    ) internal {
        require(totalValue > 0, "Total value should be greater than 0");
        require(paymentList[sourceReferenceID].totalValue == 0, "Payment already exists");
        paymentList[sourceReferenceID] = Payment(tokenId, amount, totalValue, 0);
    }

    /**
     * @dev Creates a payment request via NoahpaymentManager to
     * initiate an ERC20 token transfer to merchant.
     * @param from Wallet to deduct PBM From
     * @param to PBM payment address. Must be a merchant address.
     * @param id PBM Token Id
     * @param amount Number of PBM to send
     * @param sourceReferenceID payment source unique identifier.
     * Must be guaranteed to be unique globally across all chains to allow oracle fallback to another
     * chain if necessary
     * @param data metadata to include
     */
    function requestPayment(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        string memory sourceReferenceID,
        bytes memory data
    ) external whenNotPaused nonReentrant {
        _validateTransfer(from, to);
        require(
            IPBMMerchantAddressList(pbmAddressList).isMerchant(to),
            "Payments can only be made to a merchant address."
        );

        uint256 valueOfTokens = amount * getTokenValue(id);

        // Initiate payment of ERC20 tokens
        address spotToken = getSpotAddress(id);
        // Add to payment list
        _addToPaymentList(sourceReferenceID, id, amount, valueOfTokens);

        NoahPaymentManager(noahPaymentManager).createPayment(
            from,
            to,
            spotToken,
            valueOfTokens,
            sourceReferenceID,
            data
        );

        // Burn PBM ERC1155 Tokens
        _burn(from, id, amount);
        PBMTokenManager(pbmTokenManager).decreaseBalanceSupply(serialise(id), serialise(amount));

        emit MerchantPayment(from, to, serialise(id), serialise(amount), spotToken, valueOfTokens);
    }

    /**
     * @dev See {IPBM-revertPaymentForCancel}.
     * Called by noah payment manager to revert the payment process when canceling payment.
     * no underlying ERC20 tokens movement will be done.
     */
    function revertPaymentForCancel(address mintTo, string memory sourceReferenceID) external {
        // check if caller is noah payment manager
        require(msg.sender == noahPaymentManager, "PBM: Only noah payment manager can revert payment");
        Payment memory payment = paymentList[sourceReferenceID];
        uint256[] memory tokenIds = serialise(payment.tokenId);
        uint256[] memory amounts = serialise(payment.amount);

        // Mint back the PBM ERC1155 without underlying ERC20 tokens movement
        PBMTokenManager(pbmTokenManager).increaseBalanceSupply(tokenIds, amounts);
        _mint(mintTo, payment.tokenId, payment.amount, "");
    }

    /**
     * @dev See {IPBM-revertPaymentForRefund}.
     * Called by noah payment manager to revert the payment process when refund a payment.
     * no underlying ERC20 tokens movement will be done.
     */
    function revertPaymentForRefund(address mintTo, string memory sourceReferenceID, uint256 refundValue) external {
        // check if caller is noah payment manager
        require(msg.sender == noahPaymentManager, "PBM: Only noah payment manager can revert payment");
        Payment memory payment = paymentList[sourceReferenceID];
        require(
            refundValue <= (payment.totalValue - payment.refundedValue),
            "PBM: Refund value exceeds remaining value"
        );

        if (refundValue == payment.totalValue) {
            // full refund
            // Mint back the PBM ERC1155 without underlying ERC20 tokens movement
            PBMTokenManager(pbmTokenManager).increaseBalanceSupply(
                serialise(payment.tokenId),
                serialise(payment.amount)
            );
            _mint(mintTo, payment.tokenId, payment.amount, "");
        } else {
            // partial refund
            uint256 tokenValue = getTokenValue(payment.tokenId);
            require(refundValue % tokenValue == 0, "PBM: Refund value should be multiple of pbm token value");
            uint256 tokenAmount = refundValue / tokenValue;

            // Mint back the PBM ERC1155 without underlying ERC20 tokens movement
            PBMTokenManager(pbmTokenManager).increaseBalanceSupply(serialise(payment.tokenId), serialise(tokenAmount));
            _mint(mintTo, payment.tokenId, tokenAmount, "");
        }

        // update refundedValue
        paymentList[sourceReferenceID].refundedValue += refundValue;
    }
}
