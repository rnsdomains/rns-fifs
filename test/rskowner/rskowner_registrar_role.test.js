const RNS = artifacts.require('RNS');
const Token = artifacts.require('ERC677TokenContract');
const TokenRegistrar = artifacts.require('TokenRegistrar');
const RSKOwner = artifacts.require('RSKOwner');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('RSK Owner - registrar role', async (accounts) => {
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

  it('should have deployer as owner', async () => {
    const owner = await rskOwner.owner();

    expect(owner).to.eq(accounts[0]);
  });

  describe('should manage registration role', async () => {
    it('should allow only owner to add registrar', async () => {
      await helpers.expectRevert(
        rskOwner.addRegistrar(accounts[1], { from: accounts[1] }),
        'Ownable: caller is not the owner'
      );
    });

    it('should allow owner to add registrar', async () => {
      await rskOwner.addRegistrar(accounts[2], { from: accounts[0] });

      const isRegistrar = await rskOwner.isRegistrar(accounts[2]);

      expect(isRegistrar).to.be.true;
    });

    it('should allow only owner to remove registrar', async () => {
      await rskOwner.addRegistrar(accounts[2], { from: accounts[0] });

      await helpers.expectRevert(
        rskOwner.removeRegistrar(accounts[2], { from: accounts[1] }),
        'Ownable: caller is not the owner'
      );

      const isRegistrar = await rskOwner.isRegistrar(accounts[2]);

      expect(isRegistrar).to.be.true;
    });

    it('should allow owner to remove registrar', async () => {
      await rskOwner.addRegistrar(accounts[2], { from: accounts[0 ]});
      await rskOwner.removeRegistrar(accounts[2], { from: accounts[0] });

      const isRegistrar = await rskOwner.isRegistrar(accounts[2]);

      expect(isRegistrar).to.be.false;
    });
  });

  describe('should manage access to registration', async () => {
    it('should allow only registrar to execute registration', async () => {
      await helpers.expectRevert(
        rskOwner.register(web3.utils.sha3('ilanolkies'), accounts[3], web3.utils.toBN(1), { from: accounts[1] }),
        'Only registrar.'
      );
    });

    it('should allow registrar to execute registration', async () => {
      await rskOwner.addRegistrar(accounts[2], { from: accounts[0] });

      await rskOwner.register(web3.utils.sha3('ilanolkies'), accounts[3], web3.utils.toBN(1), { from: accounts[2] });
      // testing no revert, no actions taken for register() yet
    });
  });
});
