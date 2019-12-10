const RNS = artifacts.require('RNS');
const Token = artifacts.require('ERC677TokenContract');
const NodeOwner = artifacts.require('NodeOwner');
const Renewer = artifacts.require('Renewer');
const NamePrice = artifacts.require('NamePrice');
const BytesUtils = artifacts.require('BytesUtils');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

const getRenewData = require('../utils').getRenewData;

contract('Renewer', async accounts => {
  let rns, token, nodeOwner, renewer, namePrice;
  const pool = accounts[6];

  beforeEach(async () => {
    const rootNode = namehash('tld');

    rns = await RNS.new();
    token = await Token.new(accounts[0], web3.utils.toBN('1000000000000000000000'));

    nodeOwner = await NodeOwner.new(
      rns.address,
      rootNode,
    );

    await rns.setSubnodeOwner('0x00', web3.utils.sha3('tld'), nodeOwner.address);

    namePrice = await NamePrice.new();

    const bytesUtils = await BytesUtils.new();
    await Renewer.link('BytesUtils', bytesUtils.address);

    renewer = await Renewer.new(token.address, nodeOwner.address, pool, namePrice.address);

    await nodeOwner.addRegistrar(accounts[0]);
    await nodeOwner.addRenewer(renewer.address, { from: accounts[0] });
  });

  it('should have deployer as owner', async () => {
    const owner = await renewer.owner();

    expect(owner).to.eq(accounts[0]);
  });

  describe('initial price', async () => {
    const name = 'ilanolkies';

    it('1 year - 2 rif', async () => {
      const duration = web3.utils.toBN(1);

      expect(
        await renewer.price(name, 0, duration)
      ).to.be.bignumber.eq(
        web3.utils.toBN('2000000000000000000')
      );
    });

    it('2 year - 4 rif', async () => {
      const duration = web3.utils.toBN(2);

      expect(
        await renewer.price(name, 0, duration)
      ).to.be.bignumber.eq(
        web3.utils.toBN('4000000000000000000')
      );
    });

    it('2+k year - k+2 rif', async () => {
      for (let i = 0; i < 10; i++) {
        const duration = web3.utils.toBN(3).add(web3.utils.toBN(i));

        expect(
          await renewer.price(name, 0, duration)
        ).to.be.bignumber.eq(
          duration.add(web3.utils.toBN(2)).mul(web3.utils.toBN('1000000000000000000'))
        );
      }
    });

    it('should not allow to overflow duration', async () => {
      await helpers.expectRevert(
        renewer.price(name, 0, helpers.constants.MAX_UINT256),
        'SafeMath: addition overflow'
      );
    });

    it('should not allow to overflow duration when multiplying', async () => {
      await helpers.expectRevert(
        renewer.price(name, 0, helpers.constants.MAX_UINT256.div(web3.utils.toBN('1000000000000000000'))),
        'SafeMath: multiplication overflow'
      );
    });
  });

  it('should not allow to renew with no token approval - approve + transfer', async () => {
    const name = 'ilanolkies';
    const owner = accounts[5];
    const duration = web3.utils.toBN('1');

    await nodeOwner.register(web3.utils.sha3(name), owner, duration);

    await helpers.expectRevert(
      renewer.renew(name, duration),
      'ERC20: transfer amount exceeds allowance.'
    );
  });

  describe('should require to transfer depending on duration', async () => {
    const name = 'ilanolkies';
    const owner = accounts[5];
    const registrationDuration = web3.utils.toBN('1000');

    beforeEach(async () => {
      await nodeOwner.register(web3.utils.sha3(name), owner, registrationDuration);
    });

    describe('1 year - 2 rif', async () => {
      const duration = web3.utils.toBN('1');
      const amount = web3.utils.toBN('2000000000000000000').sub(web3.utils.toBN('1'));

      it('approve + transfer', async () => {
        await token.approve(renewer.address, amount);

        await helpers.expectRevert(
          renewer.renew(name, duration),
          'ERC20: transfer amount exceeds allowance.'
        );
      });

      it('transferAndCall', async () => {
        await token.transfer(accounts[8], amount);

        const data = getRenewData(name, duration);

        await helpers.expectRevert(
          token.transferAndCall(renewer.address, amount, data, { from: accounts[8] }),
          'Not enough tokens'
        );
      })
    });

    describe('2 years - 4 rif', async () => {
      const duration = web3.utils.toBN('2');
      const amount = web3.utils.toBN('4000000000000000000').sub(web3.utils.toBN('1'));

      it('approve + transfer', async () => {
        await token.approve(renewer.address, amount);

        await helpers.expectRevert(
          renewer.renew(name, duration),
          'ERC20: transfer amount exceeds allowance.'
        );
      });

      it('transferAndCall', async () => {
        await token.transfer(accounts[8], amount);

        const data = getRenewData(name, duration);

        await helpers.expectRevert(
          token.transferAndCall(renewer.address, amount, data, { from: accounts[8] }),
          'Not enough tokens'
        );
      })
    });

    for (let i = 0; i < 10; i++) {
      describe(`${3+i} years - ${5+i} rif`, async () => {
        const duration = web3.utils.toBN(3).add(web3.utils.toBN(i));
        const amount = web3.utils.toBN('4000000000000000000')
        .add(
          duration.sub(web3.utils.toBN(2))
          .mul(web3.utils.toBN('1000000000000000000'))
        )
        .sub(web3.utils.toBN('1'));

        it('approve + transfer', async () => {
          await token.approve(renewer.address, amount);

          await helpers.expectRevert(
            renewer.renew(name, duration),
            'ERC20: transfer amount exceeds allowance.'
          );
        });

        it('transferAndCall', async () => {
          const data = getRenewData(name, duration);
          await token.transfer(accounts[8], amount);

          await helpers.expectRevert(
            token.transferAndCall(renewer.address, amount, data),
            'Not enough tokens'
          );
        });
      });
    }
  });

  describe('should transfer tokens to a resource pool', async () => {
    const name = 'ilanolkies';
    const owner = accounts[5];
    const duration = web3.utils.toBN('1');
    const amount = web3.utils.toBN('2000000000000000000');

    let balance;

    beforeEach(async () => {
      await nodeOwner.register(web3.utils.sha3(name), owner, web3.utils.toBN('1000'));

      balance = await token.balanceOf(pool);
    })

    it('approve + transfer', async () => {
      await token.approve(renewer.address, amount);
      await renewer.renew(name, duration);
    });

    it('transferAndCall', async () => {
      const data = getRenewData(name, duration);
      await token.transferAndCall(renewer.address, amount, data);
    });

    afterEach(async () => {
      const actualBalance = await token.balanceOf(pool);
      expect(actualBalance).to.be.bignumber.eq(balance.add(amount));
    })
  });

  describe('should not allow to renew not owned names', async () => {
    const name = 'ilanolkies';
    const duration = web3.utils.toBN('1');
    const amount = web3.utils.toBN('2000000000000000000');

    it('approve + transfer', async () => {
      await token.transfer(accounts[6], amount);
      await token.approve(renewer.address, amount, { from: accounts[6] });

      await helpers.expectRevert(
        renewer.renew(name, duration, { from: accounts[6] }),
        'Name already expired'
      );
    });

    it('transferAndCall', async () => {
      await token.transfer(accounts[6], amount);

      const data = getRenewData(name, duration);

      await helpers.expectRevert(
        token.transferAndCall(renewer.address, amount, data, { from: accounts[6] }),
        'Name already expired'
      );
    });
  });

  describe('should not allow to renew expired names', async () => {
    const name = 'ilanolkies';
    const duration = web3.utils.toBN('1');
    const amount = web3.utils.toBN('2000000000000000000');

    beforeEach(async () => {
      await nodeOwner.register(web3.utils.sha3(name), accounts[0], web3.utils.toBN('1000'));
      await helpers.time.increase(1001);
      await token.transfer(accounts[6], amount);
    });

    it('approve + transfer', async () => {
      await token.approve(renewer.address, amount, { from: accounts[6] });

      await helpers.expectRevert(
        renewer.renew(name, duration, { from: accounts[6] }),
        'Name already expired'
      );
    });

    it('transferAndCall', async () => {
      const data = getRenewData(name, duration);

      await helpers.expectRevert(
        token.transferAndCall(renewer.address, amount, data, { from: accounts[6] }),
        'Name already expired'
      );
    });
  });

  describe('should renew in blocks of 365 days', async () => {
    let name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const tokenId = web3.utils.toBN(label);
    const baseDuration = web3.utils.toBN('1000');

    let duration, previousExpiration;

    beforeEach(async () => {
      await nodeOwner.register(web3.utils.sha3(name), accounts[0], baseDuration);
    });

    describe('1 year', async () => {
      const amount = web3.utils.toBN('2000000000000000000');

      it('approve + transfer', async () => {
        duration = web3.utils.toBN('1');

        previousExpiration = await nodeOwner.expirationTime(tokenId);

        await token.approve(renewer.address, amount);
        await renewer.renew(name, duration);
      });

      it('transferAndCall', async () => {
        duration = web3.utils.toBN('1');

        previousExpiration = await nodeOwner.expirationTime(tokenId);

        const data = getRenewData(name, duration);
        await token.transferAndCall(renewer.address, amount, data);
      });
    });

    describe('2 years', async () => {
      const amount = web3.utils.toBN('4000000000000000000');

      it('approve + transfer', async () => {
        duration = web3.utils.toBN('2');

        previousExpiration = await nodeOwner.expirationTime(tokenId);

        await token.approve(renewer.address, amount);
        await renewer.renew(name, duration);
      });

      it('transferAndCall', async () => {
        duration = web3.utils.toBN('2');

        previousExpiration = await nodeOwner.expirationTime(tokenId);

        const data = getRenewData(name, duration);
        await token.transferAndCall(renewer.address, amount, data);
      });
    });

    for (let i = 0; i < 10; i++) {
      describe(`${3+i} years`, async () => {
        const amount = web3.utils.toBN('4000000000000000000').add(web3.utils.toBN(i+2).mul(web3.utils.toBN('1000000000000000000')));

        it('approve + transfer', async () => {
          duration = web3.utils.toBN(3).add(web3.utils.toBN(i));

          previousExpiration = await nodeOwner.expirationTime(tokenId);

          await token.approve(renewer.address, amount);
          await renewer.renew(name, duration);
        });

        it('transferAndCall', async () => {
          duration = web3.utils.toBN(3).add(web3.utils.toBN(i));

          previousExpiration = await nodeOwner.expirationTime(tokenId);

          const data = getRenewData(name, duration);
          await token.transferAndCall(renewer.address, amount, data);
        });
      });
    }

    afterEach(async () => {
      const expirationTime = await nodeOwner.expirationTime(tokenId);

      expect(expirationTime).to.be.bignumber.eq(
        previousExpiration
        .add(web3.utils.toBN('31536000').mul(duration))
      );
    });
  });

  describe('should allow to renew for another owner', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const owner = accounts[5];
    const duration = web3.utils.toBN('1');
    const amount = web3.utils.toBN('2000000000000000000');

    beforeEach(async () => {
      await nodeOwner.register(label, owner, web3.utils.toBN('100000'));
    });

    it('approve + transfer', async () => {
      await token.approve(renewer.address, amount);
      await renewer.renew(name, duration);
    });

    it('transferAndCall', async () => {
      const data = getRenewData(name, duration);
      await token.transferAndCall(renewer.address, amount, data);
    });

    afterEach(async () =>
      expect(
        await nodeOwner.ownerOf(web3.utils.toBN(label))
      ).to.eq(
        accounts[5]
      )
    );
  });

  describe('should increase expiration in node owner', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const tokenId = web3.utils.toBN(label);
    const owner = accounts[5];
    const duration = web3.utils.toBN('1');
    const amount = web3.utils.toBN('2000000000000000000');
    const baseDuration = web3.utils.toBN('1000');

    beforeEach(async () => {
      await nodeOwner.register(label, owner, baseDuration);
    });

    it('approver + transfer', async () => {
      await token.approve(renewer.address, amount);
      await renewer.renew(name, duration);
    });

    it('transferAndCall', async () => {
      const data = getRenewData(name, duration);
      await token.transferAndCall(renewer.address, amount, data);
    });

    afterEach(async () => {
      const expectedExpiration = await web3.eth.getBlock('latest')
      .then(b => b.timestamp)
      .then(web3.utils.toBN)
      .then(n => n
        .add(duration.mul(web3.utils.toBN('31536000')))
        .add(baseDuration)
      );

      const tldOwnerEvents = await nodeOwner.getPastEvents('allEvents');

      helpers.expectEvent.inLogs(
        tldOwnerEvents,
        'ExpirationChanged',
        {
          tokenId,
          expirationTime: expectedExpiration,
        }
      );
    });
  });

  it('should not allow to duration equal to MAX_UINT256 - 1', async () => {
    const duration = helpers.constants.MAX_UINT256.sub(web3.utils.toBN(1));

    await helpers.expectRevert(
      renewer.price(name, 0, duration),
      'SafeMath: addition overflow'
    );
  });

  it('should not allow to duration equal to MAX_UINT256 - 2', async () => {
    const duration = helpers.constants.MAX_UINT256.sub(web3.utils.toBN(2));

    await helpers.expectRevert(
      renewer.price(name, 0, duration),
      'SafeMath: multiplication overflow'
    );
  });

  it('should not allow duration equal to 0', async () => {
    await helpers.expectRevert(
      renewer.price(name, 0, 0),
      'NamePrice: no zero duration'
    );
  });

  it('should give change - transferAndCall', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const owner = accounts[5];
    const duration = web3.utils.toBN('1');
    const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';

    const amount = web3.utils.toBN('8000000000000000000');

    await nodeOwner.register(label, owner, web3.utils.toBN('1000'));

    const expectedBalance = await token.balanceOf(accounts[0]).then(b => b.sub(web3.utils.toBN('2000000000000000000')));

    const data = getRenewData(name, duration);
    await token.transferAndCall(renewer.address, amount, data);

    const actualBalance = await token.balanceOf(accounts[0]);

    expect(actualBalance).to.be.bignumber.eq(expectedBalance);
  });
});
