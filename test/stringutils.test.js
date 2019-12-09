const StringUtilsMock = artifacts.require('StringUtilsMock');

const expect = require('chai').expect;
require('@openzeppelin/test-helpers');

contract('String Utils', async () => {
  let stringUtilsMock;

  beforeEach(async () => {
    stringUtilsMock = await StringUtilsMock.new();
  });

  it('should calculate strlen', async () => {
    let str = '';

    for (let i = 0; i < 20; i++) {
      expect(
        await stringUtilsMock.test(str)
      ).to.be.bignumber.eq(
        web3.utils.toBN(i)
      );
      str += String.fromCharCode(Math.floor((Math.random() * 25) + 97));
    }
  });
});
