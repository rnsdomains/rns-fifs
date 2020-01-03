const RNS = artifacts.require('RNS');
const Token = artifacts.require('ERC677');
const TokenRegistrar = artifacts.require('TokenRegistrar');
const RSKOwner = artifacts.require('RSKOwner');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('RSK Owner - reclaim', async (accounts) => {
  let rns, token, tokenRegistrar, rskOwner;

  beforeEach(async () => {
    const rootNode = namehash('rsk');

    rns = await RNS.new();
    token = await Token.new(accounts[0], web3.utils.toBN('1000000000000000000000'), 'RIFOS', 'RIF', web3.utils.toBN('18'));
    tokenRegistrar = await TokenRegistrar.new(rns.address, rootNode, token.address);
    await rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), tokenRegistrar.address);

    rskOwner = await RSKOwner.new(
      tokenRegistrar.address,
      rns.address,
      rootNode,
    );

    await rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), rskOwner.address);
    await rskOwner.addRegistrar(accounts[0], { from: accounts[0] });
  });

  it('should not allow to reclaim available names', async () => {
    await helpers.expectRevert(
      rskOwner.reclaim(web3.utils.toBN('1234'), accounts[4], { from: accounts[4] }),
      'ERC721: operator query for nonexistent token'
    );
  });

  it('should not allow not owner/approved to reclaim', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const tokenId = web3.utils.toBN(label);
    const owner = accounts[3];

    await rskOwner.register(label, owner, web3.utils.toBN('100'));

    await helpers.expectRevert(
      rskOwner.reclaim(tokenId, accounts[4], { from: accounts[4] }),
      'Not approved or owner.'
    );

    expect(
      await rns.owner(namehash(`${name}.rsk`))
    ).to.eq(owner);
  });

  it('should allow to reclaim owned names', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const tokenId = web3.utils.toBN(label);
    const owner = accounts[3];

    await rskOwner.register(label, owner, web3.utils.toBN('100'));

    const nextOwner = accounts[5];

    await rskOwner.reclaim(tokenId, nextOwner, { from: owner });

    const actualOwner = await rns.owner(namehash(`${name}.rsk`));

    expect(actualOwner).to.eq(nextOwner);
  });

  it('should allow approved to reclaim owned names', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const tokenId = web3.utils.toBN(label);
    const owner = accounts[3];

    await rskOwner.register(label, owner, web3.utils.toBN('100'));

    const approved = accounts[7];

    await rskOwner.approve(approved, tokenId, { from: owner });

    const nextOwner = accounts[5];

    await rskOwner.reclaim(tokenId, nextOwner, { from: approved });

    const actualOwner = await rns.owner(namehash(`${name}.rsk`));

    expect(actualOwner).to.eq(nextOwner);
  });
});
