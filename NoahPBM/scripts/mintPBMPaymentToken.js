const { ethers, getNamedAccounts } = require("hardhat");

async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);
  console.log("wallet public address: " + deployerSigner._address);


  // STX subnet PBMPayment: 0xba17a9f3C074d381D53D605590Eb13dde2d176a9
  // please change as needed
  const pbmPaymentAddr = "0x8bce8B6BAC1639f2AdB4496389FA2EfBf61BC454";
  const pbmPayment = (await ethers.getContractFactory("PBMPayment")).attach(pbmPaymentAddr).connect(deployerSigner);

  // fuji testnet XSGD 0xd769410dc8772695A7f55a304d2125320A65c2a5
  // c chain XSGD 0xb2F85b7AB3c2b6f62DF06dE6aE7D09c010a5096E
  // stx subnet XSGD 0x49aB91610BfDA3493e7549176247060643A9108b
  // please change as needed
  const spotAddress = "0xb2F85b7AB3c2b6f62DF06dE6aE7D09c010a5096E";
  const XSGD = await ethers.getContractFactory("Spot");
  const xsgd = await XSGD.attach(spotAddress).connect(deployerSigner);

  // How much to mint
  const DOLLAR_VALUE_TO_MINT = "0.1"; // 0.1 stands for 10 cents, 1.0 stands for 1 dollar

  const receiverList = [
    "0x2E78aF1d35644fedaeaaf8CA8ACb70D0B35d3b12", // Victor AVAX SAFE-WALLET
    "0xF642be06350DAe9dD475E5A5ad6e25038F295B28", // Victor AVAX EOA Wallet
  ];

  for(const receiver of receiverList) {

    // increase allowance for PBM
    await xsgd.increaseAllowance(pbmPayment.address, ethers.utils.parseUnits(DOLLAR_VALUE_TO_MINT, await xsgd.decimals()));
    console.log("increased allowance for PBM Contract deducton of: $" + DOLLAR_VALUE_TO_MINT + " XSGD");

    const tokenID = 0;
    // PBM token id 0 -> 0.01 xsgd
    const amount = DOLLAR_VALUE_TO_MINT * 100;

    // PBM Mint to receiver
    const tx = await pbmPayment.mint(tokenID, amount, receiver);
    console.log(`minted PBM token ${tokenID} to address ${receiver}`);
    
    // wait for txn to truly be completed
    const receipt = await tx.wait();
  }


}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
