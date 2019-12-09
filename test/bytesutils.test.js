const BytesUtils = artifacts.require('BytesUtils');

const expect = require('chai').expect;
const helpers = require('@openzeppelin/test-helpers');

contract('BytesUtils - bytes to', async () => {
  let bytes;

  beforeEach(async () => {
    bytes = await BytesUtils.new();
  });

  describe('address', async () => {
    it('should convert bytes to address', async () => {
      const input = '0x0123456789012345678901234567890123456889';

      const output = await bytes.toAddress(input, web3.utils.toBN(0));

      const expected = '0x0123456789012345678901234567890123456889';

      expect(output).to.eq(expected);
    });

    it('should convert bytes to address with offset', async () => {
      const input = '0x000000000123456789012345678901234567890123456889';

      const output = await bytes.toAddress(input, web3.utils.toBN(4));

      const expected = '0x0123456789012345678901234567890123456889';

      expect(output).to.eq(expected);
    });

    it('should convert bytes to address with larger input', async () => {
      const input = '0x01234567890123456789012345678901234568890000000000000000';

      const output = await bytes.toAddress(input, web3.utils.toBN(0));

      const expected = '0x0123456789012345678901234567890123456889';

      expect(output).to.eq(expected);
    });

    it('should convert bytes to address with offset and larger input', async () => {
      const input = '0x00000000012345678901234567890123456789012345688900000000';

      const output = await bytes.toAddress(input, web3.utils.toBN(4));

      const expected = '0x0123456789012345678901234567890123456889';

      expect(output).to.eq(expected);
    });

    it('should fail to convert bytes to address - short input', async () => {
      const input = '0x012345678901234567890123456789';

      await helpers.expectRevert(bytes.toAddress(input, web3.utils.toBN(0)), 'Short input');
    });

    it('should not allow to overflow offset', async () => {
      const input = '0x0123456789012345678901234567890123456889';

      await helpers.expectRevert(
        bytes.toAddress(input, helpers.constants.MAX_UINT256),
        'SafeMath: addition overflow'
      );
    });
  });

  describe('bytes32', async () => {
    it('should convert bytes to bytes32', async () => {
      const input = '0x0000000000000000000000000000000000000000000000000000000000001234';

      const output = await bytes.toBytes32(input, web3.utils.toBN(0));

      const expected = '0x0000000000000000000000000000000000000000000000000000000000001234';

      expect(output).to.eq(expected);
    });

    it('should convert bytes to bytes32 with offset', async () => {
      const input = '0x123456780000000000000000000000000000000000000000000000000000000000001234';

      const output = await bytes.toBytes32(input, web3.utils.toBN(4));

      const expected = '0x0000000000000000000000000000000000000000000000000000000000001234';

      expect(output).to.eq(expected);
    });

    it('should convert bytes to bytes32 with larger input', async () => {
      const input = '0x000000000000000000000000000000000000000000000000000000000000123400000000';

      const output = await bytes.toBytes32(input, web3.utils.toBN(0));

      const expected = '0x0000000000000000000000000000000000000000000000000000000000001234';

      expect(output).to.eq(expected);
    });

    it('should convert bytes to bytes32 with offset and larger input', async () => {
      const input = '0x12345678000000000000000000000000000000000000000000000000000000000000123400000000';

      const output = await bytes.toBytes32(input, web3.utils.toBN(4));

      const expected = '0x0000000000000000000000000000000000000000000000000000000000001234';

      expect(output).to.eq(expected);
    });

    it('should fail to convert bytes to bytes32 - short input', async () => {
      const input = '0x00000000000000000000000000000000000000000000000000001234';

      await helpers.expectRevert(bytes.toBytes32(input, web3.utils.toBN(0)), 'Short input');
    });

    it('should not allow to overflow offset', async () => {
      const input = '0x0000000000000000000000000000000000000000000000000000000000001234';

      await helpers.expectRevert(
        bytes.toAddress(input, helpers.constants.MAX_UINT256),
        'SafeMath: addition overflow'
      );
    });
  });

  describe('bytes4', async () => {
    it('should convert bytes to bytes4', async () => {
      const input = '0x01234567';

      const output = await bytes.toBytes4(input, web3.utils.toBN(0));

      const expected = '0x01234567';

      expect(output).to.eq(expected);
    });

    it('should convert bytes to bytes4 with offset', async () => {
      const input = '0x1234567801234567';

      const output = await bytes.toBytes4(input, web3.utils.toBN(4));

      const expected = '0x01234567';

      expect(output).to.eq(expected);
    });

    it('should convert bytes to bytes4 with larger input', async () => {
      const input = '0x0123456789abcdef';

      const output = await bytes.toBytes4(input, web3.utils.toBN(0));

      const expected = '0x01234567';

      expect(output).to.eq(expected);
    });

    it('should convert bytes to bytes4 with offset and larger input', async () => {
      const input = '0x123456780123456789abcdef';

      const output = await bytes.toBytes4(input, web3.utils.toBN(4));

      const expected = '0x01234567';

      expect(output).to.eq(expected);
    });

    it('should fail to convert bytes to bytes4 - short input', async () => {
      const input = '0x1234';

      await helpers.expectRevert(bytes.toBytes4(input, web3.utils.toBN(0)), 'Short input');
    });

    it('should not allow to overflow offset', async () => {
      const input = '0x01234567';

      await helpers.expectRevert(
        bytes.toAddress(input, helpers.constants.MAX_UINT256),
        'SafeMath: addition overflow'
      );
    });
  });

  describe('uint', async () => {
    it('should convert bytes to uint', async () => {
      const input = '0x0000000000000000000000000000000000000000000000000000000000001234';

      const output = await bytes.toUint(input, web3.utils.toBN(0));

      const expected = web3.utils.toBN(4660);

      expect(output).to.be.bignumber.equal(expected);
    });

    it('should convert bytes to uint with offset', async () => {
      const input = '0x123456780000000000000000000000000000000000000000000000000000000000001234';

      const output = await bytes.toUint(input, web3.utils.toBN(4));

      const expected = web3.utils.toBN(4660);

      expect(output).to.be.bignumber.equal(expected);
    });

    it('should convert bytes to uint with larger input', async () => {
      const input = '0x000000000000000000000000000000000000000000000000000000000000123400000000';

      const output = await bytes.toUint(input, web3.utils.toBN(0));

      const expected = web3.utils.toBN(4660);

      expect(output).to.be.bignumber.equal(expected);
    });

    it('should convert bytes to uint with offset and larger input', async () => {
      const input = '0x12345678000000000000000000000000000000000000000000000000000000000000123400000000';

      const output = await bytes.toUint(input, web3.utils.toBN(4));

      const expected = web3.utils.toBN(4660);

      expect(output).to.be.bignumber.equal(expected);
    });

    it('should fail to convert bytes to uint - short input', async () => {
      const input = '0x00000000000000000000000000000000000000000000000000001234';

      await helpers.expectRevert(bytes.toUint(input, web3.utils.toBN(0)), 'Short input');
    });

    it('should not allow to overflow offset', async () => {
      const input = '0x0000000000000000000000000000000000000000000000000000000000001234';

      await helpers.expectRevert(
        bytes.toAddress(input, helpers.constants.MAX_UINT256),
        'SafeMath: addition overflow'
      );
    });
  });

  describe('string', async () => {
    it('should convert bytes to string', async () => {
      const input = '0x696c616e6f6c6b696573';

      const output = await bytes.methods['toString(bytes,uint256,uint256)'](input, web3.utils.toBN(0), web3.utils.toBN(10));

      const expected = 'ilanolkies';

      expect(output).to.eq(expected);
    });

    it('should convert bytes to string with offset', async () => {
      const input = '0x00000000696c616e6f6c6b696573';

      const output = await bytes.methods['toString(bytes,uint256,uint256)'](input, web3.utils.toBN(4), web3.utils.toBN(10));

      const expected = 'ilanolkies';

      expect(output).to.eq(expected);
    });

    it('should convert bytes to string with larger input', async () => {
      const input = '0x696c616e6f6c6b69657300000000';

      const output = await bytes.methods['toString(bytes,uint256,uint256)'](input, web3.utils.toBN(0), web3.utils.toBN(10));

      const expected = 'ilanolkies';

      expect(output).to.eq(expected);
    });

    it('should convert bytes to string with offset and larger input', async () => {
      const input = '0x00000000696c616e6f6c6b69657300000000';

      const output = await bytes.methods['toString(bytes,uint256,uint256)'](input, web3.utils.toBN(4), web3.utils.toBN(10));

      const expected = 'ilanolkies';

      expect(output).to.eq(expected);
    });

    it('should fail to convert bytes to string - short input', async () => {
      const input = '0x0123456789';

      await helpers.expectRevert(bytes.methods['toString(bytes,uint256,uint256)'](input, web3.utils.toBN(0), web3.utils.toBN(10)), 'Short input');
    });

    it('should fail to convert bytes to string - empty input', async () => {
      const input = '0x';

      await helpers.expectRevert(bytes.methods['toString(bytes,uint256,uint256)'](input, web3.utils.toBN(0), web3.utils.toBN(10)), 'Short input');
    });

    it('should not allow to overflow offset', async () => {
      const input = '0x696c616e6f6c6b696573';

      await helpers.expectRevert(
        bytes.toAddress(input, helpers.constants.MAX_UINT256),
        'SafeMath: addition overflow'
      );
    });
  });
});
