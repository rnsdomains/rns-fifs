const RNS = artifacts.require('RNS');
const Token = artifacts.require('ERC677');
const TokenRegistrar = artifacts.require('TokenRegistrar');
const RSKOwner = artifacts.require('RSKOwner');
const Deed = artifacts.require('TokenDeed');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('RSK Owner - auction migration', async (accounts) => {
  let rns, token, tokenRegistrar, auctionRegister, createRSKOwner;

  beforeEach(async () => {
    const rootNode = namehash('rsk');

    rns = await RNS.new();
    token = await Token.new(accounts[0], web3.utils.toBN('1000000000000000000000'), 'RIFOS', 'RIF', web3.utils.toBN('18'));
    tokenRegistrar = await TokenRegistrar.new(
      rns.address,
      rootNode,
      token.address
    );

    await rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), tokenRegistrar.address);

    // use this to register a name in token registrar
    // use another bid to lock some tokens in deed
    auctionRegister = async (name, value = '1000000000000000000', owner = accounts[0], anotherBid = false) => {
      const label = web3.utils.sha3(name);
      const amount = web3.utils.toBN(value);
      const from = owner;

      await token.transfer(owner, amount);

      // start auction
      await tokenRegistrar.startAuction(label, { from });

      // bid
      const salt = '0x00';
      const shaBid = await tokenRegistrar.shaBid(label, from, amount, salt, { from });

      await token.approve(tokenRegistrar.address, amount, { from });
      await tokenRegistrar.newBid(shaBid, amount, { from });

      const _amount = web3.utils.toBN('2000000000000000000');
      if (anotherBid) {
        const _owner = accounts[5];
        await token.transfer(_owner, _amount);
        const _shaBid = await tokenRegistrar.shaBid(label, _owner, _amount, salt, { from: _owner });
        await token.approve(tokenRegistrar.address, _amount, { from: _owner });
        await tokenRegistrar.newBid(_shaBid, _amount, { from:_owner });
      }

      await web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [259200], // 3 days
        id: 0,
      }, () => { });

      // unseal
      await tokenRegistrar.unsealBid(label, amount, salt, { from });

      if (anotherBid) {
        await tokenRegistrar.unsealBid(label, _amount, salt, { from: accounts[5] });
      }

      await web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [172800], // 2 days
        id: 0,
      }, () => { });

      // finalize
      await tokenRegistrar.finalizeAuction(label, { from });
    };

    createRSKOwner = async () => {
      const rskOwner = await RSKOwner.new(tokenRegistrar.address, rns.address, rootNode);
      await rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), rskOwner.address);
      return rskOwner;
    };
  });

  it('should return tokens held in deed', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const value = '5000000000000000000';
    const owner = accounts[1];

    await auctionRegister(name, value, owner, true);

    await createRSKOwner();

    const previousBalance = await token.balanceOf(owner);
    const deedAddress = await tokenRegistrar.entries(label).then(entry => entry[1]);

    const deed = await Deed.at(deedAddress);
    const deedAmount = await deed.tokenQuantity();

    await tokenRegistrar.transferRegistrars(label, { from: owner });

    const actualBalance = await token.balanceOf(owner);

    expect(actualBalance).to.be.bignumber.equal(previousBalance.add(deedAmount));
  });

  it('should allow only token registrar to execute acceptRegistrarTransfer', async () => {
    const rskOwner = await createRSKOwner();

    const attacker = accounts[5];
    const amount = web3.utils.toBN('5000000000000000000');
    await token.transfer(attacker, amount);
    const falseDeed = await Deed.new(attacker, amount, token.address, { from: attacker });

    await helpers.expectRevert(
      rskOwner.acceptRegistrarTransfer(web3.utils.sha3('attacker'), falseDeed.address, web3.utils.toBN('100000000000000000'), { from: attacker }),
      "Only previous registrar."
    );
  });

  it('should mint a token for the previous owner', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const tokenId = web3.utils.toBN(label);

    await auctionRegister(name);

    const rskOwner = await createRSKOwner();

    await tokenRegistrar.transferRegistrars(label);

    helpers.expectEvent.inLogs(
      await rskOwner.getPastEvents(),
      'Transfer',
      { from: helpers.constants.ZERO_ADDRESS, to: accounts[0], tokenId }
    );

    const actualOwner = await rskOwner.ownerOf(tokenId);
    expect(actualOwner).to.eq(accounts[0]);
  });

  it('should set paid expiration date', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const tokenId = web3.utils.toBN(label);

    await auctionRegister(name);

    const previousExpiration = await tokenRegistrar.entries(label)
    .then(e => e[1])
    .then(deedAddress => Deed.at(deedAddress))
    .then(tokenDeed => tokenDeed.expirationDate());

    const rskOwner = await createRSKOwner();

    await tokenRegistrar.transferRegistrars(label);

    const actualExpiration = await rskOwner.expirationTime(tokenId);
    expect(actualExpiration).to.be.bignumber.equal(previousExpiration);
  });

  it('should close name\'s deed', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);

    await auctionRegister(name);

    const deedAddress = await tokenRegistrar.entries(label)
    .then(e => e[1])

    await createRSKOwner();

    await tokenRegistrar.transferRegistrars(label);

    const code = await web3.eth.getCode(deedAddress);

    expect(code).to.eq('0x');
  });

  it('should not change ownership in rns registry', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const node = namehash('ilanolkies.rsk');

    await auctionRegister(name);

    await rns.setOwner(node, accounts[5]);

    await createRSKOwner();

    await tokenRegistrar.transferRegistrars(label);

    const owner = await rns.owner(node);

    expect(owner).to.eq(accounts[5]);
  });

  it('should not change resolver in rns registry', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const node = namehash('ilanolkies.rsk');
    const resolver = '0x1111111111222222222233333333334444444444';

    await auctionRegister(name);

    await rns.setResolver(node, resolver);

    await createRSKOwner();

    await tokenRegistrar.transferRegistrars(label);

    const owner = await rns.resolver(node);

    expect(owner).to.eq(resolver);
  });

  describe('should allow to register names when are not owned', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const tokenId = web3.utils.toBN(label);

    it('open', async () => {
      const rskOwner = await createRSKOwner();

      expect(
        await rskOwner.available(tokenId)
      ).to.be.true;
    });

    it('auction', async () => {
      await tokenRegistrar.startAuction(label);

      const rskOwner = await createRSKOwner();

      expect(
        await rskOwner.available(tokenId)
      ).to.be.true;
    });

    it('reveal', async () => {
      await tokenRegistrar.startAuction(label);

      await web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [259200], // 3 days
        id: 0,
      }, () => { });

      const rskOwner = await createRSKOwner();

      expect(
        await rskOwner.available(tokenId)
      ).to.be.true;
    });

    it('owned', async () => {
      await auctionRegister(name, web3.utils.toBN('1000000000000000000'), accounts[1], false);

      const rskOwner = await createRSKOwner();

      expect(
        await rskOwner.available(tokenId)
      ).to.be.false;
    });
  });
});
