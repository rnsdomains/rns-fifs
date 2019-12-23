const RNS = artifacts.require('RNS');
const NodeOwner = artifacts.require('NodeOwner');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('Node Owner - renewer role', async (accounts) => {
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

  describe('should manage renovation role', async () => {
    it('should allow only owner to add renewer', async () => {
      await helpers.expectRevert(
        nodeOwner.addRenewer(accounts[1], { from: accounts[1] }),
        'Ownable: caller is not the owner'
      );
    });

    it('should allow owner to add renewer', async () => {
      await nodeOwner.addRenewer(accounts[2], { from: accounts[0] });

      const isRenewer = await nodeOwner.isRenewer(accounts[2]);

      expect(isRenewer).to.be.true;
    });

    it('should allow only owner to remove renewer', async () => {
      await nodeOwner.addRenewer(accounts[2], { from: accounts[0] });

      await helpers.expectRevert(
        nodeOwner.removeRenewer(accounts[2], { from: accounts[1] }),
        'Ownable: caller is not the owner'
      );

      const isRenewer = await nodeOwner.isRenewer(accounts[2]);

      expect(isRenewer).to.be.true;
    });

    it('should allow owner to remove renewer', async () => {
      await nodeOwner.addRenewer(accounts[2], { from: accounts[0 ]});
      await nodeOwner.removeRenewer(accounts[2], { from: accounts[0] });

      const isRenewer = await nodeOwner.isRenewer(accounts[2]);

      expect(isRenewer).to.be.false;
    });
  });

  describe('should manage access to renovation', async () => {
    it('should allow only renewer to execute renovation', async () => {
      await helpers.expectRevert(
        nodeOwner.renew(web3.utils.sha3('ilanolkies'), web3.utils.toBN(1), { from: accounts[1] }),
        'Only renewer.'
      );
    });

    it('should allow renewer to execute renovation', async () => {
      const name = web3.utils.sha3('ilanolkies');
      await nodeOwner.addRegistrar(accounts[2], { from: accounts[0] });
      await nodeOwner.register(name, accounts[2], web3.utils.toBN('100'), { from: accounts[2] });

      await nodeOwner.addRenewer(accounts[2], { from: accounts[0] });

      await nodeOwner.renew(name, web3.utils.toBN(1), { from: accounts[2] });
    });
  });
});
