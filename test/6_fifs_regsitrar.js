const RNS = artifacts.require('RNS');
const Token = artifacts.require('ERC677TokenContract');
const TokenRegistrar = artifacts.require('TokenRegistrar');
const RSKOwner = artifacts.require('RSKOwner');
const FIFSRegistrar = artifacts.require('FIFSRegistrar');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('FIFS Registrar', async (accounts) => {
  let rns, token, tokenRegistrar, rskOwner, fifsRegistrar;

  beforeEach(async () => {
    const rootNode = namehash('rsk');

    rns = await RNS.new();
    token = await Token.new(accounts[0], web3.utils.toBN('1000000000000000000000'));
    tokenRegistrar = await TokenRegistrar.new(rns.address, rootNode, token.address);
    await rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), tokenRegistrar.address);

    const migrationPeriod = web3.utils.toBN('1296000'); // 15 days
    rskOwner = await RSKOwner.new(
      tokenRegistrar.address,
      migrationPeriod,
      rns.address,
      rootNode,
    );
    await rns.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), rskOwner.address);

    await helpers.time.increase(1296001);

    fifsRegistrar = await FIFSRegistrar.new();
    await rskOwner.addRegistrar(fifsRegistrar.address, { from: accounts[0] });
  });

  it('should have deployer as owner', async () => {
    const owner = await rskOwner.owner();

    expect(owner).to.eq(accounts[0]);
  });

  describe('committing', async () => {
    const label = web3.utils.sha3('ilanolkies');
    const owner = accounts[4];

    it('should create a commitment for a given name, owner and secret', async () => {
      const commitment = await fifsRegistrar.makeCommitment(
        label,
        owner,
        '0x0000000000000000000000000000000000000000000000000000000000001234',
      );

      expect(commitment).to.not.be.null;
    });

    it('should create different commitments for different secrets', async () => {
      const commitment1 = await fifsRegistrar.makeCommitment(
        label,
        owner,
        '0x0000000000000000000000000000000000000000000000000000000000001234',
      );
      const commitment2 = await fifsRegistrar.makeCommitment(
        label,
        owner,
        '0x0000000000000000000000000000000000000000000000000000000000005678',
      );
      expect(commitment1).to.not.equal(commitment2);
    });
  });

  describe('commitment age', async () => {
    let commitment;

    beforeEach(async () => {
      commitment = await fifsRegistrar.makeCommitment(
        web3.utils.sha3('ilanolkies'),
        accounts[4],
        '0x0000000000000000000000000000000000000000000000000000000000001234',
      );
    });

    it('should not be able to reveal before committing', async () => {
      const canReveal = await fifsRegistrar.canReveal(commitment);

      expect(canReveal).to.be.false;
    });

    it('should be able to reveal after one minute', async () => {
      await fifsRegistrar.commit(commitment);

      await helpers.time.increase(61);

      const canReveal = await fifsRegistrar.canReveal(commitment);

      expect(canReveal).to.be.true;
    });
  });

  describe('revealing', async () => {
    const name = 'ilanolkies';
    const owner = accounts[5];
    const duration = web3.utils.toBN('1');
    const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';

    let commitment;

    beforeEach(async () => {
      commitment = await fifsRegistrar.makeCommitment(web3.utils.sha3(name), owner, secret);
    })

    it('should not allow to register with no commitment', async () => {
      await helpers.expectRevert(
        fifsRegistrar.register(name, owner, secret, duration),
        'No commitment found'
      );
    });

    it('should not allow to register before commitment maturity', async () => {
      await fifsRegistrar.commit(commitment);

      await helpers.expectRevert(
        fifsRegistrar.register(name, owner, secret, duration),
        'No commitment found'
      );
    });

    it('should not allow to reveal with a wrong secret', async () => {
      await fifsRegistrar.commit(commitment);

      await helpers.expectRevert(
        fifsRegistrar.register(name, owner, '0x0000000000000000000000000000000000000000000000000000000000005678', duration),
        'No commitment found'
      );
    });

    it('should not allow to change owner of a commitment', async () => {
      await fifsRegistrar.commit(commitment);

      await helpers.expectRevert(
        fifsRegistrar.register(name, accounts[6], secret, duration),
        'No commitment found'
      );
    });
  });

  describe('update commitment age', async () => {
    it('should not allow not owner to set min commitment age', async () => {
      await helpers.expectRevert(
        fifsRegistrar.setMinCommitmentAge(web3.utils.toBN(1), { from: accounts[2] }),
        'Ownable: caller is not the owner'
      );
    });

    it('should allow owner to set min commitment age', async () => {
      const minCommitmentAge = web3.utils.toBN(120);

      await fifsRegistrar.setMinCommitmentAge(minCommitmentAge, { from: accounts[0] });

      const actualMinCommitmentAge = await fifsRegistrar.minCommitmentAge();

      expect(actualMinCommitmentAge).to.be.bignumber.eq(minCommitmentAge);
    });

    it('should increase time for commit-reveal process', async () => {
      const name = 'ilanolkies';
      const owner = accounts[5];
      const duration = web3.utils.toBN('1');
      const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';

      await fifsRegistrar.setMinCommitmentAge(web3.utils.toBN(120), { from: accounts[0] });

      const commitment = await fifsRegistrar.makeCommitment(web3.utils.sha3(name), owner, secret);
      await fifsRegistrar.commit(commitment);

      expect(await fifsRegistrar.canReveal(commitment)).to.be.false;

      await helpers.time.increase(61);

      expect(await fifsRegistrar.canReveal(commitment)).to.be.false;

      await helpers.expectRevert(
        fifsRegistrar.register(name, owner, secret, duration),
        'No commitment found'
      );

      await helpers.time.increase(60);

      expect(await fifsRegistrar.canReveal(commitment)).to.be.true;
    });
  });
});
