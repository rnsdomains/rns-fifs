const RNS = artifacts.require('RNS');
const RIF = artifacts.require('ERC677TokenContract');
const TokenRegistrar = artifacts.require('TokenRegistrar');
const RSKOwner = artifacts.require('RSKOwner');
const NamePrice = artifacts.require('NamePrice');
const FIFSRegistrar = artifacts.require('FIFSRegistrar');
const BytesUtils = artifacts.require('BytesUtils');

const namehash = require('eth-ens-namehash').hash;

module.exports = (deployer, network, accounts) => {
  if (network == 'develop') {
    const POOL = accounts[1];
    let rns, rif, tokenRegistrar, rskOwner, namePrice, fifsRegistrar;

    const devAddress = '0x2824B21e348d520a50cddfA77ba158822160DD94';

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
      return rif.transfer(devAddress, web3.utils.toBN('100000000000000000000'));
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
      return rif.approve(tokenRegistrar.address, amount);
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
      return tokenRegistrar.finalizeAuction(label);
    })
    .then(() => {
      return tokenRegistrar.transfer(label, devAddress);
    })
    .then(() => {
      return deployer.deploy(RSKOwner, tokenRegistrar.address, rns.address, namehash('rsk'));
    })
    .then(_rskOwner => {
      rskOwner = _rskOwner;
    })
    .then(() => {
      return rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), rskOwner.address);
    })
    .then(() => {
      return deployer.deploy(NamePrice);
    })
    .then(_namePrice => {
      namePrice = _namePrice;
    })
    .then(() => {
      return deployer.deploy(BytesUtils);
    })
    .then(() => {
      return deployer.link(BytesUtils, FIFSRegistrar);
    })
    .then(() => {
      return deployer.deploy(FIFSRegistrar, rif.address, rskOwner.address, POOL, namePrice.address);
    })
    .then(_fifsRegistrar => {
      fifsRegistrar = _fifsRegistrar;
    })
    .then(() => {
      return rskOwner.addRegistrar(fifsRegistrar.address);
    })
    .then(() => {
      return web3.eth.sendTransaction({ from: accounts[0], to: devAddress, value: 1000000000000000000 });
    });
  }
}
