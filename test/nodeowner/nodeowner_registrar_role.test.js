const RNS = artifacts.require('RNS');
const NodeOwner = artifacts.require('NodeOwner');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('Node Owner - registrar role', async (accounts) => {
  let rns, nodeOwner;

  beforeEach(async () => {
    const rootNode = namehash('tld');

    rns = await RNS.new();

    nodeOwner = await NodeOwner.new(
      rns.address,
      rootNode,
    );

    await rns.setSubnodeOwner('0x00', web3.utils.sha3('tld'), nodeOwner.address);
  });

  it('should have deployer as owner', async () => {
    const owner = await nodeOwner.owner();

    expect(owner).to.eq(accounts[0]);
  });

  describe('should manage registration role', async () => {
    it('should allow only owner to add registrar', async () => {
      await helpers.expectRevert(
        nodeOwner.addRegistrar(accounts[1], { from: accounts[1] }),
        'Ownable: caller is not the owner'
      );
    });

    it('should allow owner to add registrar', async () => {
      await nodeOwner.addRegistrar(accounts[2], { from: accounts[0] });

      const isRegistrar = await nodeOwner.isRegistrar(accounts[2]);

      expect(isRegistrar).to.be.true;
    });

    it('should allow only owner to remove registrar', async () => {
      await nodeOwner.addRegistrar(accounts[2], { from: accounts[0] });

      await helpers.expectRevert(
        nodeOwner.removeRegistrar(accounts[2], { from: accounts[1] }),
        'Ownable: caller is not the owner'
      );

      const isRegistrar = await nodeOwner.isRegistrar(accounts[2]);

      expect(isRegistrar).to.be.true;
    });

    it('should allow owner to remove registrar', async () => {
      await nodeOwner.addRegistrar(accounts[2], { from: accounts[0 ]});
      await nodeOwner.removeRegistrar(accounts[2], { from: accounts[0] });

      const isRegistrar = await nodeOwner.isRegistrar(accounts[2]);

      expect(isRegistrar).to.be.false;
    });
  });

  describe('should manage access to registration', async () => {
    it('should allow only registrar to execute registration', async () => {
      await helpers.expectRevert(
        nodeOwner.register(web3.utils.sha3('ilanolkies'), accounts[3], web3.utils.toBN(1), { from: accounts[1] }),
        'Only registrar.'
      );
    });

    it('should allow registrar to execute registration', async () => {
      await nodeOwner.addRegistrar(accounts[2], { from: accounts[0] });

      await nodeOwner.register(web3.utils.sha3('ilanolkies'), accounts[3], web3.utils.toBN(1), { from: accounts[2] });
      // testing no revert, no actions taken for register() yet
    });
  });
});
