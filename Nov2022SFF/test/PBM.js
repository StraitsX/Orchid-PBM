const PBM = artifacts.require("PBM") ; 
const Spot = artifacts.require("Spot") ; 
const PBMAddr = artifacts.require("PBMAddressList")


contract ("PBM and Spot Set up test", () =>{
    var spot = null ; 
    var pbm = null ; 

    before(async()=>{
        spot = await Spot.deployed() ; 
        pbm = await PBM.deployed() ; 
    }) ; 

    it ("Should deploy smart contract", async ()=> {
        assert(pbm.address != "") ;
        assert(spot.address != "") ;  
    }); 
    
    it ("Spot Contract address ", async() => {
        var pbmManager = await pbm.pbmTokenManager.call() ; 
        assert(pbmManager != ""); 
    }) ; 
}) ; 

contract ("Minting test for PBM", (accounts) =>{
    
    var spot = null ; 
    var pbm = null ; 

    before(async()=>{
        spot = await Spot.deployed() ; 
        pbm = await PBM.deployed() ; 
    }) ; 

    it ("Minting before creating the token type gives an error", async ()=>{
        try {
            response = await pbm.mint(0, 1, accounts[0] ) ; 
        }catch (e){
            assert(e.reason=="PBM: Invalid Token Id(s)") ; 
            return ; 
        }
        assert(false) ; 
    }) ; 

    it ("Correctly adds the token type", async () => {
        currentDate = new Date()
        currentEpoch = Math.floor(currentDate/1000) ; 
        var targetEpoch = currentEpoch+100000;  // Expiry is set to 1 day 3.6 hours from current time
        await pbm.createPBMTokenType("StraitsX", 20, targetEpoch, accounts[1], "uri1" ) ; 
        var tokenDetails = await pbm.getTokenDetails.call(0) ; 
        assert(tokenDetails['0']=="StraitsX20") ; 
        assert(tokenDetails['1'].toString()=="20") ; 
        assert(tokenDetails['2'].toString()==targetEpoch) ; 
        assert(tokenDetails['3']==accounts[1].toString()) ; 
    }); 

    it("Minting before approving ERC20 spending gives an error", async()=>{
        try {
            response = await pbm.mint(0, 1, accounts[2], {from: accounts[1]} ) ; 
        }catch (e){
            assert(e["reason"]=="ERC20: Insufficent balance or approval") ; 
            return ; 
        }
        assert(false) ;  
    }) ; 

    it ("Insufficient allowance should give an error", async() => {
        await spot.mint(accounts[1], 40);
        await spot.increaseAllowance(pbm.address, 20, {from: accounts[1]}) ; 
        try {
            response = await pbm.mint(0, 2, accounts[2] ) ; 
        }catch (e){
            assert(e["reason"]=="ERC20: Insufficent balance or approval") ; 
            return ; 
        }
        assert(false) ; 
    }) ; 

    it ("Add more funding and mint a PBM", async() => {
        await spot.increaseAllowance(pbm.address, 20, {from: accounts[1]}) ; 

        
        // mint pbm
        await pbm.mint(0,2, accounts[2], {from: accounts[1]}) ; 
        var NFTbalance = await pbm.balanceOf.call(accounts[2], 0);
        assert(NFTbalance.toString()=="2") ; 
        var balance = await spot.balanceOf(pbm.address) ; 
        assert(balance.toString()=="40") ; 
    }) ; 

    it ("Correct value of tokens is shown even during excess of ERC20 approval", async()=>{
        await spot.mint(accounts[1], 160); 
        await spot.increaseAllowance(pbm.address, 160, {from: accounts[1]}) ;  
        var balance = await spot.balanceOf(pbm.address) ; 
        assert(balance.toString()=="40") ;
        
        // mint pbms
        await pbm.mint(0,3, accounts[3], {from: accounts[1]}) ; 
        var NFTbalance = await pbm.balanceOf.call(accounts[3], 0);
        assert(NFTbalance.toString()=="3") ; 
        var balance = await spot.balanceOf(pbm.address) ; 
        assert(balance.toString()=="100") ; 
    })
}) ; 

// Unit tests to verify the Batch Mint of NFTs 
contract("Batch Mint of NFTs", (accounts)=>{
    var spot = null ; 
    var pbm = null ; 

    before(async()=>{
        spot = await Spot.deployed() ; 
        pbm = await PBM.deployed() ; 
    }) ; 

    it ("Minting before creating the token type gives an error", async ()=>{
        try {
            response = await pbm.batchMint([0,1], [1,1], accounts[0]) ; 
        }catch (e){
            assert(e["reason"]=="PBM: Invalid Token Id(s)") ; 
            return ; 
        }
        assert(false) ; 
    }) ; 

    it("Batch minting a PBM type that doesn't exist gives an error", async()=>{
        // creating a token type 
        currentDate = new Date()
        currentEpoch = Math.floor(currentDate/1000) ; 
        var targetEpoch = currentEpoch+100000;  // Expiry is set to 1 day 3.6 hours from current time
        tokenId = await pbm.createPBMTokenType("StraitsX", 20, targetEpoch, accounts[1], "uri1" ) ; 

        // trying to mint the contract
        try {
            response = await pbm.batchMint([0,1], [1,1], accounts[2], {from: accounts[1]} ) ; 
        }catch (e){
            assert(e["reason"]=="PBM: Invalid Token Id(s)") ; 
            return ; 
        }
        assert(false) ;  
    }) ; 

    it("Minting without appropriate approval gives an error", async()=>{
        // creating a token type 
        currentDate = new Date()
        currentEpoch = Math.floor(currentDate/1000) ; 
        var targetEpoch = currentEpoch+100000;  // Expiry is set to 1 day 3.6 hours from current time
        tokenId = await pbm.createPBMTokenType("Xfers", 10, targetEpoch, accounts[2], "uri2") ; 

        await spot.mint(accounts[1], 30) ; 
        await spot.increaseAllowance(pbm.address, 20, {from: accounts[1]}) ; 
        // trying to mint the contract
        try {
            response = await pbm.batchMint([0,1], [1,1], accounts[0], {from: accounts[1]}) ; 
            assert(false) ; 
        }catch (e){
            assert(e["reason"]=="ERC20: Insufficent balance or approval") ; 
            return ; 
        }
         
    }) ; 

    it ("successfully batch minting a PBM", async() => {
        await spot.mint(accounts[1], 20) ; 
        await spot.increaseAllowance(pbm.address, 30, {from: accounts[1]}) ;  

        
        // mint pbm
        await pbm.batchMint([0,1],[1,3], accounts[2], {from: accounts[1]}) ; 
        var NFTbalanceToken0 = await pbm.balanceOf.call(accounts[2], 0);
        assert(NFTbalanceToken0.toString()=="1") ; 
        var NFTbalanceToken0 = await pbm.balanceOf.call(accounts[2], 1);
        assert(NFTbalanceToken0.toString()=="3") ; 
        var balance = await spot.balanceOf(pbm.address) ; 
        assert(balance.toString()=="50") ; 

    }) ; 

    it ("Correct value of tokens is shown even during excess of spot funding", async()=>{
        await spot.mint(accounts[1], 150) ; 
        await spot.increaseAllowance(pbm.address, 80, {from: accounts[1]}) ;  
        
        // mint pbms
        await pbm.batchMint([0,1],[2,2], accounts[3], {from: accounts[1]}) ; 
        var NFTbalanceToken0 = await pbm.balanceOf.call(accounts[3], 0);
        assert(NFTbalanceToken0.toString()=="2") ; 
        var NFTbalanceToken0 = await pbm.balanceOf.call(accounts[3], 1);
        assert(NFTbalanceToken0.toString()=="2") ; 
        var balance = await spot.balanceOf(pbm.address) ; 
        assert(balance.toString()=="110") ; 

    })
}) ; 

contract("Transfer of PBM NFTs", (accounts)=>{
    var spot = null ; 
    var pbm = null ; 
    var pbmAddr = null ; 

    before(async()=>{
        spot = await Spot.deployed() ; 
        pbm = await PBM.deployed() ; 
        pbmAddr = await PBMAddr.deployed() ; 
    }) ;

    after(async()=>{
        var balance = await spot.balanceOf(pbm.address) ; 
        assert(balance.toString()=="80") ; 
    })

    it("setting up the contract for transfer testing", async()=>{
        // minting spot tokens into wallet 
        await spot.mint(accounts[1], 1000) ;
        await spot.increaseAllowance(pbm.address, 1000, {from: accounts[1]}) ; 
        // creating new token types
        currentDate = new Date()
        currentEpoch = Math.floor(currentDate/1000) ; 
        var targetEpoch = currentEpoch+100000;  // Expiry is set to 1 day 3.6 hours from current time
        await pbm.createPBMTokenType("Xfers", 10, targetEpoch, accounts[1], "uri1" ) ; 
        await pbm.createPBMTokenType("StraitsX",20, targetEpoch, accounts[1], "uri1") ; 
        await pbm.createPBMTokenType("Fazz",10, targetEpoch, accounts[1], "uri1") ; 
        await pbm.batchMint([0,1,2],[2,2,2], accounts[2], {from: accounts[1]}) ;
    })
    
    it("Blacklisting addresses", async()=>{
        await pbmAddr.blacklistAddresses([accounts[6], accounts[5]], "") ; 
        var merchant0 = await pbmAddr.isBlacklisted(accounts[6]) ; 
        var merchant1 = await pbmAddr.isBlacklisted(accounts[5]) ; 
        assert(merchant0==true) ; 
        assert(merchant1==true) ; 
    }) ; 
     
    it("Transfering tokens you don't own gives an error", async()=>{
        try {
            await pbm.safeTransferFrom(accounts[0], accounts[3], 0, 1, "0x") ;  
        }catch (e){
            assert(e["reason"]=="ERC1155: insufficient balance for transfer") ;  
            var balance = await pbm.balanceOf.call(accounts[3],0)  ; 
            assert(balance.toString()=="0") ; 
            return ; 
        }
        assert(false) ;  
    }); 

    it("Batch Transfering tokens you don't own gives an error", async()=>{
        try {
            await pbm.safeBatchTransferFrom(accounts[0], accounts[3], [0,1], [1,0] , "0x") ;  
        }catch (e){
            assert(e["reason"]=="ERC1155: insufficient balance for transfer") ;  
            var balance = await pbm.balanceOf.call(accounts[3],0)  ; 
            assert(balance.toString()=="0") ; 
            return ; 
        }
        assert(false) ;   
    }); 

    it("Transfering invalid token gives an error", async()=>{
        try {
            await pbm.safeTransferFrom(accounts[2], accounts[3], 3, 1, "0x", {from: accounts[1]}) ;  
        }catch (e){
            assert(e["reason"]=="ERC1155: caller is not token owner nor approved") ;  
            var balance = await pbm.balanceOf.call(accounts[3],0)  ; 
            assert(balance.toString()=="0") ; 
            return ; 
        }
        assert(false) ; 
    }); 

    
    it("Batch transfering invalid tokens gives an error", async()=>{
        try {
            await pbm.safeBatchTransferFrom(accounts[2], accounts[3], [3,2], [1,0] , "0x", {from: accounts[1]}) ;  
        }catch (e){
            assert(e["reason"]=="ERC1155: caller is not token owner nor approved") ;  
            var balance = await pbm.balanceOf.call(accounts[3],0)  ; 
            assert(balance.toString()=="0") ; 
            return ; 
        }
        assert(false) ;   
    }); 

    it("Valid Token Transfer", async()=>{
        await pbm.safeTransferFrom(accounts[2], accounts[3], 0, 1, "0x", {from: accounts[2]}) ;
        var account0Balance = await pbm.balanceOf.call(accounts[3],0) ; 
        assert(account0Balance.toString()=="1") ; 
        var account1Blanance = await pbm.balanceOf.call(accounts[2],0) ; 
        assert(account1Blanance.toString()=="1"); 
    }); 

    it("Valid Batch Token Transfer", async()=>{
        await pbm.safeBatchTransferFrom(accounts[2], accounts[4], [0,2], [1,2], "0x", {from: accounts[2]}) ;
        var account3Token0Balance = await pbm.balanceOf.call(accounts[4],0) ; 
        assert(account3Token0Balance.toString()=="1") ; 
        var account3Token2Balance = await pbm.balanceOf.call(accounts[4],2) ; 
        assert(account3Token2Balance.toString()=="2") ; 

        var account1Token0Balance = await pbm.balanceOf.call(accounts[2],0) ; 
        assert(account1Token0Balance.toString()=="0") ; 
        var account1Token2Balance = await pbm.balanceOf.call(accounts[2],2) ; 
        assert(account1Token2Balance.toString()=="0") ; 

    }); 
}) ; 

contract("Payment to whitelisted address through PBM NFTs", (accounts)=>{
    var spot = null ; 
    var pbm = null ; 

    before(async()=>{
        spot = await Spot.deployed() ; 
        pbm = await PBM.deployed() ; 
        pbmAddr = await PBMAddr.deployed() ; 
    }) ;

    it("Setting up the contract for transfer testing", async()=>{
        // minting spot tokens into wallet 
        await spot.mint(accounts[1], 80) ; 
        await spot.increaseAllowance(pbm.address, 80, {from: accounts[1]}) ;  
        // creating new token types
        currentDate = new Date()
        currentEpoch = Math.floor(currentDate/1000) ; 
        var targetEpoch = currentEpoch+100000;  // Expiry is set to 1 day 3.6 hours from current time
        await pbm.createPBMTokenType("Xfers", 10, targetEpoch, accounts[1], "uri1" ) ; 
        await pbm.createPBMTokenType("StraitsX",20, targetEpoch, accounts[1], "uri1") ; 
        await pbm.createPBMTokenType("Fazz",10, targetEpoch, accounts[1], "uri1") ; 
        await pbm.batchMint([0,1,2],[2,2,2], accounts[2], {from: accounts[1]}) ;
    }); 

    it("Whitelisting merchant addresses", async()=>{
        await pbmAddr.addMerchantAddresses([accounts[4], accounts[5]], "") ; 
        var merchant0 = await pbmAddr.isMerchant(accounts[4]) ; 
        var merchant1 = await pbmAddr.isMerchant(accounts[5]) ; 
        assert(merchant0==true) ; 
        assert(merchant1==true) ; 
    }) ; 

    it("Valid payment transaction", async()=>{
        await pbm.safeTransferFrom(accounts[2], accounts[4], 1, 2, "0x", {from: accounts[2]}) ; 
        var balance = await spot.balanceOf(pbm.address) ; 
        assert(balance.toString()=="40") ; 

        var spotBalance = await spot.balanceOf(accounts[4]) ; 
        assert(spotBalance.toString()=="40")
    }) ; 

    it("Payment transaction using tokens you don't own", async()=>{
        try {
            await pbm.safeTransferFrom(accounts[1], accounts[5], 1, 2, "0x", {from: accounts[1]}) ;  
        }catch (e){
            assert(e["reason"]=="ERC1155: burn amount exceeds balance") ;  
            var balance = await spot.balanceOf(pbm.address) ; 
            assert(balance.toString()=="40") ; 
            return ; 
        }
        assert(false) ;  
    })

    it("Valid batch payment transaction", async()=>{
        await pbm.safeBatchTransferFrom(accounts[2], accounts[4], [0,2], [1,2], "0x", {from: accounts[2]}) ; 
        var account1Token0Balance = await pbm.balanceOf(accounts[2],0) ; 
        assert(account1Token0Balance.toString()=="1") ;
        var account1Token2Balance = await pbm.balanceOf(accounts[2],2) ; 
        assert(account1Token2Balance.toString()=="0") ;  
        var balance = await spot.balanceOf(accounts[4]) ; 
        assert(balance.toString()=="70")
    }) ; 

    it("Batch payment transaction using tokens you don't own", async()=>{
        try {
            await pbm.safeBatchTransferFrom(accounts[1], accounts[5], [0,1], [1,2], "0x", {from: accounts[1]}) ;  
        }catch (e){
            var account2Token0Balance = await pbm.balanceOf(accounts[2],0) ; 
            assert(account2Token0Balance.toString()=="1") ; 
            return ; 
        }
        assert(false) ;  
    })

    it("Merchant address is successfully removed from the merchant list", async()=>{
        await pbmAddr.removeMerchantAddresses([accounts[4]],"") ; 
        var merchant0 = await pbmAddr.isMerchant(accounts[4]) ; 
        assert(merchant0==false) ; 
    })
}) ; 

contract("Withdraw funds NFT", (accounts)=>{
    var spot = null ; 
    var pbm = null ; 

    before(async()=>{
        spot = await Spot.deployed() ; 
        pbm = await PBM.deployed() ; 
    }) ;

    it("Set up of contract", async()=>{
        await spot.mint(accounts[1], 80) ; 
        await spot.increaseAllowance(pbm.address, 80, {from: accounts[1]}) ;  
        // creating new token types
        currentDate = new Date()
        currentEpoch = Math.floor(currentDate/1000) ; 
        var targetEpoch = currentEpoch+3;  // Expiry is set to 3 second from current time
        await pbm.createPBMTokenType("Xfers", 10, targetEpoch, accounts[1], "uri1" ) ; 

        await pbm.mint(0,3, accounts[2],{from: accounts[1]}) ; 
    }); 

    it("Revoke before expiry failes", async()=>{
        try {
            await pbm.revokePBM(0, {from: accounts[1] }) ; 
        } catch (e) {
            assert(e["reason"]=="PBM not revokable") ; 
            return ; 
        }
        assert(false); 
    }); 

    it("Revoke by non-creator of PBM failes", async()=>{
        // waiting for 3 secs
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        await sleep(3000) ; 

        try {
            await pbm.revokePBM(0) ; 
        } catch (e) {
            assert(e["reason"]=="PBM not revokable") ; 
            return ; 
        }
        assert(false); 
    }); 

    it("Revoke after expiry succeeds", async()=>{       
        check = await pbm.getTokenDetails(0) ; 
        currentDate = new Date()
        currentEpoch = Math.floor(currentDate/1000) ; 
        await pbm.revokePBM(0, {from: accounts[1]}) ; 
        var balance = await spot.balanceOf(pbm.address) ; 
        assert(balance.toString()=="0") ;
    }); 
}) ; 
