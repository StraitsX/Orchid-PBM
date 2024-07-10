const { ethers, getNamedAccounts } = require("hardhat");

async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);
  console.log("Minter Wallet public address: " + deployerSigner._address);


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


  const receiverList = [
    // "0x2E78aF1d35644fedaeaaf8CA8ACb70D0B35d3b12", // Victor AVAX SAFE-WALLET
    "0xF642be06350DAe9dD475E5A5ad6e25038F295B28", // Victor AVAX EOA Wallet
    // "0x4F67e8Df00d66C36a6d63afC62A29058eC03551A", // Advait AVAX Safe-wallet
    // "0x77018cbA4eD6706028B679c47A44290d47f6B7D2", // Wong tse jian safe wallet 
  ];

  const orchidHeroTester = [
    "0x992b89D8d303A41e66A04B192c529c46e5d4E367", // Venice
    "0x11e3dEdAd810e5a26BfC6677cFF858aA3957A2e8", // Jodie
    "0x27e923873c89fa7aa60988Dbdc8c806B309900Ab", // Greg
    "0xC7A7359F54Bd7E4E22497d08A4A57e56214f4e88", // kah hong
    "0xf1533290DBE91416BcFaef3dB7E5Aa7A76156614", // jing hang
    "0x37932e0c68340b10980029f184A1a06aF1476b6d", // nicky tan
    "0x9fB1D1bC972c095769E2b815BD1a59117a8DdE82", // yik
    "0x978e4ee96434F1F4943cb51c794Bd1Cf82ba6f4A", // zack
    "0x04358464Ebfb7E6EB0D1a46bD25919210A50f546", // yanyi
    "0xd68bF6851202027502C71BB15d97a345D0f9EA62", // alvin
    // "0x57358A3280603F8863e0006c48c8Ba869fd85D83", // Tianwei avax safe-wallet
  ];

  // How much to mint
  const DOLLAR_VALUE_TO_MINT = "1"; // 0.1 stands for 10 cents, 1.0 stands for 1 dollar

  for(const receiver of orchidHeroTester) {

    // increase allowance for PBM
    await xsgd.increaseAllowance(pbmPayment.address, ethers.utils.parseUnits(DOLLAR_VALUE_TO_MINT, await xsgd.decimals()));
    console.log("increased allowance for PBM Contract deducton of: $" + DOLLAR_VALUE_TO_MINT + " XSGD");

    const tokenID = 0;
    // PBM token id 0 -> 0.01 xsgd
    const amount = DOLLAR_VALUE_TO_MINT * 100;

    // PBM Mint to receiver
    const tx = await pbmPayment.mint(tokenID, amount, receiver);
    console.log(`minted PBM token ID ${tokenID} of $${DOLLAR_VALUE_TO_MINT} to address ${receiver}`);
    
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
