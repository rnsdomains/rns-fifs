const RNS = artifacts.require('RNS');
const Token = artifacts.require('ERC677TokenContract');
const TokenRegistrar = artifacts.require('TokenRegistrar');
const RSKOwner = artifacts.require('RSKOwner');
const FIFSRegistrar = artifacts.require('FIFSRegistrar');
const NamePrice = artifacts.require('NamePrice');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('FIFS Registrar - overrided ownerOf', async (accounts) => {
  let rns, token, tokenRegistrar, rskOwner, fifsRegistrar, namePrice;
  const pool = accounts[6];

  beforeEach(async () => {
    const rootNode = namehash('rsk');

    rns = await RNS.new();
    token = await Token.new(accounts[0], web3.utils.toBN('1000000000000000000000'));
    tokenRegistrar = await TokenRegistrar.new(rns.address, rootNode, token.address);

    const migrationPeriod = web3.utils.toBN('1296000'); // 15 days
    rskOwner = await RSKOwner.new(
      tokenRegistrar.address,
      migrationPeriod,
      rns.address,
      rootNode,
    );
    await rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), rskOwner.address);

    await helpers.time.increase(1296001);
    namePrice = await NamePrice.new();
    fifsRegistrar = await FIFSRegistrar.new(token.address, rskOwner.address, pool, namePrice.address);
    await rskOwner.addRegistrar(fifsRegistrar.address, { from: accounts[0] });
  });

  describe('single name', async () => {

    it('should not remove non expired name', async () => {
      const name = 'javiesses';
      const owner = accounts[0];
      const label = web3.utils.sha3(name);
      const tokenId = web3.utils.toBN(label);
      const duration = web3.utils.toBN('1');
      const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';
      const amount = web3.utils.toBN('2000000000000000000');

      await token.approve(fifsRegistrar.address, amount);

      const commitment = await fifsRegistrar.makeCommitment(web3.utils.sha3(name), owner, secret);
      await fifsRegistrar.commit(commitment);

      await helpers.time.increase(61);

      await fifsRegistrar.register(name, owner, secret, duration);

      const actualOwner = await rskOwner.ownerOf(tokenId);
      expect(actualOwner).to.eq(owner);
    });

    it('should receive a non existing token and throw the ERC721 exception', async () => {
      const nonExistingTokenId = 123456;

      await helpers.expectRevert(
        rskOwner.ownerOf(nonExistingTokenId),
        'ERC721: owner query for nonexistent token'
      );
    });

    it('should receive an expired tokenId and throw a custom exception', async () => {
      const name = 'javiesses';
      const owner = accounts[0];
      const label = web3.utils.sha3(name);
      const tokenId = web3.utils.toBN(label);
      const duration = web3.utils.toBN('1');
      const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';
      const amount = web3.utils.toBN('2000000000000000000');

      await token.approve(fifsRegistrar.address, amount);

      const commitment = await fifsRegistrar.makeCommitment(web3.utils.sha3(name), owner, secret);
      await fifsRegistrar.commit(commitment);

      await helpers.time.increase(61);

      await fifsRegistrar.register(name, owner, secret, duration);

      await helpers.time.increase(60 * 60 * 24 * 366 * 1); // seconds * minutes * hours * days * year

      await helpers.expectRevert(
        rskOwner.ownerOf(tokenId),
        'Owner query for expired name'
      );
    });
  });
});
