const PBM = artifacts.require("PBM") ; 
const Spot = artifacts.require("Spot") ; 
const PBMAddr = artifacts.require("PBMAddressList") ; 

module.exports = async function (deployer,network, accounts) {

    // Migration to create and deploy PBM token types
    // Commented our since this is not required by all. UNCOMMENT and use as necessary

    // //const spot = await Spot.deployed() ; // UNCOMMENT  if you are using the ERC20 deployed in the second migration 
    const pbm = await PBM.deployed(); 

    // // currentDate = new Date()
    // // currentEpoch = Math.floor(currentDate/1000) ; 
    // //var targetEpoch = currentEpoch+10000000;  // Expiry is set to 115 days, 17 hours, 46 minutes and 40 seconds
    var targetEpoch = 1667577599; // Friday, 4 November 2022 23:59:59 GMT+08:00


    // // Increasing allowance on deployed ERC20 tokens. UNCOMMENT below if you are using the ERC20 deployed in the second migration
    // //await spot.mint(accounts[0], 100 ) ; 
    // //console.log("minted spot") ; 

    // creating new PBM token types
    await pbm.createPBMTokenType("Temasek", 1000000, targetEpoch, accounts[0], "https://harlequin-eldest-leopard-210.mypinata.cloud/ipfs/QmRTr97TBWcp9MTeyNcDn7GseaxWDaKUBiokDyPePS4wnh/TC%202022_$1.json" ) ; 
    console.log("PBM Token type 1 created") ; 
    await new Promise(r => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

    await pbm.createPBMTokenType("Temasek", 9000000, targetEpoch, accounts[0], "https://harlequin-eldest-leopard-210.mypinata.cloud/ipfs/QmRTr97TBWcp9MTeyNcDn7GseaxWDaKUBiokDyPePS4wnh/TC%202022_$9.json" ) ;
    console.log("PBM Token type 2 created") ; 
    await new Promise(r => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

    // // Increasing allowance on deployed ERC20 tokens. UNCOMMENT below if you are using the ERC20 deployed in the second migration
    // //await spot.increaseAllowance(pbm.address, 100) ; 
    // //await new Promise(r => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

    await pbm.batchMint([0,1], [1,1], "0x276f35cCF9f6F313c7b34Df558c2DdC56045885c") ; 
    console.log("PBM created and minted") ; 
}