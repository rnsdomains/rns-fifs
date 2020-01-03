const RNS = artifacts.require('RNS');
const NodeOwner = artifacts.require('NodeOwner');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('Node Owner - remove expired', async (accounts) => {
  let rns, nodeOwner;

  beforeEach(async () => {
    const rootNode = namehash('tld');

    rns = await RNS.new();

    nodeOwner = await NodeOwner.new(
      rns.address,
      rootNode,
    );

    await rns.setSubnodeOwner('0x00', web3.utils.sha3('tld'), nodeOwner.address);

    await nodeOwner.addRegistrar(accounts[0]);
  });

  describe('single name', async () => {
    it('should not fail for non registered names', async () => {
      const name = 'javiesses';
      const label = web3.utils.sha3(name);
      const tokenId = web3.utils.toBN(label);

      await nodeOwner.removeExpired([tokenId]);

      const actualOwnerName = await rns.owner(namehash(`${name}.tld`));
      expect(actualOwnerName).to.eq(helpers.constants.ZERO_ADDRESS);

      await helpers.expectRevert(
        nodeOwner.ownerOf(tokenId),
        'ERC721: owner query for nonexistent token'
      );
    });

    it('should not remove non expired name', async () => {
      const name = 'javiesses';
      const label = web3.utils.sha3(name);
      const tokenId = web3.utils.toBN(label);
      const owner = accounts[0];
      const duration = web3.utils.toBN('100');

      await nodeOwner.register(label, owner, duration);

      await nodeOwner.removeExpired([tokenId]);

      const actualOwnerName = await rns.owner(namehash(`${name}.tld`));
      expect(actualOwnerName).to.eq(owner);

      const actualOwnerToken = await nodeOwner.ownerOf(tokenId);
      expect(actualOwnerToken).to.eq(owner);
    });

    describe('should remove expired name', async () => {
      const name = 'javiesses';
      const label = web3.utils.sha3(name);
      const tokenId = web3.utils.toBN(label);
      const owner = accounts[0];

      beforeEach(async () => {
        const duration = web3.utils.toBN('100');
        await nodeOwner.register(label, owner, duration);
        await helpers.time.increase(101);
        await nodeOwner.removeExpired([tokenId]);
      });

      it('no erc-721 owner', async () => {
        await helpers.expectRevert(
          nodeOwner.ownerOf(tokenId),
          'ERC721: owner query for nonexistent token'
        );
      });

      it('rns owner is 0 address', async () => {
        const actualOwner = await rns.owner(namehash(`${name}.tld`));
        expect(actualOwner).to.eq(helpers.constants.ZERO_ADDRESS);
      });

      it('balance is updated', async () => {
        expect(
          await nodeOwner.balanceOf(accounts[0])
        ).to.be.bignumber.eq(web3.utils.toBN(0));
      });

      it('should be available', async () => {
        expect(
          await nodeOwner.available(tokenId)
        ).to.be.true;
      });

      it('should set expiration date to 0', async () => {
        expect(
          await nodeOwner.expirationTime(tokenId)
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

      await nodeOwner.removeExpired([tokenId1, tokenId2]);

      expect(
        await rns.owner(namehash(`${name1}.tld`))
      ).to.eq(helpers.constants.ZERO_ADDRESS);

      await helpers.expectRevert(
        nodeOwner.ownerOf(tokenId1),
        'ERC721: owner query for nonexistent token'
      );

      expect(
        await rns.owner(namehash(`${name2}.tld`))
      ).to.eq(helpers.constants.ZERO_ADDRESS);

      await helpers.expectRevert(
        nodeOwner.ownerOf(tokenId2),
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

      await nodeOwner.register(label1, owner, duration);
      await nodeOwner.register(label2, owner, duration);

      await nodeOwner.removeExpired([tokenId1, tokenId2]);

      const actualOwnerName1 = await rns.owner(namehash(`${name1}.tld`));
      expect(actualOwnerName1).to.eq(owner);

      const actualOwnerToken1 = await nodeOwner.ownerOf(tokenId1);
      expect(actualOwnerToken1).to.eq(owner);

      const actualOwnerName2 = await rns.owner(namehash(`${name2}.tld`));
      expect(actualOwnerName2).to.eq(owner);

      const actualOwnerToken2 = await nodeOwner.ownerOf(tokenId2);
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
        await nodeOwner.register(label1, owner, duration);
        await nodeOwner.register(label2, owner, duration);
        await helpers.time.increase(101);
        await nodeOwner.removeExpired([tokenId1, tokenId2]);
      });

      it('no erc-721 owner', async () => {
        await helpers.expectRevert(
          nodeOwner.ownerOf(tokenId1),
          'ERC721: owner query for nonexistent token'
        );

        await helpers.expectRevert(
          nodeOwner.ownerOf(tokenId2),
          'ERC721: owner query for nonexistent token'
        );
      });

      it('rns owner is 0 address', async () => {
        expect(
          await rns.owner(namehash(`${name1}.tld`))
        ).to.eq(helpers.constants.ZERO_ADDRESS);

        expect(
          await rns.owner(namehash(`${name2}.tld`))
        ).to.eq(helpers.constants.ZERO_ADDRESS);
      });

      it('balance is updated', async () => {
        expect(
          await nodeOwner.balanceOf(accounts[0])
        ).to.be.bignumber.eq(web3.utils.toBN(0));
      });

      it('should be available', async () => {
        expect(
          await nodeOwner.available(tokenId1)
        ).to.be.true;

        expect(
          await nodeOwner.available(tokenId2)
        ).to.be.true;
      });

      it('should set expiration date to 0', async () => {
        expect(
          await nodeOwner.expirationTime(tokenId1)
        ).to.be.bignumber.eq(web3.utils.toBN(0));

        expect(
          await nodeOwner.expirationTime(tokenId2)
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

      await nodeOwner.register(label1, accounts[3], web3.utils.toBN('100'));

      await nodeOwner.removeExpired([tokenId1, tokenId2]);

      expect(
        await rns.owner(namehash(`${name2}.tld`))
      ).to.eq(helpers.constants.ZERO_ADDRESS);

      await helpers.expectRevert(
        nodeOwner.ownerOf(tokenId2),
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

      await nodeOwner.register(label1, owner, duration);

      await helpers.time.increase(101);

      await nodeOwner.register(label2, owner, duration);

      await nodeOwner.removeExpired([tokenId1, tokenId2]);

      const actualOwnerName2 = await rns.owner(namehash(`${name2}.tld`));
      expect(actualOwnerName2).to.eq(owner);

      const actualOwnerToken2 = await nodeOwner.ownerOf(tokenId2);
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
        await nodeOwner.register(label1, owner, duration);
        await helpers.time.increase(101);
        await nodeOwner.register(label2, owner, duration);

        expirationTime = await nodeOwner.expirationTime(tokenId2);

        await nodeOwner.removeExpired([tokenId1, tokenId2]);
      });

      it('no erc-721 owner', async () => {
        await helpers.expectRevert(
          nodeOwner.ownerOf(tokenId1),
          'ERC721: owner query for nonexistent token'
        );

        expect(
          await nodeOwner.ownerOf(tokenId2)
        ).to.eq(owner);
      });

      it('rns owner is 0 address', async () => {
        expect(
          await rns.owner(namehash(`${name1}.tld`))
        ).to.eq(helpers.constants.ZERO_ADDRESS);

        expect(
          await rns.owner(namehash(`${name2}.tld`))
        ).to.eq(owner);
      });

      it('balance is updated', async () => {
        expect(
          await nodeOwner.balanceOf(accounts[0])
        ).to.be.bignumber.eq(web3.utils.toBN(1));
      });

      it('should be available', async () => {
        expect(
          await nodeOwner.available(tokenId1)
        ).to.be.true;

        expect(
          await nodeOwner.available(tokenId2)
        ).to.be.false;
      });

      it('should set expiration date to 0', async () => {
        expect(
          await nodeOwner.expirationTime(tokenId1)
        ).to.be.bignumber.eq(web3.utils.toBN(0));

        expect(
          await nodeOwner.expirationTime(tokenId2)
        ).to.be.bignumber.eq(expirationTime);
      });
    });
  });
});
