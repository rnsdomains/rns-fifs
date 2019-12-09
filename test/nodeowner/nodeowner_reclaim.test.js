const RNS = artifacts.require('RNS');
const NodeOwner = artifacts.require('NodeOwner');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('Node Owner - reclaim', async (accounts) => {
  let rns, nodeOwner;

  beforeEach(async () => {
    const rootNode = namehash('tld');

    rns = await RNS.new();

    nodeOwner = await NodeOwner.new(
      rns.address,
      rootNode,
    );

    await rns.setSubnodeOwner('0x00', web3.utils.sha3('tld'), nodeOwner.address);
    await nodeOwner.addRegistrar(accounts[0], { from: accounts[0] });
  });

  it('should not allow to reclaim available names', async () => {
    await helpers.expectRevert(
      nodeOwner.reclaim(web3.utils.toBN('1234'), accounts[4], { from: accounts[4] }),
      'ERC721: operator query for nonexistent token'
    );
  });

  it('should not allow not owner/approved to reclaim', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const tokenId = web3.utils.toBN(label);
    const owner = accounts[3];

    await nodeOwner.register(label, owner, web3.utils.toBN('100'));

    await helpers.expectRevert(
      nodeOwner.reclaim(tokenId, accounts[4], { from: accounts[4] }),
      'Not approved or owner.'
    );

    expect(
      await rns.owner(namehash(`${name}.tld`))
    ).to.eq(owner);
  });

  it('should allow to reclaim owned names', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const tokenId = web3.utils.toBN(label);
    const owner = accounts[3];

    await nodeOwner.register(label, owner, web3.utils.toBN('100'));

    const nextOwner = accounts[5];

    await nodeOwner.reclaim(tokenId, nextOwner, { from: owner });

    const actualOwner = await rns.owner(namehash(`${name}.tld`));

    expect(actualOwner).to.eq(nextOwner);
  });

  it('should allow approved to reclaim owned names', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const tokenId = web3.utils.toBN(label);
    const owner = accounts[3];

    await nodeOwner.register(label, owner, web3.utils.toBN('100'));

    const approved = accounts[7];

    await nodeOwner.approve(approved, tokenId, { from: owner });

    const nextOwner = accounts[5];

    await nodeOwner.reclaim(tokenId, nextOwner, { from: approved });

    const actualOwner = await rns.owner(namehash(`${name}.tld`));

    expect(actualOwner).to.eq(nextOwner);
  });
});
