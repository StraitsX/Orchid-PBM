const PBM = artifacts.require("PBM") ; 
const Spot = artifacts.require("Spot") ; 
const PBMAddr = artifacts.require("PBMAddressList") ; 

module.exports = async function (deployer,network, accounts) {

    // Migration to create and deploy PBM token types
    // Commented our since this is not required by all. UNCOMMENT and use as necessary

    // const spot = await Spot.deployed() ; // UNCOMMENT  if you are using the ERC20 deployed in the second migration
    const pbm = await PBM.deployed(); 

    // currentDate = new Date()
    // currentEpoch = Math.floor(currentDate/1000) ;
    // var targetEpoch = currentEpoch+100000;  // Expiry is set to 115 days, 17 hours, 46 minutes and 40 seconds
    // var targetEpoch = 1684843200; // Tuesday, May 23, 2023 8:00:00 PM GMT+08:00 2023-05-23T20:00:00+08:00
    var targetEpoch = 1716469200; // Tue May 23 2024 21:00:00 GMT+0800 (Taipei Standard Time) 2024-05-23T21:00:00+08:00
    var may31Epoch = 1685538000; // Wednesday, May 31, 2023 21:00:00 GMT+08:00 2023-05-31T21:00:00+08:00


    // // Increasing allowance on deployed ERC20 tokens. UNCOMMENT below if you are using the ERC20 deployed in the second migration
    // await spot.mint(accounts[0], 100000000000 ) ;
    // console.log("minted spot") ;

    // creating new PBM token types with aligned metadata
    await pbm.createPBMTokenType("Grab1-sample", 1000000, targetEpoch, accounts[0], "https://gateway.pinata.cloud/ipfs/QmSQedXTQeYskLthumBtD9vh4DFJyrWVfjQXBQTDB9tPCw", "https://gateway.pinata.cloud/ipfs/QmXCGMvSF5VuYmbJMJrngoPAr2pEeeBk7LivccsSxm9qKS" ) ;
    console.log("PBM Token type 1 created") ;
    await new Promise(r => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

    await pbm.createPBMTokenType("Grab2-sample", 2000000, targetEpoch, accounts[0], "https://gateway.pinata.cloud/ipfs/QmWMM6AfC25Cu2SVJwx8xMmkc9g6aWjoEw1G6u6jFzqd35", "https://gateway.pinata.cloud/ipfs/QmXKQWs6BoGfrooWZWmcF13gu38etP7pabU4x9DegdtNvj" ) ;
    console.log("PBM Token type 2 created") ;
    await new Promise(r => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

    await pbm.createPBMTokenType("Grab3-sample", 3000000, may31Epoch, accounts[0], "https://gateway.pinata.cloud/ipfs/QmPqd4rW5YWmErDUUxFQK3iLn8h632egizkYHYasY7swX6", "https://gateway.pinata.cloud/ipfs/QmUiUpRkE17jBLFsphxgvfqsNaF46YNeSzWSkSc6ERC2We" ) ;
    console.log("PBM Token type 3 created") ;
    await new Promise(r => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version


    // Increasing allowance on deployed ERC20 tokens. UNCOMMENT below if you are using the ERC20 deployed in the second migration
    // await spot.increaseAllowance(pbm.address, 1000000000) ;
    // await new Promise(r => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

    // Increasing allowance on mumbai XSGD
    const spot = await Spot.at("0x16e28369bc318636abbf6cb1035da77ffbf4a3bc"); // XSGD deployed on mumbai
    await spot.increaseAllowance(pbm.address, 10000000000) ;
    await pbm.batchMint([0,1,2], [10,10,10], "0x8CC4D23D8556Fdb5875F17b6d6D7149380F24D93") ;
    // airdrop to circle test wallet
    // await pbm.batchMint([0,1,2], [10,10,10], "0x281F397c5a5a6E9BE42255b01EfDf8b42F0Cd179") ;
    // airdrop to grab wallet
    // await pbm.batchMint([0,1,2], [10,10,5], "0xd0b72a553d2c57f7997ba420a758c7a0fad92eef") ;
    console.log("PBM created and minted") ; 
}