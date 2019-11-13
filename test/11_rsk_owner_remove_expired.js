const RNS = artifacts.require('RNS');
const Token = artifacts.require('ERC677TokenContract');
const TokenRegistrar = artifacts.require('TokenRegistrar');
const RSKOwner = artifacts.require('RSKOwner');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('FIFS Registrar - Remove expired', async (accounts) => {
  let rns, token, tokenRegistrar, rskOwner;

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

    await rskOwner.addRegistrar(accounts[0]);
  });

  describe('single name', async () => {
    it('should not fail for non registered names', async () => {
      const name = 'javiesses';
      const label = web3.utils.sha3(name);
      const tokenId = web3.utils.toBN(label);

      await rskOwner.removeExpired([tokenId]);

      const actualOwnerName = await rns.owner(namehash(`${name}.rsk`));
      expect(actualOwnerName).to.eq(helpers.constants.ZERO_ADDRESS);

      await helpers.expectRevert(
        rskOwner.ownerOf(tokenId),
        'ERC721: owner query for nonexistent token'
      );
    });

    it('should not remove non expired name', async () => {
      const name = 'javiesses';
      const label = web3.utils.sha3(name);
      const tokenId = web3.utils.toBN(label);
      const owner = accounts[0];
      const duration = web3.utils.toBN('100');

      await rskOwner.register(label, owner, duration);

      await rskOwner.removeExpired([tokenId]);

      const actualOwnerName = await rns.owner(namehash(`${name}.rsk`));
      expect(actualOwnerName).to.eq(owner);

      const actualOwnerToken = await rskOwner.ownerOf(tokenId);
      expect(actualOwnerToken).to.eq(owner);
    });

    describe('should remove expired name', async () => {
      const name = 'javiesses';
      const label = web3.utils.sha3(name);
      const tokenId = web3.utils.toBN(label);
      const owner = accounts[0];

      beforeEach(async () => {
        const duration = web3.utils.toBN('100');
        await rskOwner.register(label, owner, duration);
        await helpers.time.increase(101);
        await rskOwner.removeExpired([tokenId]);
      });

      it('no erc-721 owner', async () => {
        await helpers.expectRevert(
          rskOwner.ownerOf(tokenId),
          'ERC721: owner query for nonexistent token'
        );
      });

      it('rns owner is 0 address', async () => {
        const actualOwner = await rns.owner(namehash(`${name}.rsk`));
        expect(actualOwner).to.eq(helpers.constants.ZERO_ADDRESS);
      });

      it('balance is updated', async () => {
        expect(
          await rskOwner.balanceOf(accounts[0])
        ).to.be.bignumber.eq(web3.utils.toBN(0));
      });

      it('should be available', async () => {
        expect(
          await rskOwner.available(tokenId)
        ).to.be.true;
      });

      it('should set expiration date to 0', async () => {
        expect(
          await rskOwner.expirationTime(tokenId)
        ).to.be.bignumber.eq(web3.utils.toBN(0));
      });
    });
  });

  describe('only expired names', async () => {
    it('should not fail for non registered names', async () => {
      const name1 = 'javiesses1';
      const name2 = 'javiesses2';
      const label1 = web3.utils.sha3(name1);
      const label2 = web3.utils.sha3(name2);
      const tokenId1 = web3.utils.toBN(label1);
      const tokenId2 = web3.utils.toBN(label2);

      await rskOwner.removeExpired([tokenId1, tokenId2]);

      expect(
        await rns.owner(namehash(`${name1}.rsk`))
      ).to.eq(helpers.constants.ZERO_ADDRESS);

      await helpers.expectRevert(
        rskOwner.ownerOf(tokenId1),
        'ERC721: owner query for nonexistent token'
      );

      expect(
        await rns.owner(namehash(`${name2}.rsk`))
      ).to.eq(helpers.constants.ZERO_ADDRESS);

      await helpers.expectRevert(
        rskOwner.ownerOf(tokenId2),
        'ERC721: owner query for nonexistent token'
      );
    });

    it('should not remove non expired names', async () => {
      const name1 = 'javiesses1';
      const name2 = 'javiesses2';
      const label1 = web3.utils.sha3(name1);
      const label2 = web3.utils.sha3(name2);
      const tokenId1 = web3.utils.toBN(label1);
      const tokenId2 = web3.utils.toBN(label2);
      const owner = accounts[0];
      const duration = web3.utils.toBN('100');

      await rskOwner.register(label1, owner, duration);
      await rskOwner.register(label2, owner, duration);

      await rskOwner.removeExpired([tokenId1, tokenId2]);

      const actualOwnerName1 = await rns.owner(namehash(`${name1}.rsk`));
      expect(actualOwnerName1).to.eq(owner);

      const actualOwnerToken1 = await rskOwner.ownerOf(tokenId1);
      expect(actualOwnerToken1).to.eq(owner);

      const actualOwnerName2 = await rns.owner(namehash(`${name2}.rsk`));
      expect(actualOwnerName2).to.eq(owner);

      const actualOwnerToken2 = await rskOwner.ownerOf(tokenId2);
      expect(actualOwnerToken2).to.eq(owner);
    });

    describe('should remove expired names', async () => {
      const name1 = 'javiesses1';
      const name2 = 'javiesses2';
      const label1 = web3.utils.sha3(name1);
      const label2 = web3.utils.sha3(name2);
      const tokenId1 = web3.utils.toBN(label1);
      const tokenId2 = web3.utils.toBN(label2);
      const owner = accounts[0];

      beforeEach(async () => {
        const duration = web3.utils.toBN('100');
        await rskOwner.register(label1, owner, duration);
        await rskOwner.register(label2, owner, duration);
        await helpers.time.increase(101);
        await rskOwner.removeExpired([tokenId1, tokenId2]);
      });

      it('no erc-721 owner', async () => {
        await helpers.expectRevert(
          rskOwner.ownerOf(tokenId1),
          'ERC721: owner query for nonexistent token'
        );

        await helpers.expectRevert(
          rskOwner.ownerOf(tokenId2),
          'ERC721: owner query for nonexistent token'
        );
      });

      it('rns owner is 0 address', async () => {
        expect(
          await rns.owner(namehash(`${name1}.rsk`))
        ).to.eq(helpers.constants.ZERO_ADDRESS);

        expect(
          await rns.owner(namehash(`${name2}.rsk`))
        ).to.eq(helpers.constants.ZERO_ADDRESS);
      });

      it('balance is updated', async () => {
        expect(
          await rskOwner.balanceOf(accounts[0])
        ).to.be.bignumber.eq(web3.utils.toBN(0));
      });

      it('should be available', async () => {
        expect(
          await rskOwner.available(tokenId1)
        ).to.be.true;

        expect(
          await rskOwner.available(tokenId2)
        ).to.be.true;
      });

      it('should set expiration date to 0', async () => {
        expect(
          await rskOwner.expirationTime(tokenId1)
        ).to.be.bignumber.eq(web3.utils.toBN(0));

        expect(
          await rskOwner.expirationTime(tokenId2)
        ).to.be.bignumber.eq(web3.utils.toBN(0));
      });
    });
  });

  describe('expired and non expired names', async () => {
    it('should not fail for non registered names', async () => {
      const name1 = 'javiesses1';
      const name2 = 'javiesses2';
      const label1 = web3.utils.sha3(name1);
      const label2 = web3.utils.sha3(name2);
      const tokenId1 = web3.utils.toBN(label1);
      const tokenId2 = web3.utils.toBN(label2);

      await rskOwner.register(label1, accounts[3], web3.utils.toBN('100'));

      await rskOwner.removeExpired([tokenId1, tokenId2]);

      expect(
        await rns.owner(namehash(`${name2}.rsk`))
      ).to.eq(helpers.constants.ZERO_ADDRESS);

      await helpers.expectRevert(
        rskOwner.ownerOf(tokenId2),
        'ERC721: owner query for nonexistent token'
      );
    });

    it('should not remove non expired names', async () => {
      const name1 = 'javiesses1';
      const name2 = 'javiesses2';
      const label1 = web3.utils.sha3(name1);
      const label2 = web3.utils.sha3(name2);
      const tokenId1 = web3.utils.toBN(label1);
      const tokenId2 = web3.utils.toBN(label2);
      const owner = accounts[0];
      const duration = web3.utils.toBN('100');

      await rskOwner.register(label1, owner, duration);

      await helpers.time.increase(101);

      await rskOwner.register(label2, owner, duration);

      await rskOwner.removeExpired([tokenId1, tokenId2]);

      const actualOwnerName2 = await rns.owner(namehash(`${name2}.rsk`));
      expect(actualOwnerName2).to.eq(owner);

      const actualOwnerToken2 = await rskOwner.ownerOf(tokenId2);
      expect(actualOwnerToken2).to.eq(owner);
    });

    describe('should remove expired names', async () => {
      const name1 = 'javiesses1';
      const name2 = 'javiesses2';
      const label1 = web3.utils.sha3(name1);
      const label2 = web3.utils.sha3(name2);
      const tokenId1 = web3.utils.toBN(label1);
      const tokenId2 = web3.utils.toBN(label2);
      const owner = accounts[0];

      let expirationTime;

      beforeEach(async () => {
        const duration = web3.utils.toBN('100');
        await rskOwner.register(label1, owner, duration);
        await helpers.time.increase(101);
        await rskOwner.register(label2, owner, duration);

        expirationTime = await rskOwner.expirationTime(tokenId2);

        await rskOwner.removeExpired([tokenId1, tokenId2]);
      });

      it('no erc-721 owner', async () => {
        await helpers.expectRevert(
          rskOwner.ownerOf(tokenId1),
          'ERC721: owner query for nonexistent token'
        );

        expect(
          await rskOwner.ownerOf(tokenId2)
        ).to.eq(owner);
      });

      it('rns owner is 0 address', async () => {
        expect(
          await rns.owner(namehash(`${name1}.rsk`))
        ).to.eq(helpers.constants.ZERO_ADDRESS);

        expect(
          await rns.owner(namehash(`${name2}.rsk`))
        ).to.eq(owner);
      });

      it('balance is updated', async () => {
        expect(
          await rskOwner.balanceOf(accounts[0])
        ).to.be.bignumber.eq(web3.utils.toBN(1));
      });

      it('should be available', async () => {
        expect(
          await rskOwner.available(tokenId1)
        ).to.be.true;

        expect(
          await rskOwner.available(tokenId2)
        ).to.be.false;
      });

      it('should set expiration date to 0', async () => {
        expect(
          await rskOwner.expirationTime(tokenId1)
        ).to.be.bignumber.eq(web3.utils.toBN(0));

        expect(
          await rskOwner.expirationTime(tokenId2)
        ).to.be.bignumber.eq(expirationTime);
      });
    });
  });
});
