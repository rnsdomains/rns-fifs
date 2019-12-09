const expect = require('chai').expect;
const utils = require('../utils');

describe('utils', () => {
  it('should parse register data', () => {
    const name = 'ilanolkies';
    const owner = '0x0000011111222223333344444555556666677777';
    const secret = '0x1234';
    const duration = web3.utils.toBN('1');

    const expected =
      web3.utils.sha3('register(string,address,bytes32,uint)').slice(0, 10) + // signature 4b
      '0000011111222223333344444555556666677777' + // address 20b - offest 4b
      '1234000000000000000000000000000000000000000000000000000000000000' + // secret 32b - offset 24b
      '0000000000000000000000000000000000000000000000000000000000000001' + // duration 32b - offset 56b
      '696c616e6f6c6b696573'; // name - offset 88b

    const actual = utils.getRegisterData(name, owner, secret, duration);

    expect(actual).to.eq(expected);
  });
});
