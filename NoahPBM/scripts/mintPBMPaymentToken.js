const { ethers, getNamedAccounts } = require("hardhat");
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmPaymentAddr = "0x8bce8B6BAC1639f2AdB4496389FA2EfBf61BC454";
  const pbmPayment = (await ethers.getContractFactory("PBMPayment")).attach(pbmPaymentAddr).connect(deployerSigner);

  // fuji testnet XSGD 0xd769410dc8772695A7f55a304d2125320A65c2a5
  // c chain XSGD 0xb2F85b7AB3c2b6f62DF06dE6aE7D09c010a5096E
  // stx subnet XSGD 0x49aB91610BfDA3493e7549176247060643A9108b
  // please change as needed
  const spotAddress = "0xb2F85b7AB3c2b6f62DF06dE6aE7D09c010a5096E";
  const XSGD = await ethers.getContractFactory("Spot");
  const xsgd = await XSGD.attach(spotAddress).connect(deployerSigner);

  // increase allowance for PBM
  await xsgd.increaseAllowance(pbmPayment.address, ethers.utils.parseUnits("10", await xsgd.decimals()));
  console.log(`increased allowance for PBM to 10 XSGD`);

  const tokenID = 0;
  // PBM token id 0 -> 0.01 xsgd
  const amount = 1000;

  const receiver = "0x77018cbA4eD6706028B679c47A44290d47f6B7D2";

  // approve PBM
  await pbmPayment.mint(tokenID, amount, receiver);
  console.log(`minted PBM token ${tokenID} to address ${receiver}`);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
