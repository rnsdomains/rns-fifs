const RNS = artifacts.require('RNS');
const Token = artifacts.require('ERC677TokenContract');
const TokenRegistrar = artifacts.require('TokenRegistrar');
const RSKOwner = artifacts.require('RSKOwner');
const FIFSRegistrar = artifacts.require('FIFSRegistrar');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('FIFS Registrar', async (accounts) => {
  let rns, token, tokenRegistrar, rskOwner, fifsRegistrar;

  beforeEach(async () => {
    const rootNode = namehash('rsk');

    rns = await RNS.new();
    token = await Token.new(accounts[0], web3.utils.toBN('1000000000000000000000'));
    tokenRegistrar = await TokenRegistrar.new(rns.address, rootNode, token.address);
    await rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), tokenRegistrar.address);

    const migrationPeriod = web3.utils.toBN('1296000'); // 15 days
    rskOwner = await RSKOwner.new(
      tokenRegistrar.address,
      migrationPeriod,
      rns.address,
      rootNode,
    );
    await rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), rskOwner.address);

    await web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [1296001], // 15 days + 1 sec
      id: 0,
    }, () => { });

    fifsRegistrar = await FIFSRegistrar.new();
    await rskOwner.addRegistrar(fifsRegistrar.address, { from: accounts[0] });
  });

  describe('committing', async () => {
    const label = web3.utils.sha3('ilanolkies');
    const owner = accounts[4];

    it('should create a commitment for a given name, owner and secret', async () => {
      const commitment = await fifsRegistrar.makeCommitment(
        label,
        owner,
        '0x0000000000000000000000000000000000000000000000000000000000001234',
      );

      expect(commitment).to.not.be.null;
    });

    it('should create different commitments for different secrets', async () => {
      const commitment1 = await fifsRegistrar.makeCommitment(
        label,
        owner,
        '0x0000000000000000000000000000000000000000000000000000000000001234',
      );
      const commitment2 = await fifsRegistrar.makeCommitment(
        label,
        owner,
        '0x0000000000000000000000000000000000000000000000000000000000005678',
      );
      expect(commitment1).to.not.equal(commitment2);
    });
  });

  describe('commitment age', async () => {
    let commitment;

    beforeEach(async () => {
      commitment = await fifsRegistrar.makeCommitment(
        web3.utils.sha3('ilanolkies'),
        accounts[4],
        '0x0000000000000000000000000000000000000000000000000000000000001234',
      );

      await fifsRegistrar.commit(commitment);
    });

    it('should not be able to reveal after committing', async () => {
      const canReveal = await fifsRegistrar.canReveal(commitment);

      expect(canReveal).to.be.false;
    });

    it('should be able to reveal after one minute', async () => {
      await web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [61], // 1 minute + 1 sec
        id: 0,
      }, () => { });

      await web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        params: [],
        id: 1
      }, () => {});

      const canReveal = await fifsRegistrar.canReveal(commitment);

      expect(canReveal).to.be.true;
    });
  });
});
