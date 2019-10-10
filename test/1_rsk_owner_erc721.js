const RSKOwner = artifacts.require('RSKOwner');

const assert = require('assert');

contract('RSKOwner - ERC-721', async () => {
  let rskOwner;

  beforeEach(async () => {
    rskOwner = await RSKOwner.new();
  });

  it('should implement ERC-721 interface', async () => {
    const interfaceId = '0x80ac58cd';

    const supportsInterface = await rskOwner.supportsInterface(interfaceId);

    assert(supportsInterface);
  });
});
