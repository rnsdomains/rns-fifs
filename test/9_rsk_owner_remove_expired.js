const RNS = artifacts.require('RNS');
const Token = artifacts.require('ERC677TokenContract');
const TokenRegistrar = artifacts.require('TokenRegistrar');
const RSKOwner = artifacts.require('RSKOwner');
const FIFSRegistrar = artifacts.require('FIFSRegistrar');
const NamePrice = artifacts.require('NamePrice');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('FIFS Registrar - Remove expired', async (accounts) => {
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

      await rskOwner.removeExpired([tokenId]);
      
      const actualOwnerName = await rns.owner(namehash(`${name}.rsk`));
      const actualOwnerToken = await rskOwner.ownerOf(tokenId);
      expect(actualOwnerName).to.eq(owner);
      expect(actualOwnerToken).to.eq(owner);
    });

    it('should receive a non existing token and do not fail', async () => {
      const nonExistingTokenId = 123456;

      await rskOwner.removeExpired([nonExistingTokenId]);
    });

    it('should remove expired name and set no owner in rns directory', async () => {
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
      await rskOwner.removeExpired([tokenId]);
      
      const actualOwner = await rns.owner(namehash(`${name}.rsk`));
      expect(actualOwner).to.eq(helpers.constants.ZERO_ADDRESS);
    });

    it('should remove expired name and burn the tokenId', async () => {
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
      await rskOwner.removeExpired([tokenId]);
      
      await helpers.expectRevert(
        rskOwner.ownerOf(tokenId),
        'ERC721: owner query for nonexistent token'
      );
    });

  });

  describe('more than one expired name', async () => {

    it('should not remove non expired names', async () => {
      const name1 = 'javiesses1';
      const name2 = 'javiesses2';
      const owner = accounts[0];
      const label1 = web3.utils.sha3(name1);
      const label2 = web3.utils.sha3(name2);
      const tokenId1 = web3.utils.toBN(label1);
      const tokenId2 = web3.utils.toBN(label2);
      const duration = web3.utils.toBN('1');
      const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';
      const amount = web3.utils.toBN('4000000000000000000');

      await token.approve(fifsRegistrar.address, amount); // name1
      await token.approve(fifsRegistrar.address, amount); // name2

      const commitment1 = await fifsRegistrar.makeCommitment(web3.utils.sha3(name1), owner, secret);
      const commitment2 = await fifsRegistrar.makeCommitment(web3.utils.sha3(name2), owner, secret);
      await fifsRegistrar.commit(commitment1);
      await fifsRegistrar.commit(commitment2);

      await helpers.time.increase(61);

      await fifsRegistrar.register(name1, owner, secret, duration);
      await fifsRegistrar.register(name2, owner, secret, duration);
      
      await rskOwner.removeExpired([tokenId1, tokenId2]);
      
      const actualOwnerName1 = await rns.owner(namehash(`${name1}.rsk`));
      const actualOwnerToken1 = await rskOwner.ownerOf(tokenId1);
      expect(actualOwnerName1).to.eq(owner);
      expect(actualOwnerToken1).to.eq(owner);

      const actualOwnerName2 = await rns.owner(namehash(`${name2}.rsk`));
      const actualOwnerToken2 = await rskOwner.ownerOf(tokenId2);
      expect(actualOwnerName2).to.eq(owner);
      expect(actualOwnerToken2).to.eq(owner);
    });

    it('should receive non existing tokens and do not fail', async () => {
      await rskOwner.removeExpired([1234, 5678]);
    });

    it('should remove expired names and set no owner in rns directory', async () => {
      const name1 = 'javiesses1';
      const name2 = 'javiesses2';
      const owner = accounts[0];
      const label1 = web3.utils.sha3(name1);
      const label2 = web3.utils.sha3(name2);
      const tokenId1 = web3.utils.toBN(label1);
      const tokenId2 = web3.utils.toBN(label2);
      const duration = web3.utils.toBN('1');
      const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';
      const amount = web3.utils.toBN('4000000000000000000');

      await token.approve(fifsRegistrar.address, amount); // name1
      await token.approve(fifsRegistrar.address, amount); // name2

      const commitment1 = await fifsRegistrar.makeCommitment(web3.utils.sha3(name1), owner, secret);
      const commitment2 = await fifsRegistrar.makeCommitment(web3.utils.sha3(name2), owner, secret);
      await fifsRegistrar.commit(commitment1);
      await fifsRegistrar.commit(commitment2);

      await helpers.time.increase(61);

      await fifsRegistrar.register(name1, owner, secret, duration);
      await fifsRegistrar.register(name2, owner, secret, duration);

      await helpers.time.increase(60 * 60 * 24 * 366 * 1); // seconds * minutes * hours * days * year
      
      await rskOwner.removeExpired([tokenId1, tokenId2]);
      
      const actualOwner1 = await rns.owner(namehash(`${name1}.rsk`));
      expect(actualOwner1).to.eq(helpers.constants.ZERO_ADDRESS);

      const actualOwner2 = await rns.owner(namehash(`${name2}.rsk`));
      expect(actualOwner2).to.eq(helpers.constants.ZERO_ADDRESS);
    });

    it('should remove expired names and burn the tokenId', async () => {
      const name1 = 'javiesses1';
      const name2 = 'javiesses2';
      const owner = accounts[0];
      const label1 = web3.utils.sha3(name1);
      const label2 = web3.utils.sha3(name2);
      const tokenId1 = web3.utils.toBN(label1);
      const tokenId2 = web3.utils.toBN(label2);
      const duration = web3.utils.toBN('1');
      const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';
      const amount = web3.utils.toBN('4000000000000000000');

      await token.approve(fifsRegistrar.address, amount); // name1
      await token.approve(fifsRegistrar.address, amount); // name2

      const commitment1 = await fifsRegistrar.makeCommitment(web3.utils.sha3(name1), owner, secret);
      const commitment2 = await fifsRegistrar.makeCommitment(web3.utils.sha3(name2), owner, secret);
      await fifsRegistrar.commit(commitment1);
      await fifsRegistrar.commit(commitment2);

      await helpers.time.increase(61);

      await fifsRegistrar.register(name1, owner, secret, duration);
      await fifsRegistrar.register(name2, owner, secret, duration);

      await helpers.time.increase(60 * 60 * 24 * 366 * 1); // seconds * minutes * hours * days * year
      await rskOwner.removeExpired([tokenId1, tokenId2]);
      
      await helpers.expectRevert(
        rskOwner.ownerOf(tokenId1),
        'ERC721: owner query for nonexistent token'
      );

      await helpers.expectRevert(
        rskOwner.ownerOf(tokenId2),
        'ERC721: owner query for nonexistent token'
      );
    });

  });

  describe('expired and non expired in the same array', async () => {

    it('should receive non existing tokens and do not fail', async () => {
      await rskOwner.removeExpired([1234, 5678]);
    });

    it('should remove expired name and do not remove non expired names', async () => {
      const expiredName = 'javiesses1';
      const nonExpiredName = 'javiesses2';
      const owner = accounts[0];
      const expiredLabel = web3.utils.sha3(expiredName);
      const nonExpiredLabel = web3.utils.sha3(nonExpiredName);
      const expiredToken = web3.utils.toBN(expiredLabel);
      const nonExpiredToken = web3.utils.toBN(nonExpiredLabel);
      const duration = web3.utils.toBN('1');
      const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';
      const amount = web3.utils.toBN('4000000000000000000');

      await token.approve(fifsRegistrar.address, amount); // name1
      await token.approve(fifsRegistrar.address, amount); // name2

      const commitment1 = await fifsRegistrar.makeCommitment(web3.utils.sha3(expiredName), owner, secret);
      const commitment2 = await fifsRegistrar.makeCommitment(web3.utils.sha3(nonExpiredName), owner, secret);
      await fifsRegistrar.commit(commitment1);
      await fifsRegistrar.commit(commitment2);

      await helpers.time.increase(61);

      await fifsRegistrar.register(expiredName, owner, secret, duration);

      await helpers.time.increase(60 * 60 * 24 * 366 * 1); // seconds * minutes * hours * days * year

      await fifsRegistrar.register(nonExpiredName, owner, secret, duration);

      await rskOwner.removeExpired([expiredToken, nonExpiredToken]);
      
      const actualOwnerExpired = await rns.owner(namehash(`${expiredName}.rsk`));
      expect(actualOwnerExpired).to.eq(helpers.constants.ZERO_ADDRESS);

      const actualOwnerNonExpired = await rns.owner(namehash(`${nonExpiredName}.rsk`));
      expect(actualOwnerNonExpired).to.eq(owner);
    });

    it('should remove expired token and do not remove non expired token', async () => {
      const expiredName = 'javiesses1';
      const nonExpiredName = 'javiesses2';
      const owner = accounts[0];
      const expiredLabel = web3.utils.sha3(expiredName);
      const nonExpiredLabel = web3.utils.sha3(nonExpiredName);
      const expiredToken = web3.utils.toBN(expiredLabel);
      const nonExpiredToken = web3.utils.toBN(nonExpiredLabel);
      const duration = web3.utils.toBN('1');
      const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';
      const amount = web3.utils.toBN('4000000000000000000');

      await token.approve(fifsRegistrar.address, amount); // name1
      await token.approve(fifsRegistrar.address, amount); // name2

      const commitment1 = await fifsRegistrar.makeCommitment(web3.utils.sha3(expiredName), owner, secret);
      const commitment2 = await fifsRegistrar.makeCommitment(web3.utils.sha3(nonExpiredName), owner, secret);
      await fifsRegistrar.commit(commitment1);
      await fifsRegistrar.commit(commitment2);

      await helpers.time.increase(61);

      await fifsRegistrar.register(expiredName, owner, secret, duration);

      await helpers.time.increase(60 * 60 * 24 * 366 * 1); // seconds * minutes * hours * days * year

      await fifsRegistrar.register(nonExpiredName, owner, secret, duration);

      await rskOwner.removeExpired([expiredToken, nonExpiredToken]);
      
      await helpers.expectRevert(
        rskOwner.ownerOf(expiredToken),
        'ERC721: owner query for nonexistent token'
      );

      const actualOwnerNonExpired = await rskOwner.ownerOf(nonExpiredToken);
      expect(actualOwnerNonExpired).to.eq(owner);
    });


    it('should include a nonExistingToken and do not fail', async () => {
      const expiredName = 'javiesses1';
      const nonExpiredName = 'javiesses2';
      const owner = accounts[0];
      const expiredLabel = web3.utils.sha3(expiredName);
      const nonExpiredLabel = web3.utils.sha3(nonExpiredName);
      const expiredToken = web3.utils.toBN(expiredLabel);
      const nonExpiredToken = web3.utils.toBN(nonExpiredLabel);
      const nonExistingToken = 12345;
      const duration = web3.utils.toBN('1');
      const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';
      const amount = web3.utils.toBN('4000000000000000000');

      await token.approve(fifsRegistrar.address, amount); // name1
      await token.approve(fifsRegistrar.address, amount); // name2

      const commitment1 = await fifsRegistrar.makeCommitment(web3.utils.sha3(expiredName), owner, secret);
      const commitment2 = await fifsRegistrar.makeCommitment(web3.utils.sha3(nonExpiredName), owner, secret);
      await fifsRegistrar.commit(commitment1);
      await fifsRegistrar.commit(commitment2);

      await helpers.time.increase(61);

      await fifsRegistrar.register(expiredName, owner, secret, duration);

      await helpers.time.increase(60 * 60 * 24 * 366 * 1); // seconds * minutes * hours * days * year

      await fifsRegistrar.register(nonExpiredName, owner, secret, duration);

      await rskOwner.removeExpired([expiredToken, nonExpiredToken, nonExistingToken]);
      
      await helpers.expectRevert(
        rskOwner.ownerOf(expiredToken),
        'ERC721: owner query for nonexistent token'
      );

      const actualOwnerNonExpired = await rskOwner.ownerOf(nonExpiredToken);
      expect(actualOwnerNonExpired).to.eq(owner);
    });

  });
});
