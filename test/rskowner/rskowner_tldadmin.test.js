const RNS = artifacts.require('RNS');
const Token = artifacts.require('ERC677TokenContract');
const TokenRegistrar = artifacts.require('TokenRegistrar');
const RSKOwner = artifacts.require('RSKOwner');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('RSK Owner - top level domain admin', async (accounts) => {
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
  });

  describe('should manage resolver', async () => {
    it('should not allow not owner to change root resolver', async () => {
      await helpers.expectRevert(
        rskOwner.setRootResolver(accounts[1], { from: accounts[1] }),
        'Ownable: caller is not the owner'
      );
    });

    it('should allow owner to change root resolver', async () => {
      const resolver = accounts[8];

      await rskOwner.setRootResolver(resolver, { from: accounts[0] });

      const actualResolver = await rns.resolver(namehash('rsk'));

      expect(actualResolver).to.eq(resolver);
    });
  });

  describe('should manage ttl', async () => {
    it('should not allow not owner to change root ttl', async () => {
      await helpers.expectRevert(
        rskOwner.setRootTTL(helpers.constants.MAX_UINT256, { from: accounts[1] }),
        'Ownable: caller is not the owner'
      );
    });

    it('should allow owner to change root ttl', async () => {
      const ttl = web3.utils.toBN('1000');

      await rskOwner.setRootTTL(ttl, { from: accounts[0] });

      const actualTTL = await rns.ttl(namehash('rsk'));

      expect(actualTTL).to.be.bignumber.eq(ttl);
    });
  });
});
