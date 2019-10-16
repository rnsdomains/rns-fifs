const RNS = artifacts.require('RNS');
const RIF = artifacts.require('ERC677TokenContract');
const TokenRegistrar = artifacts.require('TokenRegistrar');
const RSKOwner = artifacts.require('RSKOwner');

const namehash = require('eth-ens-namehash').hash;

module.exports = (deployer, network, accounts) => {
  if (network == 'develop') {
    let rns, rif, tokenRegistrar, rskOwner;

    const label = web3.utils.sha3('javiesses');
    const amount = web3.utils.toBN('1000000000000000000');

    return deployer.deploy(RNS).then(_rns => {
      rns = _rns;
    })
    .then(() => {
      return deployer.deploy(RIF, accounts[0], web3.utils.toBN('1000000000000000000000'));
    })
    .then(_rif => {
      rif = _rif;
    })
    .then(() => {
      return deployer.deploy(TokenRegistrar, rns.address, namehash('rsk'), rif.address);
    })
    .then(_tokenRegistrar => {
      tokenRegistrar = _tokenRegistrar;
    })
    .then(() => {
      return rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), tokenRegistrar.address);
    })
    .then(() => {
      return tokenRegistrar.startAuction(label);
    })
    .then(() => {
      return rif.approve(tokenRegistrar.address, amount)
    })
    .then(() => {
      return tokenRegistrar.shaBid(label, accounts[0], amount, '0x00');
    })
    .then(sealedBid => {
      return tokenRegistrar.newBid(sealedBid, amount);
    })
    .then(() => {
      return web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [259200], // 3 days
        id: 0,
      }, () => { });
    })
    .then(() => {
      return tokenRegistrar.unsealBid(label, amount, '0x00')
    })
    .then(() => {
      return web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [172800], // 2 days
        id: 0,
      }, () => { });
    })
    .then(() => {
      return tokenRegistrar.finalizeAuction(label)
    })
    .then(() => {
      return deployer.deploy(RSKOwner, tokenRegistrar.address);
    })
    .then(_rskOwner => {
      rskOwner = _rskOwner;
    })
    .then(() => {
      return rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), rskOwner.address)
    })
  }
}
