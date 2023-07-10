//// SPDX-License-Identifier: MIT
//
//contract AmazonPBM {
//    // each user_add -> token_id pair is the user's account number, that holds to the max faceValue.
//    mapping(address => mapping(uint256 => TokenWalletBalance)) private userAccountBalance;
//
//    struct TokenWalletBalance {
//        uint256 availableBalance; // when p2p topup happens, both avail and current balance removed.
//        uint256 currentBalance;
//    }
//
//    enum OrderStatus {
//        PENDING,
//        REDEEMED,
//        CANCELLED
//    }
//
//    struct Order {
//        string order_id;
//        uint256 order_value; // how much this order cost.
//        OrderStatus status;
//    }
//
//    // user address to orders list mapping
//    mapping(address => Order[]) private userOrders;
//
//    // TBD check whether using memory is correct
//    function getUserBalance(address user, uint256 token_id) public returns (TokenWalletBalance memory twb) {
//        TokenWalletBalance memory walBal = userAccountBalance[user][token_id];
//        return walBal;
//    }
//
//    function cancelPayment() {
//        // increase the currentBalance.
//        // eseentially in pay and cancel pay, we only touch the current balance.
//        // avail balance is only edited in the event of p2p transfer, or successful redeem.
//    }
//
//    function myRedeem() {
//        // upon redemption, we will update availBalance (reduce it)
//    }
//
//    function pay() {
//        // move the user's currentBalance into the order list
//        // create Orders with the order_id, and how much this order_id cost.
//        // update userAccountBalance[user][token_id]; currentBalance
//    }
//
//    // how i think safeTransfer should work if we allow P2P transfer.
//    // however in this demo - this function is disabled...
//    function safeTransferrrrr(address sender, address receiver, uint256 token_id, uint256 amount) {
//        // check not expired
//        // check not merchant
//        // check that the token_id faceValue (which is the max value is not exceeded)
//        // check that we subtract from sender properly
//        BLAtransfer(userAccountBalance[sender][token_id], userAccountBalance[receiver][token_id]);
//    }
//}
