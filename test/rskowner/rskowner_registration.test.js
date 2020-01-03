const RNS = artifacts.require('RNS');
const Token = artifacts.require('ERC677');
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
    token = await Token.new(accounts[0], web3.utils.toBN('1000000000000000000000'), 'RIFOS', 'RIF', web3.utils.toBN('18'));
    tokenRegistrar = await TokenRegistrar.new(rns.address, rootNode, token.address);
    await rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), tokenRegistrar.address);

    rskOwner = await RSKOwner.new(
      tokenRegistrar.address,
      rns.address,
      rootNode,
    );
    await rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), rskOwner.address);
    await rskOwner.addRegistrar(accounts[2], { from: accounts[0] });
  });

  it('should allow to register a name for a given period and a given owner', async () => {
    const label = web3.utils.sha3('ilanolkies');
    const owner = accounts[3];
    const duration = web3.utils.toBN('1296000'); // 15 days

    const { logs } = await rskOwner.register(label, owner, duration, { from: accounts[2] });

    const now = await web3.eth.getBlock('latest').then(b => b.timestamp);
    const expectedExpiration = web3.utils.toBN(now).add(duration);

    const actualOwner = await rskOwner.ownerOf(label);
    const expirationTime = await rskOwner.expirationTime(label);

    expect(actualOwner).to.eq(owner);
    expect(expirationTime).to.be.bignumber.eq(expectedExpiration);

    const tokenId = web3.utils.toBN(label);

    helpers.expectEvent.inLogs(
      logs,
      'Transfer',
      {
        from: helpers.constants.ZERO_ADDRESS,
        to: owner,
        tokenId,
      }
    );
    helpers.expectEvent.inLogs(
      logs,
      'ExpirationChanged',
      {
        tokenId,
        expirationTime: expectedExpiration,
      }
    );
  });

  it('should not allow to register an owned name', async () => {
    const label = web3.utils.sha3('ilanolkies');
    const owner = accounts[3];
    const duration = web3.utils.toBN('1296000'); // 15 days

    await rskOwner.register(label, owner, duration, { from: accounts[2] });

    const now = await web3.eth.getBlock('latest').then(b => b.timestamp);
    const expectedExpiration = web3.utils.toBN(now).add(duration);

    await helpers.expectRevert(
      rskOwner.register(web3.utils.sha3('ilanolkies'), accounts[3], duration, { from: accounts[2] }),
      'Not available',
    );

    const actualOwner = await rskOwner.ownerOf(label);
    const expirationTime = await rskOwner.expirationTime(label);

    expect(actualOwner).to.eq(owner);
    expect(expirationTime).to.be.bignumber.eq(expectedExpiration);
  });

  it('should allow to register an expired name', async () => {
    const label = web3.utils.sha3('ilanolkies');

    await rskOwner.register(label, accounts[3], web3.utils.toBN('1296000'), { from: accounts[2] });

    await web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [1296001], // 15 days + 1 sec
      id: 0,
    }, () => { });

    const owner = accounts[4];
    const duration = web3.utils.toBN('1296000'); // 15 days

    const { logs } = await rskOwner.register(label, owner, duration, { from: accounts[2] });

    const now = await web3.eth.getBlock('latest').then(b => b.timestamp);
    const expectedExpiration = web3.utils.toBN(now).add(duration);

    const actualOwner = await rskOwner.ownerOf(label);
    const expirationTime = await rskOwner.expirationTime(label);

    expect(actualOwner).to.eq(owner);
    expect(expirationTime).to.be.bignumber.eq(expectedExpiration);

    const tokenId = web3.utils.toBN(label);

    helpers.expectEvent.inLogs(
      logs,
      'Transfer',
      {
        from: accounts[3],
        to: helpers.constants.ZERO_ADDRESS,
        tokenId,
      }
    );
    helpers.expectEvent.inLogs(
      logs,
      'Transfer',
      {
        from: helpers.constants.ZERO_ADDRESS,
        to: owner,
        tokenId,
      }
    );
    helpers.expectEvent.inLogs(
      logs,
      'ExpirationChanged',
      {
        tokenId,
        expirationTime: expectedExpiration,
      }
    );
  });

  it('should throw for owner queries about expired names', async () => {
    const label = web3.utils.sha3('ilanolkies');
    const owner = accounts[3];
    const duration = web3.utils.toBN('1296000'); // 15 days

    await rskOwner.register(label, owner, duration, { from: accounts[2] });

    await web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [1296001], // 15 days + 1 sec
      id: 0,
    }, () => { });

    await web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_mine',
      params: [],
      id: 1
    }, () => {});

    await helpers.expectRevert(
      rskOwner.ownerOf(label),
      'ERC721: owner query for nonexistent token',
    );
  });

  it('should prevent overflow for registration time', async () => {
    const label = web3.utils.sha3('ilanolkies');
    const owner = accounts[3];
    const duration = web3.utils.toBN('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'); // 15 days

    await helpers.expectRevert(
      rskOwner.register(label, owner, duration, { from: accounts[2] }),
      'SafeMath: addition overflow',
    );
  });

  it('should expose availability', async () => {
    const label = web3.utils.sha3('ilanolkies');
    const tokenId = web3.utils.toBN(label);

    expect(await rskOwner.available(tokenId)).to.be.true;

    const owner = accounts[3];
    const duration = web3.utils.toBN('1296000'); // 15 days

    await rskOwner.register(label, owner, duration, { from: accounts[2] });

    expect(await rskOwner.available(tokenId)).to.be.false;

    await web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [1296001], // 15 days + 1 sec
      id: 0,
    }, () => { });

    await web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_mine',
      params: [],
      id: 1
    }, () => {});

    expect(await rskOwner.available(tokenId)).to.be.true;
  });

  it('should register in rns tree', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const owner = accounts[3];
    const duration = web3.utils.toBN('1296000'); // 15 days

    const { tx } = await rskOwner.register(label, owner, duration, { from: accounts[2] });

    const rnsOwner = await rns.owner(namehash(`${name}.rsk`));

    expect(rnsOwner).to.eq(owner);

    helpers.expectEvent.inTransaction(
      tx,
      rns,
      'NewOwner',
      {
        node: namehash('rsk'),
        label,
        ownerAddress: owner,
      }
    );
  })
});
