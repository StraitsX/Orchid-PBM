const ethSigUtil = require('eth-sig-util');

const EIP712Domain = [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' }
];

// This is structure of the data to be signed and matches the OrderRedeemRequest struct in smart contract.
const OrderRedeemRequest = [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'order_id', type: 'string' },
];

// This function generates the type data required for EIP-712 signing.
// It includes the domain-specific data and the types of the structured data (in this case, OrderRedeemRequest).
function getOrderRedeemRequestTypeData(chainId, verifyingContract) {
    return {
        types: {
            EIP712Domain,
            OrderRedeemRequest,
        },
        domain: {
            name: 'PBM',
            version: '0.0.1',
            chainId,
            verifyingContract,
        },
        primaryType: 'OrderRedeemRequest',
    }
};

// This function generates the signature of the data. I
// f the signer is a private key, it signs the data directly.
// If the signer is a web3 provider, it sends a JSON-RPC request eth_signTypedData_v4 to the Ethereum node, asking it to sign the data.

async function signTypedData(signer, from, data) {
    // If signer is a private key, use it to sign
    if (typeof(signer) === 'string') {
        const privateKey = Buffer.from(signer.replace(/^0x/, ''), 'hex');
        return ethSigUtil.signTypedMessage(privateKey, { data });
    }

    const [method, argData] = ['eth_signTypedData_v4', JSON.stringify(data)]
    // sending a request to sign the EIP-712 data
    return await signer.send(method, [from, argData]);
}

async function buildRequest(PBM, input) {
    return { ...input };
}

async function buildTypedData(PBM, request) {
    const chainId = await PBM.provider.getNetwork().then(n => n.chainId);
    const typeData = getOrderRedeemRequestTypeData(chainId, PBM.address);
    return { ...typeData, message: request };
}

// This script uses EIP-712 to generate a typed signature for the order redemption request
// which can then be verified by the verify function in smart contract.
// It assumes that signer is a web3 provider, but can also accept a private key string.
// The input is a JS object matching the OrderRedeemRequest struct in smart contract.

async function signOrderRedeemRequest(signer, PBM, input) {
    const request = await buildRequest(PBM, input);
    const toSign = await buildTypedData(PBM, request);
    const signature = await signTypedData(signer, input.from, toSign);
    return { signature, request };
}

module.exports = {
    signOrderRedeemRequest,
    buildRequest,
    buildTypedData,
};