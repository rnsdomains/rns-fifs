const RNS = artifacts.require('RNS');
const Token = artifacts.require('ERC677');
const NodeOwner = artifacts.require('NodeOwner');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('Node Owner - renovation', async (accounts) => {
  let rns, nodeOwner;

  beforeEach(async () => {
    const rootNode = namehash('tld');

    rns = await RNS.new();
    token = await Token.new(accounts[0], web3.utils.toBN('1000000000000000000000'), 'RIFOS', 'RIF', web3.utils.toBN('18'));

    nodeOwner = await NodeOwner.new(
      rns.address,
      rootNode,
    );

    await rns.setSubnodeOwner('0x00', web3.utils.sha3('tld'), nodeOwner.address);
    await nodeOwner.addRegistrar(accounts[0], { from: accounts[0] });
    await nodeOwner.addRenewer(accounts[0], { from: accounts[0] });
  });

  it('should not allow to renew an not owned name', async () => {
    await helpers.expectRevert(
      nodeOwner.renew(web3.utils.sha3('ilanolkies'), web3.utils.toBN('99999999999')),
      'Name already expired'
    );
  });

  it('should not allow to renew expired names', async () => {
    const name = web3.utils.sha3('ilanolkies');

    await nodeOwner.register(name, accounts[1], web3.utils.toBN('100'));

    await helpers.time.increase(101);

    await helpers.expectRevert(
      nodeOwner.renew(web3.utils.sha3('ilanolkies'), web3.utils.toBN('99999999999')),
      'Name already expired'
    );
  });

  it('should not allow to overflow renovation time', async () => {    const name = web3.utils.sha3('ilanolkies');
    await nodeOwner.register(name, accounts[1], web3.utils.toBN('100'));

    await helpers.expectRevert(
      nodeOwner.renew(web3.utils.sha3('ilanolkies'), helpers.constants.MAX_UINT256),
      'SafeMath: addition overflow.'
    );
  });

  it('should allow to renew any owned name', async () => {
    const name = web3.utils.sha3('ilanolkies');
    const additionalTime = web3.utils.toBN('100');

    await nodeOwner.register(name, accounts[0], web3.utils.toBN('100'));

    const expectedTime = await nodeOwner.expirationTime(web3.utils.toBN(name)).then(t => t.add(additionalTime));

    await nodeOwner.renew(web3.utils.sha3('ilanolkies'), additionalTime);

    const actualTime = await nodeOwner.expirationTime(web3.utils.toBN(name));

    expect(actualTime).to.be.bignumber.eq(expectedTime);
  });

  it('should emit expiration changed', async () => {
    const label = web3.utils.sha3('ilanolkies');
    const tokenId = web3.utils.toBN(label);
    const owner = accounts[3];
    const duration = web3.utils.toBN('1296000'); // 15 days

    await nodeOwner.register(label, owner, duration);

    const { logs } = await nodeOwner.renew(label, duration);

    const expectedExpiration = await nodeOwner.expirationTime(tokenId);

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
