const { ethers, getNamedAccounts } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  // pbm on arbitrum: 0xF28A99687a5d40Cb18c1d555f5e2d4b17a7ACFD4
  // pbm on polygon: 0xD2D74e2136D60A3c0D252C6dE4102a82f2511DEF
  const pbmAddr = '0xF28A99687a5d40Cb18c1d555f5e2d4b17a7ACFD4';
  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmAddr)
    .connect(deployerSigner);

  const jacob = '0x8CC4D23D8556Fdb5875F17b6d6D7149380F24D93';
  const merchant = '0x3aa7E64b811857d942e6Cc39cFBBad2664b14CdF';

  console.log('Sending transaction...');
  const sendTime = new Date().toISOString();
  // arbitrum token id 0
  const transferTxn = await pbm.safeTransferFrom(jacob, merchant, 0, 1, '0x');
  // polygon token id 3
  // const transferTxn = await pbm.safeTransferFrom(jacob, merchant, 3, 1, "0x");
  console.log(`Transaction sent at: ${sendTime}`);

  // Poll the network to check if the transaction is in the mempool
  let txnDetails = null;
  while (txnDetails === null) {
    txnDetails = await ethers.provider.getTransaction(transferTxn.hash);
    // If null, the transaction is not in the mempool yet, so wait for a short period before checking again.
    if (txnDetails === null) {
      console.log('Transaction not seen by the network yet...');
    }
  }

  const seenTime = new Date().toISOString();

  console.log(`Transaction seen by the network at: ${seenTime}.`);

  const receipt = await transferTxn.wait();

  const confirmTime = new Date().toISOString();
  console.log(`Transaction confirmed at: ${confirmTime}`);

  // Fetch the block in which the transaction was included to get the timestamp
  const block = await ethers.provider.getBlock(receipt.blockNumber);
  console.log(
    `Block timestamp: ${new Date(block.timestamp * 1000).toISOString()}`,
  );
  // Calculate the duration in milliseconds
  const duration = new Date(confirmTime) - new Date(seenTime);
  console.log(
    `Transaction from seen in mempool to mined in ${duration} milliseconds.`,
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
