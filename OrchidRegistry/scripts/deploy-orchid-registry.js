const fs = require('fs');
const ORIGINAL_PATH = './deployed_addresses/OrchidRegistry/';

async function main() {
    // Get the contract to deploy
    const OrchidRegistry = await ethers.getContractFactory("OrchidRegistry");
    // Deploy the contract using a particular signer
    const contract = await OrchidRegistry.deploy();
    // Wait for the contract to be deployed, then print its address
    await contract.deployed();
    console.log(contract)   
    console.log("OrchidRegistry deployed to:", contract.address);
    const deployedAddress = {
      network: await ethers.provider.getNetwork(),
      contractAddress: contract.address,
      contractOwner: await contract.owner()
    };
    let filename;
    if (deployedAddress.network.chainId == 80001) {
      filename = "polygon-mumbai";
    } else if (deployedAddress.network.chainId == 137) {
      filename = "polygon-mainnet";
    } else if (deployedAddress.network.chainId == 31337) {
      filename = "hardhat";
    } else {
      throw new Error("Network not supported");
    }

    if (!folderExists(ORIGINAL_PATH + 'archived')) {
      // create archived folder if it doesn't exist
      fs.mkdirSync(ORIGINAL_PATH + 'archived'); 
    }

    if (fileExists(`${ORIGINAL_PATH}${filename}.json`)) {
      // archive the old json file
      await archive(ORIGINAL_PATH,filename);
    }
    
    // write a json file to /deployed_addresses/ folder
    fs.writeFileSync(`${ORIGINAL_PATH}${filename}.json`, JSON.stringify(deployedAddress));

}

// archive the old json file
async function archive(originalPath, filename) {
    
    const path = require('path');
    // Get date and timestamp
    const date = new Date();
    // format the date to DDMMYYYY, pad the month and date with 0 if they are single digit
    const formattedDate = (date.getDate() < 10 ? '0' : '') + date.getDate() + "" + ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1) + "" + date.getFullYear();
    // format the timestamp to HHMMSS, pad the hour, minute and second with 0 if they are single digit
    const formattedTimestamp = (date.getHours() < 10 ? '0' : '') + date.getHours() + "" + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes() + "" + (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
    const oldPath = path.resolve(originalPath, `${filename}.json`);
    // move to archived folder with timestamped filename to document archival date
    const newPath = path.resolve(originalPath, 'archived', `${filename}-${formattedDate}-${formattedTimestamp}.json`);
    fs.renameSync(oldPath, newPath);
}

function fileExists(path) {
  try {
    // Check if the file exists
    return fs.existsSync(path) && fs.lstatSync(path).isFile();
  } catch (error) {
    // Handle any errors that occur during the check
    return false;
  }
}

function folderExists(path) {
  try {
    // Check if the path exists and is a directory
    return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
  } catch (error) {
    // Handle any errors that occur during the check
    return false;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
