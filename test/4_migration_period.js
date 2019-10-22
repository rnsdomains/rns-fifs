const RNS = artifacts.require('RNS');
const Token = artifacts.require('ERC677TokenContract');
const TokenRegistrar = artifacts.require('TokenRegistrar');
const RSKOwner = artifacts.require('RSKOwner');

const namehash = require('eth-ens-namehash').hash;
const helpers = require('@openzeppelin/test-helpers');

contract('RSK Owner - migration period', async (accounts) => {
  let rns, token, tokenRegistrar, rskOwner;

  const migrationPeriod = web3.utils.toBN('1296000'); // 15 days

  beforeEach(async () => {
    rns = await RNS.new();
    token = await Token.new(accounts[0], web3.utils.toBN('1000000000000000000000'));
    tokenRegistrar = await TokenRegistrar.new(rns.address, namehash('rsk'), token.address);
    await rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), tokenRegistrar.address);

    rskOwner = await RSKOwner.new(tokenRegistrar.address, migrationPeriod);
    await rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), rskOwner.address);
    await rskOwner.addRegistrar(accounts[2], { from: accounts[0] });
  });

  it('should not allow to register for a given period', async () => {
    await helpers.expectRevert(
      rskOwner.register({ from: accounts[2] }),
      'Registration not available.'
    );
  });

  it('should allow to register after given period', async () => {
    await web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [1296001], // 15 days + 1 sec
      id: 0,
    }, () => { });

    await rskOwner.register({ from: accounts[2] });
    // testing no revert, no actions taken for register() yet
  });
});
