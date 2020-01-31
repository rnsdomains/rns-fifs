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

  it('should parse renew data', async () => {
    const name = 'ilanolkies';
    const duration = web3.utils.toBN('1');

    const expected =
      web3.utils.sha3('renew(string,uint)').slice(0, 10) + // signature 4b
      '0000000000000000000000000000000000000000000000000000000000000001' + // duration 32b - offset 4b
      '696c616e6f6c6b696573'; // name - offset 24b

    const actual = utils.getRenewData(name, duration);

    expect(actual).to.eq(expected);
  });

  it('should parse addr register data', () => {
    const name = 'ilanolkies';
    const owner = '0x0000011111222223333344444555556666677777';
    const secret = '0x1234';
    const duration = web3.utils.toBN('1');
    const addr = '0x8888899999aaaaabbbbbcccccdddddeeeeefffff';

    const expected =
      web3.utils.sha3('register(string,address,bytes32,uint,address)').slice(0, 10) + // signature 4b
      '0000011111222223333344444555556666677777' + // address 20b - offest 4b
      '1234000000000000000000000000000000000000000000000000000000000000' + // secret 32b - offset 24b
      '0000000000000000000000000000000000000000000000000000000000000001' + // duration 32b - offset 56b
      '8888899999aaaaabbbbbcccccdddddeeeeefffff' + // addr 20b - offest 88b
      '696c616e6f6c6b696573'; // name - offset 108b

    const actual = utils.getAddrRegisterData(name, owner, secret, duration, addr);

    expect(actual).to.eq(expected);
  });
});
