const RNS = artifacts.require('RNS');
const Token = artifacts.require('ERC677TokenContract');
const NodeOwner = artifacts.require('NodeOwner');
const FIFSRegistrar = artifacts.require('FIFSRegistrar');
const NamePrice = artifacts.require('NamePrice');
const BytesUtils = artifacts.require('BytesUtils');

const namehash = require('eth-ens-namehash').hash;
const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

const getRegisterData = require('../../utils').getRegisterData;

contract('FIFS Registrar', async (accounts) => {
  let rns, token, nodeOwner, fifsRegistrar, namePrice;
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
    await FIFSRegistrar.link('BytesUtils', bytesUtils.address);

    fifsRegistrar = await FIFSRegistrar.new(token.address, nodeOwner.address, pool, namePrice.address);

    await nodeOwner.addRegistrar(fifsRegistrar.address, { from: accounts[0] });
  });

  it('should have deployer as owner', async () => {
    const owner = await nodeOwner.owner();

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
    const amount = web3.utils.toBN(2);
    const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';

    let commitment;

    beforeEach(async () => {
      commitment = await fifsRegistrar.makeCommitment(web3.utils.sha3(name), owner, secret);
    });

    describe('should not allow to register with no commitment', async () => {
      it('approve + transfer', async () => {
        await token.approve(fifsRegistrar.address, amount);

        await helpers.expectRevert(
          fifsRegistrar.register(name, owner, secret, duration),
          'No commitment found'
        );
      });

      it('transferAndCall', async () => {
        const data = getRegisterData(name, owner, secret, duration);

        await helpers.expectRevert(
          token.transferAndCall(fifsRegistrar.address, amount, data),
          'No commitment found'
        );
      });
    });

    describe('should not allow to register before commitment maturity', async () => {
      beforeEach(async () =>
        await fifsRegistrar.commit(commitment)
      );

      it('approve + transfer', async () => {
        await token.approve(fifsRegistrar.address, amount);

        await helpers.expectRevert(
          fifsRegistrar.register(name, owner, secret, duration),
          'No commitment found'
        );
      });

      it('transferAndCall', async () => {
        const data = getRegisterData(name, owner, secret, duration);

        await helpers.expectRevert(
          token.transferAndCall(fifsRegistrar.address, amount, data),
          'No commitment found'
        );
      });
    });

    describe('should not allow to reveal with a wrong secret', async () => {
      beforeEach(async () =>
        await fifsRegistrar.commit(commitment)
      );

      it('approve + transfer', async () => {
        await token.approve(fifsRegistrar.address, amount);

        await helpers.expectRevert(
          fifsRegistrar.register(name, owner, '0x0000000000000000000000000000000000000000000000000000000000005678', duration),
          'No commitment found'
        );
      });

      it('transferAndCall', async () => {
        const data = getRegisterData(name, owner, '0x0000000000000000000000000000000000000000000000000000000000005678', duration);

        await helpers.expectRevert(
          token.transferAndCall(fifsRegistrar.address, amount, data),
          'No commitment found'
        );
      })
    });

    describe('should not allow to change owner of a commitment', async () => {
      beforeEach(async () =>
        await fifsRegistrar.commit(commitment)
      );

      it('approve + transfer', async () => {
        await token.approve(fifsRegistrar.address, amount);

        await helpers.expectRevert(
          fifsRegistrar.register(name, accounts[6], secret, duration),
          'No commitment found'
        );
      });

      it('transferAndCall', async () => {
        const data = getRegisterData(name, accounts[6], secret, duration);

        await helpers.expectRevert(
          token.transferAndCall(fifsRegistrar.address, amount, data),
          'No commitment found'
        );
      });
    });

    it('should not allow to postpone a commitment', async () => {
      await fifsRegistrar.commit(commitment);

      await helpers.expectRevert(
        fifsRegistrar.commit(commitment, { from: accounts[5] }),
        'Existent commitment'
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

      await token.approve(fifsRegistrar.address, web3.utils.toBN(2));

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

  describe('initial price', async () => {
    it('1 year - 2 rif', async () => {
      const name = 'ilanolkies';
      const duration = web3.utils.toBN(1);

      expect(
        await fifsRegistrar.price(name, 0, duration)
      ).to.be.bignumber.eq(
        web3.utils.toBN('2000000000000000000')
      );
    });

    it('2 year - 4 rif', async () => {
      const name = 'ilanolkies';
      const duration = web3.utils.toBN(2);

      expect(
        await fifsRegistrar.price(name, 0, duration)
      ).to.be.bignumber.eq(
        web3.utils.toBN('4000000000000000000')
      );
    });

    it('2+k year - k+2 rif', async () => {
      const name = 'ilanolkies';

      for (let i = 0; i < 10; i++) {
        const duration = web3.utils.toBN(3).add(web3.utils.toBN(i));

        expect(
          await fifsRegistrar.price(name, 0, duration)
        ).to.be.bignumber.eq(
          duration.add(web3.utils.toBN(2)).mul(web3.utils.toBN('1000000000000000000'))
        );
      }
    });

    it('should not allow to overflow duration', async () => {
      await helpers.expectRevert(
        fifsRegistrar.price(name, 0, helpers.constants.MAX_UINT256),
        'SafeMath: addition overflow'
      );
    });

    it('should not allow to overflow duration when multiplying', async () => {
      await helpers.expectRevert(
        fifsRegistrar.price(name, 0, helpers.constants.MAX_UINT256.div(web3.utils.toBN('1000000000000000000'))),
        'SafeMath: multiplication overflow'
      );
    });
  });

  describe('registration', async () => {
    it('should not allow to register with no token approval - approve + transfer', async () => {
      const name = 'ilanolkies';
      const owner = accounts[5];
      const duration = web3.utils.toBN('1');
      const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';

      const commitment = await fifsRegistrar.makeCommitment(web3.utils.sha3(name), owner, secret);
      await fifsRegistrar.commit(commitment);

      await helpers.time.increase(61);

      await helpers.expectRevert(
        fifsRegistrar.register(name, owner, secret, duration),
        'ERC20: transfer amount exceeds allowance.'
      );
    });

    describe('should require to transfer depending on duration', async () => {
      const name = 'ilanolkies';
      const owner = accounts[5];
      const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';

      beforeEach(async () => {
        const commitment = await fifsRegistrar.makeCommitment(web3.utils.sha3(name), owner, secret);
        await fifsRegistrar.commit(commitment);

        await helpers.time.increase(61);
      });

      describe('1 year - 2 rif', async () => {
        const duration = web3.utils.toBN('1');
        const amount = web3.utils.toBN('2000000000000000000').sub(web3.utils.toBN('1'));

        it('approve + transfer', async () => {
          await token.approve(fifsRegistrar.address, amount);

          await helpers.expectRevert(
            fifsRegistrar.register(name, owner, secret, duration),
            'ERC20: transfer amount exceeds allowance.'
          );
        });

        it('transferAndCall', async () => {
          await token.transfer(accounts[8], amount);

          const data = getRegisterData(name, owner, secret, duration);

          await helpers.expectRevert(
            token.transferAndCall(fifsRegistrar.address, amount, data, { from: accounts[8] }),
            'Not enough tokens'
          );
        })
      });

      describe('2 years - 4 rif', async () => {
        const duration = web3.utils.toBN('2');
        const amount = web3.utils.toBN('4000000000000000000').sub(web3.utils.toBN('1'));

        it('approve + transfer', async () => {
          await token.approve(fifsRegistrar.address, amount);

          await helpers.expectRevert(
            fifsRegistrar.register(name, owner, secret, duration),
            'ERC20: transfer amount exceeds allowance.'
          );
        });

        it('transferAndCall', async () => {
          await token.transfer(accounts[8], amount);

          const data = getRegisterData(name, owner, secret, duration);

          await helpers.expectRevert(
            token.transferAndCall(fifsRegistrar.address, amount, data, { from: accounts[8] }),
            'Not enough tokens'
          );
        })
      });

      for (let i = 0; i < 10; i++) {
        describe(`${2+i} years - ${4+i} rif`, async () => {
          const duration = web3.utils.toBN(3).add(web3.utils.toBN(i));
          const amount = web3.utils.toBN('4000000000000000000')
          .add(
            duration.sub(web3.utils.toBN(2))
            .mul(web3.utils.toBN('1000000000000000000'))
          )
          .sub(web3.utils.toBN('1'));

          it('approve + transfer', async () => {
            await token.approve(fifsRegistrar.address, amount);

            await helpers.expectRevert(
              fifsRegistrar.register(name, owner, secret, duration),
              'ERC20: transfer amount exceeds allowance.'
            );
          });

          it('transferAndCall', async () => {
            const data = getRegisterData(name, owner, secret, duration);
            await token.transfer(accounts[8], amount);

            await helpers.expectRevert(
              token.transferAndCall(fifsRegistrar.address, amount, data),
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
      const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';
      const amount = web3.utils.toBN('2000000000000000000');

      let balance;

      beforeEach(async () => {
        const commitment = await fifsRegistrar.makeCommitment(web3.utils.sha3(name), owner, secret);
        await fifsRegistrar.commit(commitment);

        await helpers.time.increase(61);

        balance = await token.balanceOf(pool);
      })

      it('approve + transfer', async () => {
        await token.approve(fifsRegistrar.address, amount);
        await fifsRegistrar.register(name, owner, secret, duration);
      });

      it('transferAndCall', async () => {
        const data = getRegisterData(name, owner, secret, duration);
        await token.transferAndCall(fifsRegistrar.address, amount, data);
      });

      afterEach(async () => {
        const actualBalance = await token.balanceOf(pool);
        expect(actualBalance).to.be.bignumber.eq(balance.add(amount));
      })
    });

    describe('should only register available names', async () => {
      const name = 'ilanolkies';
      const owner = accounts[5];
      const duration = web3.utils.toBN('1');
      const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';
      const amount = web3.utils.toBN('2000000000000000000');

      beforeEach(async () => {
        await token.approve(fifsRegistrar.address, amount);

        const commitment = await fifsRegistrar.makeCommitment(web3.utils.sha3(name), owner, secret);
        await fifsRegistrar.commit(commitment);

        await helpers.time.increase(61);

        await fifsRegistrar.register(name, owner, secret, duration);

        const commitment2 = await fifsRegistrar.makeCommitment(web3.utils.sha3(name), accounts[6], secret, { from: accounts[6] });
        await fifsRegistrar.commit(commitment2);

        await helpers.time.increase(61);
      });

      it('approve + transfer', async () => {
        await token.transfer(accounts[6], amount);
        await token.approve(fifsRegistrar.address, amount, { from: accounts[6] });

        await helpers.expectRevert(
          fifsRegistrar.register(name, accounts[6], secret, duration, { from: accounts[6] }),
          'Not available'
        );
      });

      it('transferAndCall', async () => {
        await token.transfer(accounts[6], amount);

        const data = getRegisterData(name, accounts[6], secret, duration);

        await helpers.expectRevert(
          token.transferAndCall(fifsRegistrar.address, amount, data, { from: accounts[6] }),
          'Not available'
        );
      });
    });

    describe('should register in blocks of 365 days', async () => {
      let name = 'ilanolkies';
      const label = web3.utils.sha3(name);
      const tokenId = web3.utils.toBN(label);
      const owner = accounts[5];
      const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';

      let duration;

      beforeEach(async () => {
        const commitment = await fifsRegistrar.makeCommitment(label, owner, secret);
        await fifsRegistrar.commit(commitment);
        await helpers.time.increase(61);
      });

      describe('1 year', async () => {
        const amount = web3.utils.toBN('2000000000000000000');

        it('approve + transfer', async () => {
          duration = web3.utils.toBN('1');

          await token.approve(fifsRegistrar.address, amount);
          await fifsRegistrar.register(name, owner, secret, duration);
        });

        it('transferAndCall', async () => {
          duration = web3.utils.toBN('1');

          const data = getRegisterData(name, owner, secret, duration);
          await token.transferAndCall(fifsRegistrar.address, amount, data);
        });
      });

      describe('2 years', async () => {
        const amount = web3.utils.toBN('4000000000000000000');

        it('approve + transfer', async () => {
          duration = web3.utils.toBN('2');

          await token.approve(fifsRegistrar.address, amount);
          await fifsRegistrar.register(name, owner, secret, duration);
        });

        it('transferAndCall', async () => {
          duration = web3.utils.toBN('2');

          const data = getRegisterData(name, owner, secret, duration);
          await token.transferAndCall(fifsRegistrar.address, amount, data);
        });
      });

      for (let i = 0; i < 10; i++) {
        describe(`${2+i} years`, async () => {
          const amount = web3.utils.toBN('4000000000000000000').add(web3.utils.toBN(i+1).mul(web3.utils.toBN('1000000000000000000')));

          it('approve + transfer', async () => {
            duration = web3.utils.toBN(3).add(web3.utils.toBN(i));

            await token.approve(fifsRegistrar.address, amount);
            await fifsRegistrar.register(name, owner, secret, duration);
          });

          it('transferAndCall', async () => {
            duration = web3.utils.toBN(3).add(web3.utils.toBN(i));

            const data = getRegisterData(name, owner, secret, duration);
            await token.transferAndCall(fifsRegistrar.address, amount, data);
          });
        });
      }

      afterEach(async () => {
        const expirationTime = await nodeOwner.expirationTime(tokenId);
        const now = await web3.eth.getBlock('latest').then(b => b.timestamp);

        expect(expirationTime).to.be.bignumber.eq(web3.utils.toBN(now).add(web3.utils.toBN('31536000').mul(duration)));
      });
    });

    describe('should allow to register for another owner', async () => {
      const name = 'ilanolkies';
      const label = web3.utils.sha3(name);
      const owner = accounts[5];
      const duration = web3.utils.toBN('1');
      const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';
      const amount = web3.utils.toBN('2000000000000000000');

      beforeEach(async () => {
        const commitment = await fifsRegistrar.makeCommitment(label, owner, secret);
        await fifsRegistrar.commit(commitment);

        await helpers.time.increase(61);
      });

      it('approve + transfer', async () => {
        await token.approve(fifsRegistrar.address, amount);
        await fifsRegistrar.register(name, owner, secret, duration);
      });

      it('transferAndCall', async () => {
        const data = getRegisterData(name, owner, secret, duration);
        await token.transferAndCall(fifsRegistrar.address, amount, data);
      });

      afterEach(async () =>
        expect(
          await nodeOwner.ownerOf(web3.utils.toBN(label))
        ).to.eq(
          accounts[5]
        )
      );
    });

    describe('should remove commitment after registering', async () => {
      const name = 'ilanolkies';
      const label = web3.utils.sha3(name);
      const owner = accounts[5];
      const duration = web3.utils.toBN('1');
      const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';
      const amount = web3.utils.toBN('2000000000000000000');

      let commitment;

      beforeEach(async () => {
        commitment = await fifsRegistrar.makeCommitment(label, owner, secret);
        await fifsRegistrar.commit(commitment);

        await helpers.time.increase(61);
      });

      it('approver + transfer', async () => {
        await token.approve(fifsRegistrar.address, amount);
        await fifsRegistrar.register(name, owner, secret, duration);
      });

      it('transferAndCall', async () => {
        const data = getRegisterData(name, owner, secret, duration);
        await token.transferAndCall(fifsRegistrar.address, amount, data);
      });

      afterEach(async () =>
        expect(
          await fifsRegistrar.canReveal(commitment)
        ).to.be.false
      );
    });

    describe('should register the name in tld owner', async () => {
      const name = 'ilanolkies';
      const label = web3.utils.sha3(name);
      const tokenId = web3.utils.toBN(label);
      const owner = accounts[5];
      const duration = web3.utils.toBN('1');
      const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';
      const amount = web3.utils.toBN('2000000000000000000');

      beforeEach(async () => {
        const commitment = await fifsRegistrar.makeCommitment(label, owner, secret);
        await fifsRegistrar.commit(commitment);

        await helpers.time.increase(61);
      });

      it('approver + transfer', async () => {
        await token.approve(fifsRegistrar.address, amount);
        await fifsRegistrar.register(name, owner, secret, duration);
      });

      it('transferAndCall', async () => {
        const data = getRegisterData(name, owner, secret, duration);
        await token.transferAndCall(fifsRegistrar.address, amount, data);
      });

      afterEach(async () => {
        const expectedExpiration = await web3.eth.getBlock('latest')
        .then(b => b.timestamp)
        .then(web3.utils.toBN)
        .then(n => n.add(duration.mul(web3.utils.toBN('31536000'))));

        const tldOwnerEvents = await nodeOwner.getPastEvents('allEvents');

        helpers.expectEvent.inLogs(
          tldOwnerEvents,
          'ExpirationChanged',
          {
            tokenId,
            expirationTime: expectedExpiration,
          }
        );

        helpers.expectEvent.inLogs(
          tldOwnerEvents,
          'Transfer',
          {
            from: helpers.constants.ZERO_ADDRESS,
            to: owner,
            tokenId,
          }
        );
      });
    });

    it('should not allow to duration equal to MAX_UINT256 - 1', async () => {
      const duration = helpers.constants.MAX_UINT256.sub(web3.utils.toBN(1));

      await helpers.expectRevert(
        fifsRegistrar.price(name, 0, duration),
        'SafeMath: addition overflow'
      );
    });

    it('should not allow to duration equal to MAX_UINT256 - 2', async () => {
      const duration = helpers.constants.MAX_UINT256.sub(web3.utils.toBN(2));

      await helpers.expectRevert(
        fifsRegistrar.price(name, 0, duration),
        'SafeMath: multiplication overflow'
      );
    });

    it('should not allow duration equal to 0', async () => {
      await helpers.expectRevert(
        fifsRegistrar.price(name, 0, 0),
        'NamePrice: no zero duration'
      );
    });
  });

  describe('update name price', async () => {
    it('should not allow not owner to update the namePriceContract', async () => {
      const anotherNamePrice = await NamePrice.new();
      await helpers.expectRevert(
        fifsRegistrar.setNamePrice(anotherNamePrice.address, { from: accounts[2] }),
        'Ownable: caller is not the owner'
      );
    });

    it('should allow owner to update name price', async () => {
      const anotherNamePrice = await NamePrice.new();

      await fifsRegistrar.setNamePrice(anotherNamePrice.address, { from: accounts[0] });

      const actualNamePrice = await fifsRegistrar.namePrice();

      expect(actualNamePrice).to.be.eq(anotherNamePrice.address);
    });

    it('should emit an event when name price is updated', async () => {
      const anotherNamePrice = await NamePrice.new();

      await fifsRegistrar.setNamePrice(anotherNamePrice.address, { from: accounts[0] });

      helpers.expectEvent.inLogs(
        await fifsRegistrar.getPastEvents(),
        'NamePriceChanged',
        { contractAddress: anotherNamePrice.address }
      );
    });

    describe('length lock', async () => {
      describe('should initially lock names of length lower than 5', async () => {
        let name;

        it('4 characters', () => {
          name = 'ilan';
        });

        it('3 characters', () => {
          name = 'ila';
        });

        it('2 characters', () => {
          name = 'il';
        });

        it('1 characters', () => {
          name = 'i';
        });

        it('0 characters', () => {
          name = '';
        });

        afterEach(async () => {
          const label = name ? web3.utils.sha3(name) : '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470';
          const owner = accounts[5];
          const duration = web3.utils.toBN('1');
          const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';
          const amount = web3.utils.toBN('2000000000000000000');

          await token.approve(fifsRegistrar.address, amount);

          const commitment = await fifsRegistrar.makeCommitment(label, owner, secret);
          await fifsRegistrar.commit(commitment);

          await helpers.time.increase(61);

          await helpers.expectRevert(
            fifsRegistrar.register(name, owner, secret, duration),
            'Short names not available',
          );
        });
      });

      it('should not allow not owner to change locked names', async () => {
        await helpers.expectRevert(
          fifsRegistrar.setMinLength(web3.utils.toBN(2), { from: accounts[5] }),
          'Ownable: caller is not the owner'
        );

        expect(
          await fifsRegistrar.minLength()
        ).to.be.bignumber.eq(
          web3.utils.toBN(5)
        );
      });

      it('should allow owner to change locked names', async () => {
        const minLength = web3.utils.toBN(2);
        await fifsRegistrar.setMinLength(minLength, { from: accounts[0] }),

        expect(
          await fifsRegistrar.minLength()
        ).to.be.bignumber.eq(
          minLength
        );
      });

      it('should allow to register unlocked names', async () => {
        await fifsRegistrar.setMinLength(web3.utils.toBN(2), { from: accounts[0] });

        const name = 'il';
        const label = web3.utils.sha3(name);
        const owner = accounts[5];
        const duration = web3.utils.toBN('1');
        const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';
        const amount = web3.utils.toBN('2000000000000000000');

        await token.approve(fifsRegistrar.address, amount);

        const commitment = await fifsRegistrar.makeCommitment(label, owner, secret);
        await fifsRegistrar.commit(commitment);

        await helpers.time.increase(61);

        await fifsRegistrar.register(name, owner, secret, duration);

        expect(
          await nodeOwner.ownerOf(web3.utils.toBN(label))
        ).to.eq(owner);
      });
    });
  });

  it('should give change - transferAndCall', async () => {
    const name = 'ilanolkies';
    const label = web3.utils.sha3(name);
    const owner = accounts[5];
    const duration = web3.utils.toBN('1');
    const secret = '0x0000000000000000000000000000000000000000000000000000000000001234';

    const amount = web3.utils.toBN('8000000000000000000');

    const commitment = await fifsRegistrar.makeCommitment(label, owner, secret);
    await fifsRegistrar.commit(commitment);

    await helpers.time.increase(61);

    const expectedBalance = await token.balanceOf(accounts[0]).then(b => b.sub(web3.utils.toBN('2000000000000000000')));

    const data = getRegisterData(name, owner, secret, duration);
    await token.transferAndCall(fifsRegistrar.address, amount, data);

    const actualBalance = await token.balanceOf(accounts[0]);

    expect(actualBalance).to.be.bignumber.eq(expectedBalance);
  });
});
