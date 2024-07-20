const autocannon = require('autocannon');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const USER_INITIATE_PAY_URL = 'https://ali.sandbox.straitsx.com/api/stress-test/user-initiate-pay';
const PUSH_PAYMENT_URL = 'https://ali.sandbox.straitsx.com/api/stress-test/push-payment';

async function userInitiatePay(acquirerId, pspId, codeValue, customerId) {
    const data = {
        acquirerId,
        pspId,
        codeValue,
        customerId
    };

    const headers = {
        'Content-Type': 'application/json',
        'Client-Id': 'jacob-test',
        'Request-Time': new Date().toISOString(),
        'Signature': 'jacob1STRESS2TEST3key4'
    };

    try {
        const response = await axios.post(USER_INITIATE_PAY_URL, data, { headers });
        console.log('response.data:', response.data)
        return response.data;
    } catch (error) {
        console.error('Error in userInitiatePay:', error);
        throw error;
    }
}

async function pushPayment(acquirerId, pspId, codeValue, paymentId, paymentRequestId, customerId, paymentAmount, settlementAmount, mppPaymentId, walletBrandName) {
    const data = {
        acquirerId,
        pspId,
        codeValue,
        paymentId,
        paymentRequestId,
        customerId,
        paymentAmount,
        settlementAmount,
        mppPaymentId,
        walletBrandName
    };

    const headers = {
        'Content-Type': 'application/json',
        'Client-Id': 'jacob-test',
        'Request-Time': new Date().toISOString(),
        'Signature': 'jacob1STRESS2TEST3key4'
    };

    try {
        const response = await axios.post(PUSH_PAYMENT_URL, data, { headers });
        console.log('response.data:', response.data)
        return response.data;
    } catch (error) {
        console.error('Error in pushPayment:', error);
        throw error;
    }
}

async function makeRequests() {
    const testQR = "00020101021126360009SG.PAYNOW01012020953469324E0301151800007SG.SGQR0112230703330A15020701.00010306440052040200050200060400000708202307035204000053037025802SG5911SG HINOYAMA6009Singapore63049A3A"
    try {
        const userInitiatePayResponse = await userInitiatePay('acquirerId', 'pspId', testQR, 'jacobtest');
        const paymentRequestId = userInitiatePayResponse.paymentRequestId;

        const paymentId = uuidv4();
        const timestamp = new Date().toISOString();

        const pushPaymentResponse = await pushPayment(
            'acquirerId',
            'pspId',
            testQR,
            paymentId,
            paymentRequestId,
            'jacobtest',
            { currency: 'SGD', value: '1' },
            { currency: 'SGD', value: '1' },
            'pay_1089760038715670_102775745070001',
            'stxStressTest'
        );
        console.log(`Success - Payment ID: ${paymentId}, Timestamp: ${timestamp}`);
        console.log('pushPaymentResponse:', pushPaymentResponse)
    } catch (error) {
        console.error('Request failed', error);
    }
}

// async function startStressTest() {
//     autocannon({
//         url: 'https://ali.sandbox.straitsx.com', // Base URL, not used directly in our requests
//         connections: 20, // Number of concurrent connections
//         duration: 60, // Test duration in seconds
//         requests: [
//             {
//                 method: 'POST',
//                 path: '/api/stress-testing/user-initiate-pay',
//                 setupRequest: async (req) => {
//                     const testQR = "00020101021226520008com.grab0136907f3c50-c6a0-4466-8996-7aebae838de75204729953037025402305802SG5917Ayataka Tea House6009Singapore610538897624005076LwenX80725a088aea3c3b7e5efaade9e2fc64270002EN0117Ayataka Tea House63044888";
//                     const data = await userInitiatePay('acquirerId', 'pspId', testQR, 'jacobtest');
//                     req.body = JSON.stringify(data);
//                     req.headers = {
//                         'Content-Type': 'application/json',
//                         'Client-Id': 'jacob-test',
//                         'Request-Time': new Date().toISOString(),
//                         'Signature': 'jacob1STRESS2TEST3key4'
//                     };
//                     return req;
//                 }
//             },
//             {
//                 method: 'POST',
//                 path: '/api/stress-testing/push-payment',
//                 setupRequest: async (req) => {
//                     const testQR = "00020101021226520008com.grab0136907f3c50-c6a0-4466-8996-7aebae838de75204729953037025402305802SG5917Ayataka Tea House6009Singapore610538897624005076LwenX80725a088aea3c3b7e5efaade9e2fc64270002EN0117Ayataka Tea House63044888";
//                     const userInitiatePayResponse = await userInitiatePay('acquirerId', 'pspId', testQR, 'jacobtest');
//                     const paymentRequestId = userInitiatePayResponse.paymentRequestId;
//                     const paymentId = uuidv4();
//                     const data = {
//                         acquirerId: 'acquirerId',
//                         pspId: 'pspId',
//                         codeValue: testQR,
//                         paymentId,
//                         paymentRequestId,
//                         customerId: 'jacobtest',
//                         paymentAmount: { currency: 'SGD', value: '1' },
//                         settlementAmount: { currency: 'SGD', value: '1' },
//                         mppPaymentId: 'pay_1089760038715670_102775745070001',
//                         walletBrandName: 'stxStressTest'
//                     };
//                     req.body = JSON.stringify(data);
//                     req.headers = {
//                         'Content-Type': 'application/json',
//                         'Client-Id': 'jacob-test',
//                         'Request-Time': new Date().toISOString(),
//                         'Signature': 'jacob1STRESS2TEST3key4'
//                     };
//                     return req;
//                 }
//             }
//         ]
//     }, console.log);
// }

async function stressTest(threads, rps) {
    const delay = 1000 / rps; // Delay between each batch of requests in milliseconds

    for (let i = 0; i < threads; i++) {
        const promises = [];

        for (let j = 0; j < threads; j++) {
            promises.push(() => makeRequests(j));
        }

        // Execute all promises at the same time
        await Promise.all(promises.map(promiseFunc => promiseFunc()));
        console.log('Batch completed. Starting new batch...');

        // Wait for the delay before starting the next batch
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}


stressTest(10,10).then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
