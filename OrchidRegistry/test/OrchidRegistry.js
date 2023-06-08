// Test script for OrchidRegistry.sol

const { expect } = require("chai");

describe("OrchidRegistry", function () {
  let QRLookup;
  let qrLookup;
  let owner;
  let merchant1;
  let merchant2;
  let merchant3;
  const hash1 = "bfb81f68cd2399d83e14033a94920ee8e1a6f7fe396ae2ce08daf4fc75f3ebdd";
  const hash2 = "f7b75bbe34ee4f22878c8ca965d19f8e0fcba56db0df7a0607cf5e15ccdf30f4";
  const hash3 = "d0f5b89744a04e889ac68761226c82a51cae031ce07289ac9ac2c32850cdc207";


  beforeEach(async function () {
    QRLookup = await ethers.getContractFactory("OrchidRegistry");
    qrLookup = await QRLookup.deploy();
    [owner, merchant1, merchant2, merchant3] = await ethers.getSigners();
  });

  describe("Contract deployment", function () {
    it("Should set the owner correctly", async function () {
      expect(await qrLookup.owner()).to.equal(owner.address);
    });

  });

describe("Merchant functions", function () {
    let qrLookupConnected;
    beforeEach(async function () {
    qrLookupConnected= await qrLookup.connect(owner);
    });

    describe("registerMerchantQR", function () {

      it("Should register a merchant QR", async function () {
      await qrLookupConnected.registerMerchantQR(hash1, merchant1.address);
      expect(await qrLookup.getMerchantAddress(hash1)).to.equal(merchant1.address);
      });

      it("Should emit MerchantRegistered event when registering a merchant QR", async function () {
      expect(await qrLookupConnected.registerMerchantQR(hash1, merchant1.address))
          .to.emit(qrLookup, "MerchantRegistered")
          .withArgs(hash1, merchant1.address);
      });

      it("Should revert when registering an second merchant address to a registered QR Merchant Info hash", async function () {
      await qrLookupConnected.registerMerchantQR(hash1, merchant1.address);
      await expect(qrLookupConnected.registerMerchantQR(hash1, merchant1.address)).to.be.revertedWith(
          "Error: Merchant already registered. If you wish to overwrite the current registration, please use replaceMerchantQR function."
      );
      });

      it("Should revert when a non-owner attempts to register a merchant QR ", async function () {
      await expect(qrLookup.connect(merchant1).registerMerchantQR(hash1, merchant1.address)).to.be.revertedWith(
          "Error: Only the owner can call this function."
      );
      });
    });

    describe("deregisterMerchantQR", function () {

      it("Should deregister a merchant QR", async function () {
      await qrLookupConnected.registerMerchantQR(hash1, merchant1.address);
      await qrLookupConnected.deregisterMerchantQR(hash1);
      await expect(qrLookup.getMerchantAddress(hash1)).to.be.revertedWith("Error: Merchant is not registered.");
      });


      it("Should emit MerchantDeregistered event when deregistering a merchant QR", async function () {
      await qrLookupConnected.registerMerchantQR(hash1, merchant1.address);
      expect(await qrLookupConnected.deregisterMerchantQR(hash1))
          .to.emit(qrLookup, "MerchantDeregistered")
          .withArgs(hash1, merchant1.address);
      });

      it("Should revert when deregistering a non-registered merchant QR", async function () {
      await expect(qrLookupConnected.deregisterMerchantQR(hash1)).to.be.revertedWith("Error: Merchant is not registered.");
      });

      it("Should revert when a non-owner attempts to deregister a merchant QR", async function () {
      await qrLookupConnected.registerMerchantQR(hash1, merchant1.address);
      await expect(qrLookup.connect(merchant1).deregisterMerchantQR(hash1)).to.be.revertedWith(
          "Error: Only the owner can call this function."
      );
      });
    });

    describe("replaceMerchantQR", function () {

      it("Should replace a merchant QR", async function () {
      await qrLookupConnected.registerMerchantQR(hash1, merchant1.address);
      await qrLookupConnected.replaceMerchantQR(hash1, merchant2.address); 
      expect(await qrLookup.getMerchantAddress(hash1)).to.equal(merchant2.address);
      });

      it("Should emit MerchantReplaced event when replacing a merchant QR", async function () {
      await qrLookupConnected.registerMerchantQR(hash1, merchant1.address);
      expect(await qrLookupConnected.replaceMerchantQR(hash1, merchant2.address))
          .to.emit(qrLookup, "MerchantReplaced")
          .withArgs(hash1, merchant1.address, merchant2.address);
      });

      it("Should revert when replacing a unregistered merchant QR", async function () {
      await expect(qrLookupConnected.replaceMerchantQR(hash1, merchant2.address))
      .to.be.revertedWith("Error: Merchant is not registered.");
      });

      it("Should revert when a non-owner attempts to replace a merchant QR", async function () {
      await qrLookupConnected.registerMerchantQR(hash1, merchant1.address);
      await expect(qrLookup.connect(merchant1).replaceMerchantQR(hash1, merchant2.address))
      .to.be.revertedWith("Error: Only the owner can call this function.");
      });
    });

    describe("getMerchantAddress", function () {

      it("Should get the merchant address by providing a hash of the QR Merchant Info", async function () {
      await qrLookupConnected.registerMerchantQR(hash1, merchant1.address);
      expect(await qrLookup.getMerchantAddress(hash1)).to.equal(merchant1.address);
      });

      it("Should revert when getting a unregistered hash", async function () {
      await expect(qrLookup.getMerchantAddress("unregisteredHash")).to.be.revertedWith("Error: Merchant is not registered.");
      });
    });
});
  describe("Integration Test", function () {
    let qrLookupConnected;
    beforeEach(async function () {
    qrLookupConnected= await qrLookup.connect(owner);
    });
      
    it("Should register a merchant QR, deregister it and then register it again", async function () {
    await qrLookupConnected.registerMerchantQR(hash1, merchant1.address);
    await qrLookupConnected.deregisterMerchantQR(hash1);
    await qrLookupConnected.registerMerchantQR(hash1, merchant2.address);
    expect(await qrLookup.getMerchantAddress(hash1)).to.equal(merchant2.address);
    });

    it("Should register a merchant QR and replace it", async function () {
    await qrLookupConnected.registerMerchantQR(hash1, merchant1.address);
    await qrLookupConnected.replaceMerchantQR(hash1, merchant2.address);
    expect(await qrLookup.getMerchantAddress(hash1)).to.equal(merchant2.address);
    });

    it("Should register three merchant QRs and get the correct merchant addresses", async function () {
    await qrLookupConnected.registerMerchantQR(hash1, merchant1.address);
    await qrLookupConnected.registerMerchantQR(hash2, merchant2.address);
    await qrLookupConnected.registerMerchantQR(hash3, merchant3.address);
    expect(await qrLookup.getMerchantAddress(hash1)).to.equal(merchant1.address);
    expect(await qrLookup.getMerchantAddress(hash2)).to.equal(merchant2.address);
    expect(await qrLookup.getMerchantAddress(hash3)).to.equal(merchant3.address);
    });

    it("Should register two merchant QRs, deregister one and get the correct merchant address for the registered one and revert for the deregistered one", async function () {
    await qrLookupConnected.registerMerchantQR(hash1, merchant1.address);
    await qrLookupConnected.registerMerchantQR(hash2, merchant2.address);
    await qrLookupConnected.deregisterMerchantQR(hash1);
    expect(await qrLookup.getMerchantAddress(hash2)).to.equal(merchant2.address);
    await expect(qrLookup.getMerchantAddress(hash1)).to.be.revertedWith("Error: Merchant is not registered.");
    });
    
    it("Should register two merchant QRs, replace one and get the correct merchant addresses", async function () {
    await qrLookupConnected.registerMerchantQR(hash1, merchant1.address);
    await qrLookupConnected.registerMerchantQR(hash2, merchant2.address);
    await qrLookupConnected.replaceMerchantQR(hash1, merchant3.address);
    expect(await qrLookup.getMerchantAddress(hash2)).to.equal(merchant2.address);
    expect(await qrLookup.getMerchantAddress(hash1)).to.equal(merchant3.address);
    });

    it("Should register two merchant QRs, replace both of them and get correct merchant addresses", async function () {
    await qrLookupConnected.registerMerchantQR(hash1, merchant1.address);
    await qrLookupConnected.registerMerchantQR(hash2, merchant2.address);
    await qrLookupConnected.replaceMerchantQR(hash1, merchant3.address);
    await qrLookupConnected.replaceMerchantQR(hash2, merchant1.address);
    expect(await qrLookup.getMerchantAddress(hash1)).to.equal(merchant3.address);
    expect(await qrLookup.getMerchantAddress(hash2)).to.equal(merchant1.address);
    });

    it("Should register two merchant QRs, replace both of them and deregister both of them. Get merchant address should revert for both.", async function () {
    await qrLookupConnected.registerMerchantQR(hash1, merchant1.address);
    await qrLookupConnected.registerMerchantQR(hash2, merchant2.address);
    await qrLookupConnected.replaceMerchantQR(hash1, merchant3.address);
    await qrLookupConnected.replaceMerchantQR(hash2, merchant1.address);
    await qrLookupConnected.deregisterMerchantQR(hash1);
    await qrLookupConnected.deregisterMerchantQR(hash2);
    await expect(qrLookup.getMerchantAddress(hash1)).to.be.revertedWith("Error: Merchant is not registered.");
    await expect(qrLookup.getMerchantAddress(hash2)).to.be.revertedWith("Error: Merchant is not registered.");
    });

  });
});
