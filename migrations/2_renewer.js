const Renewer = artifacts.require('Renewer');
const BytesUtils = artifacts.require('BytesUtils');

module.exports = (deployer, network, accounts) => {
  if (network === 'testnet') {
    BytesUtils.address = '0x7faf084ef72cb71f3383a5c568c70853ac4c298e';
    return deployer.link(BytesUtils, Renewer).then(() => {
      return deployer.deploy(
        Renewer,
        '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe',
        '0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71',
        accounts[0],
        '0x794f99f1a9382ba88b453ddb4bfa00acae8d50e8',
      );
    });
  } else if (network === 'mainnet') {
    BytesUtils.address = '0xe9e32c20cbce0ad4f16377bd9a84554828e86a06';
    return deployer.link(BytesUtils, Renewer).then(() => {
      return deployer.deploy(
        Renewer,
        '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5',
        '0x45d3e4fb311982a06ba52359d44cb4f5980e0ef1',
        '0x39e00d2616e792f50ddd33bbe46e8bf55eadebee',
        '0xd09adf13e482928e47e96dd6f02aad1daf7a5a47'
      );
    });
  }
};
