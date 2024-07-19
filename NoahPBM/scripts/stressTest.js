const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const USER_INITIATE_PAY_URL = 'https//ali.sandbox.straitsx.com/api/stress-testing/user-initiate-pay';
const PUSH_PAYMENT_URL = 'https//ali.sandbox.straitsx.com/api/stress-testing/push-payment';

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
        return response.data;
    } catch (error) {
        console.error('Error in pushPayment:', error);
        throw error;
    }
}

async function runThread(threadId) {
    try {
        const testQR = "00020101021226520008com.grab0136907f3c50-c6a0-4466-8996-7aebae838de75204729953037025402305802SG5917Ayataka Tea House6009Singapore610538897624005076LwenX80725a088aea3c3b7e5efaade9e2fc64270002EN0117Ayataka Tea House63044888"
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
        console.log(`Thread ${threadId}: Success - Payment ID: ${paymentId}, Timestamp: ${timestamp}`);
    } catch (error) {
        console.error(`Thread ${threadId}: Failed`);
    }
}

async function stressTest() {
    const threads = 20;

    while (true) {
        const promises = [];

        for (let i = 0; i < threads; i++) {
            promises.push(runThread(i));
        }

        await Promise.all(promises);
        console.log('Batch completed. Starting new batch...');
    }
}

stressTest();