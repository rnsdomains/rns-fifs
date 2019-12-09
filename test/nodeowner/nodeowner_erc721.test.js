const NodeOwner = artifacts.require('NodeOwner');

const assert = require('assert');

const ZERO_ADDRESS = require('@openzeppelin/test-helpers').constants.ZERO_ADDRESS;

contract('Node Owner - ERC-721', async () => {
  let nodeOwner;

  beforeEach(async () => {
    nodeOwner = await NodeOwner.new(
      ZERO_ADDRESS,
      '0x00',
    );
  });

  it('should implement ERC-721 interface', async () => {
    const interfaceId = '0x80ac58cd';

    const supportsInterface = await nodeOwner.supportsInterface(interfaceId);

    assert(supportsInterface);
  });
});
