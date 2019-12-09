const RNS = artifacts.require('RNS');
const NodeOwner = artifacts.require('NodeOwner');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('Node Owner - top level domain admin', async (accounts) => {
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

  describe('should manage resolver', async () => {
    it('should not allow not owner to change root resolver', async () => {
      await helpers.expectRevert(
        nodeOwner.setRootResolver(accounts[1], { from: accounts[1] }),
        'Ownable: caller is not the owner'
      );
    });

    it('should allow owner to change root resolver', async () => {
      const resolver = accounts[8];

      await nodeOwner.setRootResolver(resolver, { from: accounts[0] });

      const actualResolver = await rns.resolver(namehash('tld'));

      expect(actualResolver).to.eq(resolver);
    });
  });

  describe('should manage ttl', async () => {
    it('should not allow not owner to change root ttl', async () => {
      await helpers.expectRevert(
        nodeOwner.setRootTTL(helpers.constants.MAX_UINT256, { from: accounts[1] }),
        'Ownable: caller is not the owner'
      );
    });

    it('should allow owner to change root ttl', async () => {
      const ttl = web3.utils.toBN('1000');

      await nodeOwner.setRootTTL(ttl, { from: accounts[0] });

      const actualTTL = await rns.ttl(namehash('tld'));

      expect(actualTTL).to.be.bignumber.eq(ttl);
    });
  });
});
