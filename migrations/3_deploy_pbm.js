const PBM = artifacts.require("PBM") ; 
const Spot = artifacts.require("Spot") ; 
const PBMAddr = artifacts.require("PBMAddressList") ; 
const PBMTokenManager = artifacts.require("PBMTokenManager")

module.exports = async function (deployer) {

    // deploying PBM addr
    await deployer.deploy(PBMAddr) ; 
    const pbmAddr = await PBMAddr.deployed(); 
    console.log("PBM Address list deployed"); 
    //await new Promise(r => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version


    //const expiryDate = 1668070455; // Nov 11, 2022
    // if you'd prefer to set an expiry a few days from now, UNCOMMENT the code below, and comment the above line.
    currentDate = new Date()
    currentEpoch = Math.floor(currentDate/1000) ; 
    const expiryDate = currentEpoch + 200000; 

    // deploying pbm
    await deployer.deploy(PBM); 
    pbm = await PBM.deployed(); 
    console.log("PBM deployed")
    //await new Promise(r => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version


    const spot = await Spot.deployed() ; 
    const address = spot.address; 
    // If you are deploying to a public testnet/mainnet , and want to use an existing ERC-20 contract, COMMENT OUT the lines above, and UNCOMMENT the code below
    //const address = "0xDC3326e71D45186F113a2F448984CA0e8D201995" ;     // Polygon XSGD address 

    await deployer.deploy(PBMTokenManager, "https://gateway.pinata.cloud/ipfs/QmNj4mt9uxv6bUbWWwpep4B1ir1TY7yvAAxp3U28jU4dHr") ; 
    const pbmTokenManager = await PBMTokenManager.deployed() ; 
    await pbmTokenManager.transferOwnership(pbm.address);
    console.log("PBM Token manager ownership changed") ;  
    //await new Promise(r => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version


    await pbm.initialise(address, expiryDate, pbmAddr.address, pbmTokenManager.address);  
    console.log("PBM initalised");  
    //await new Promise(r => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version
}