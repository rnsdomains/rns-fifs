const RNS = artifacts.require('RNS');
const Token = artifacts.require('ERC677TokenContract');
const TokenRegistrar = artifacts.require('TokenRegistrar');
const RSKOwner = artifacts.require('RSKOwner');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('RSK Owner - registration', async (accounts) => {
  let rns, token, tokenRegistrar, rskOwner;

  beforeEach(async () => {
    const rootNode = namehash('rsk');

    rns = await RNS.new();
    token = await Token.new(accounts[0], web3.utils.toBN('1000000000000000000000'));
    tokenRegistrar = await TokenRegistrar.new(rns.address, rootNode, token.address);
    await rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), tokenRegistrar.address);

    rskOwner = await RSKOwner.new(
      tokenRegistrar.address,
      rns.address,
      rootNode,
    );

    await rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), rskOwner.address);
    await rskOwner.addRegistrar(accounts[0], { from: accounts[0] });
    await rskOwner.addRenewer(accounts[0], { from: accounts[0] });
  });

  it('should not allow to renew an not owned name', async () => {
    await helpers.expectRevert(
      rskOwner.renew(web3.utils.sha3('ilanolkies'), web3.utils.toBN('99999999999')),
      'Name already expired'
    );
  });

  it('should not allow to renew expired names', async () => {
    const name = web3.utils.sha3('ilanolkies');

    await rskOwner.register(name, accounts[1], web3.utils.toBN('100'));

    await helpers.time.increase(101);

    await helpers.expectRevert(
      rskOwner.renew(web3.utils.sha3('ilanolkies'), web3.utils.toBN('99999999999')),
      'Name already expired'
    );
  });

  it('should not allow to overflow renovation time', async () => {    const name = web3.utils.sha3('ilanolkies');
    await rskOwner.register(name, accounts[1], web3.utils.toBN('100'));

    await helpers.expectRevert(
      rskOwner.renew(web3.utils.sha3('ilanolkies'), helpers.constants.MAX_UINT256),
      'SafeMath: addition overflow.'
    );
  });

  it('should allow to renew any owned name', async () => {
    const name = web3.utils.sha3('ilanolkies');
    const additionalTime = web3.utils.toBN('100');

    await rskOwner.register(name, accounts[0], web3.utils.toBN('100'));

    const expectedTime = await rskOwner.expirationTime(web3.utils.toBN(name)).then(t => t.add(additionalTime));

    await rskOwner.renew(web3.utils.sha3('ilanolkies'), additionalTime);

    const actualTime = await rskOwner.expirationTime(web3.utils.toBN(name));

    expect(actualTime).to.be.bignumber.eq(expectedTime);
  });

  it('should emit expiration changed', async () => {
    const label = web3.utils.sha3('ilanolkies');
    const tokenId = web3.utils.toBN(label);
    const owner = accounts[3];
    const duration = web3.utils.toBN('1296000'); // 15 days

    await rskOwner.register(label, owner, duration);

    const { logs } = await rskOwner.renew(label, duration);

    const expectedExpiration = await rskOwner.expirationTime(tokenId);

    helpers.expectEvent.inLogs(
      logs,
      'ExpirationChanged',
      {
        tokenId,
        expirationTime: expectedExpiration,
      }
    );
  })
});
