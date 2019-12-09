const RNS = artifacts.require('RNS');
const Token = artifacts.require('ERC677TokenContract');
const TokenRegistrar = artifacts.require('TokenRegistrar');
const RSKOwner = artifacts.require('RSKOwner');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('RSK Owner - renewer role', async (accounts) => {
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

  describe('should manage renovation role', async () => {
    it('should allow only owner to add renewer', async () => {
      await helpers.expectRevert(
        rskOwner.addRenewer(accounts[1], { from: accounts[1] }),
        'Ownable: caller is not the owner'
      );
    });

    it('should allow owner to add renewer', async () => {
      await rskOwner.addRenewer(accounts[2], { from: accounts[0] });

      const isRenewer = await rskOwner.isRenewer(accounts[2]);

      expect(isRenewer).to.be.true;
    });

    it('should allow only owner to remove renewer', async () => {
      await rskOwner.addRenewer(accounts[2], { from: accounts[0] });

      await helpers.expectRevert(
        rskOwner.removeRenewer(accounts[2], { from: accounts[1] }),
        'Ownable: caller is not the owner'
      );

      const isRenewer = await rskOwner.isRenewer(accounts[2]);

      expect(isRenewer).to.be.true;
    });

    it('should allow owner to remove renewer', async () => {
      await rskOwner.addRenewer(accounts[2], { from: accounts[0 ]});
      await rskOwner.removeRenewer(accounts[2], { from: accounts[0] });

      const isRenewer = await rskOwner.isRenewer(accounts[2]);

      expect(isRenewer).to.be.false;
    });
  });

  describe('should manage access to renovation', async () => {
    it('should allow only renewer to execute renovation', async () => {
      await helpers.expectRevert(
        rskOwner.renew(web3.utils.sha3('ilanolkies'), web3.utils.toBN(1), { from: accounts[1] }),
        'Only renewer.'
      );
    });

    it('should allow renewer to execute renovation', async () => {
      const name = web3.utils.sha3('ilanolkies');
      await rskOwner.addRegistrar(accounts[2], { from: accounts[0] });
      await rskOwner.register(name, accounts[2], web3.utils.toBN('100'), { from: accounts[2] });

      await rskOwner.addRenewer(accounts[2], { from: accounts[0] });

      await rskOwner.renew(name, web3.utils.toBN(1), { from: accounts[2] });
    });
  });
});
