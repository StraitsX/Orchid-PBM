const { ethers } = require('hardhat');

async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}

const getSigners = async () => {
  return await ethers.getSigners();
};

const parseUnits = (value, decimals) => {
  return ethers.utils.parseUnits(value, decimals);
};

async function initPBM(
  pbm,
  xsgdTokenAdd,
  dsgdTokenAdd,
  swapContractAdd,
  addressListAdd,
  heroNFTAdd,
) {
  await pbm.initialise(
    xsgdTokenAdd,
    dsgdTokenAdd,
    swapContractAdd,
    Math.round(new Date().getTime() / 1000 + 86400 * 30),
    addressListAdd,
    heroNFTAdd,
  );
}

async function createTokenType(pbm, name, spotValue, spot, owner) {
  let currentDate = new Date();
  let currentEpoch = Math.floor(currentDate / 1000);
  let targetEpoch = currentEpoch + 100000; // Expiry is set to 1 day 3.6 hours from current time

  await pbm.createPBMTokenType(
    name,
    parseUnits(spotValue, await spot.decimals()),
    spot.symbol(),
    targetEpoch,
    owner.address,
    'beforeExpiryURI',
    'postExpiryURI',
  );
}

async function mintPBM(pbm, spot, tokenId, amount, to, spotValue) {
  await spot.increaseAllowance(pbm.address, parseUnits(spotValue, 6) * amount);
  await pbm.mint(tokenId, amount, to);
}

async function whilteListMerchant(addressList, addresses) {
  await addressList.addMerchantAddresses(addresses, '');
}

async function addMerchantAsHero(addressList, addresses, tokenIds) {
  await addressList.addHeroMerchant(addresses, tokenIds);
}

module.exports = {
  deploy,
  getSigners,
  createTokenType,
  initPBM,
  mintPBM,
  whilteListMerchant,
  addMerchantAsHero,
  parseUnits,
};
