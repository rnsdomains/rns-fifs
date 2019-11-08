const NamePrice = artifacts.require('NamePrice');

const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('Name Price', async () => {
  let namePrice;
  const name = 'javiesses';

  beforeEach(async () => {
    namePrice = await NamePrice.new();
  });

  it('1 year - 2 rif', async () => {
    const duration = web3.utils.toBN(1);

    expect(
      await namePrice.price(name, 0, duration)
    ).to.be.bignumber.eq(
      web3.utils.toBN('2000000000000000000')
    );
  });

  it('2 year - 4 rif', async () => {
    const duration = web3.utils.toBN(2);

    expect(
      await namePrice.price(name, 0, duration)
    ).to.be.bignumber.eq(
      web3.utils.toBN('4000000000000000000')
    );
  });

  it('2+k year - k+2 rif', async () => {
    for (let i = 0; i < 10; i++) {
      const duration = web3.utils.toBN(3).add(web3.utils.toBN(i));

      expect(
        await namePrice.price(name, 0, duration)
      ).to.be.bignumber.eq(
        duration.add(web3.utils.toBN(2)).mul(web3.utils.toBN('1000000000000000000'))
      );
    }
  });

  it('should not allow to overflow duration', async () => {
    await helpers.expectRevert(
      namePrice.price(name, 0, helpers.constants.MAX_UINT256),
      'SafeMath: addition overflow'
    );
  });

  it('should not allow to overflow duration when multiplying', async () => {
    await helpers.expectRevert(
      namePrice.price(name, 0, helpers.constants.MAX_UINT256.div(web3.utils.toBN('1000000000000000000'))),
      'SafeMath: multiplication overflow'
    );
  });

  it('should not allow to duration equal to MAX_UINT256 - 1', async () => {
    const duration = helpers.constants.MAX_UINT256.sub(web3.utils.toBN(1));

    await helpers.expectRevert(
      namePrice.price(name, 0, duration),
      'SafeMath: addition overflow'
    );
  });

  it('should not allow to duration equal to MAX_UINT256 - 2', async () => {
    const duration = helpers.constants.MAX_UINT256.sub(web3.utils.toBN(2));

    await helpers.expectRevert(
      namePrice.price(name, 0, duration),
      'SafeMath: multiplication overflow'
    );
  });

  it('should not allow duration equal to 0', async () => {
    await helpers.expectRevert(
      namePrice.price(name, 0, 0),
      'NamePrice: no zero duration'
    );
  });
});
