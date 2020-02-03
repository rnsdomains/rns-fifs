const BytesUtils = artifacts.require('BytesUtils');
const FIFSAddrRegistrar = artifacts.require('FIFSAddrRegistrar');
const namehash = require('eth-ens-namehash').hash;

module.exports = (deployer, network, accounts) => {
  if (network === 'testnet') {
    BytesUtils.address = '0x7faf084ef72cb71f3383a5c568c70853ac4c298e';
    deployer.link(BytesUtils, FIFSAddrRegistrar).then(() => {
      return deployer.deploy(
        FIFSAddrRegistrar,
        '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe', // rif
        '0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71', // node owner
        accounts[0], // pool
        '0x794f99f1a9382ba88b453ddb4bfa00acae8d50e8', // name price
        '0x7d284aaac6e925aad802a53c0c69efe3764597b8', // rns
        namehash('rsk'), // root node
      );
    });
  } else if (network === 'mainnet') {
    BytesUtils.address = '0xe9e32c20cbce0ad4f16377bd9a84554828e86a06';
    deployer.link(BytesUtils, FIFSAddrRegistrar).then(() => {
      return deployer.deploy(
        FIFSAddrRegistrar,
        '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5', // rif
        '0x45d3e4fb311982a06ba52359d44cb4f5980e0ef1', // node owner
        '0x39e00d2616e792f50ddd33bbe46e8bf55eadebee', // pool
        '0xd09adf13e482928e47e96dd6f02aad1daf7a5a47', // name price
        '0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5', // rns
        namehash('rsk'), // root node
      ).then(addrRegistrar => {
        return addrRegistrar.transferOwnership('0x39e00d2616e792f50ddd33bbe46e8bf55eadebee')
      });
    });
  }
}
