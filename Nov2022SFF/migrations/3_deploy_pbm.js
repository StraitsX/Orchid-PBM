const PBM = artifacts.require("PBM") ; 
const Spot = artifacts.require("Spot") ; 
const PBMAddr = artifacts.require("PBMAddressList") ; 

module.exports = async function (deployer, network, accounts) {

    // deploying PBM addr
    //await deployer.deploy(PBMAddr) ; 
    const pbmAddr = await PBMAddr.deployed(); 
    await new Promise(r => setTimeout(r, 5000)); 
    console.log("Pbm address manager is : ", pbmAddr.address) ; 


    const expiryDate = 1667663999; // Saturday, 5 November 2022 23:59:59 GMT+08:00
    // if you'd prefer to set an expiry a few days from now, UNCOMMENT the code below, and comment the above line.
    /*
    ** currentDate = new Date()
    ** currentEpoch = Math.floor(currentDate/1000) ; 
    ** const expiryDate = currentEpoch + 200000; 
    */
    await deployer.deploy(PBM, "https://harlequin-eldest-leopard-210.mypinata.cloud/ipfs/QmRTr97TBWcp9MTeyNcDn7GseaxWDaKUBiokDyPePS4wnh/TC%202022_expiry.json") ; 
    pbm = await PBM.deployed(); 
    console.log("pbm addresss  : ", pbm.address)

    //const spot = await Spot.deployed() ; 
    //const address = spot.address; 
    // If you are deploying to a public testnet/mainnet , and want to use an existing ERC-20 contract, COMMENT OUT the lines above, and UNCOMMENT the code below
    const address = "0xDC3326e71D45186F113a2F448984CA0e8D201995" ;     // Polygon XSGD address 
    await pbm.initialise(address, expiryDate, pbmAddr.address);    
    await new Promise(r => setTimeout(r, 5000));
}