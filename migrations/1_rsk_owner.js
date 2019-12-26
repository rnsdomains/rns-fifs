const RNS = artifacts.require('RNS');
const RIF = artifacts.require('ERC677TokenContract');
const TokenRegistrar = artifacts.require('TokenRegistrar');
const RSKOwner = artifacts.require('RSKOwner');
const NamePrice = artifacts.require('NamePrice');
const FIFSRegistrar = artifacts.require('FIFSRegistrar');
const BytesUtils = artifacts.require('BytesUtils');
const Renewer = artifacts.require('Renewer');

const namehash = require('eth-ens-namehash').hash;

/**
 * Deploys full RNS suite in local network
 * - RIF Token
 * - RNS Registry
 * - Token Registrar (auction)
 * - RSK Owner + FIFS Registrar
 * It also registers a name in TOken Registrar: javiesses.rsk
 * @param {Object} deployer Truffle deployer
 * @param {string[]} accounts Unlocked accounts
 */
function deployDev (deployer, accounts) {
  const POOL = accounts[1];
  let rns, rif, tokenRegistrar, rskOwner, namePrice, fifsRegistrar, renewer;

  const devAddress = '0x2824b21e348d520a50cddfa77ba158822160dd94';

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
    return deployer.link(BytesUtils, Renewer);
  })
  .then(() => {
    return deployer.deploy(Renewer, rif.address, rskOwner.address, POOL, namePrice.address);
  })
  .then(_renewer => {
    renewer = _renewer;
  })
  .then(() => {
    return rskOwner.addRenewer(renewer.address);
  })
  .then(() => {
    return web3.eth.sendTransaction({ from: accounts[0], to: devAddress, value: 1000000000000000000 });
  });
}

/**
 * Deploy rsk registrar suite in production network
 * @param {Object} deployer Truffle deployer
 * @param {Object} contracts in roder { rif token, rns registry, token registrar, resource poo, final owner }
 */
function deployProd (deployer, { RIF, RNS, TOKEN_REGISTRAR, POOL, MULTISIG }) {
  return deployer.deploy(RSKOwner, TOKEN_REGISTRAR, RNS, namehash('rsk'))
  .then(_rskOwner => {
    rskOwner = _rskOwner;
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
    return deployer.deploy(FIFSRegistrar, RIF, rskOwner.address, POOL, namePrice.address);
  })
  .then(_fifsRegistrar => {
    fifsRegistrar = _fifsRegistrar;
  })
  .then(() => {
    return rskOwner.addRegistrar(fifsRegistrar.address);
  })
  .then(() => {
    return rskOwner.transferOwnership(MULTISIG);
  })
  .then(() => {
    return fifsRegistrar.transferOwnership(MULTISIG);
  });

  // to activate execute
  // rns.setSubnodeOwner('0x00', sha3('rsk'), rskOwner.address)
}

module.exports = (deployer, network, accounts) => {
  switch (network) {
    case 'develop':
      return deployDev(deployer, accounts);
    case 'testnet':
      return deployProd(deployer, {
        RIF: '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe',
        RNS: '0x7d284aaac6e925aad802a53c0c69efe3764597b8',
        TOKEN_REGISTRAR: '0x3d1a11c623bd21375f2b69f4eec814f4ceeb1d8d',
        POOL: accounts[0],
        MULTISIG: accounts[0],
      });
    case 'mainnet':
      return deployProd(deployer, {
        RIF: '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5',
        RNS: '0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5',
        TOKEN_REGISTRAR: '0x5269f5bc51cdd8aa62755c97229b7eeddd8e69a6',
        POOL: '0x39e00d2616e792f50ddd33bbe46e8bf55eadebee',
        MULTISIG: '0x39e00d2616e792f50ddd33bbe46e8bf55eadebee',
      });
    default:
      console.error('No migrations.');
      return deployer;
  }
};
