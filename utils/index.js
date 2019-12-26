function numberToUint32 (number) {
  const hexDuration = web3.utils.numberToHex(number);
  let _duration = '';
  for (let i = 0; i < 66 - hexDuration.length; i++) {
    _duration += '0';
  }
  _duration += hexDuration.slice(2);
  return _duration;
}

function utf8ToHexString (string) {
  return string ? web3.utils.asciiToHex(string).slice(2) : '';
}

/**
 * registration with rif transferAndCall encoding
 * @param {string} name to register
 * @param {address} owner of the new name
 * @param {hex} secret of the commit
 * @param {BN} duration to register in years
 */
function getRegisterData (name, owner, secret, duration) {
  // 0x + 4 bytes
  const _signature = '0xc2c414c8';

  // 20 bytes
  const _owner = owner.toLowerCase().slice(2);

  // 32 bytes
  let _secret = secret.slice(2);
  let padding = 64 - _secret.length;
  for (let i = 0; i < padding; i++) {
    _secret += '0';
  }

  // 32 bytes
  _duration = numberToUint32(duration);

  // variable length
  const _name = utf8ToHexString(name);

  return `${_signature}${_owner}${_secret}${_duration}${_name}`;
};

function getRenewData (name, duration) {
  // 0x + 4 bytes
  const _signature = '0x14b1a4fc';

  // 32 bytes
  _duration = numberToUint32(duration);

  // variable length
  const _name = utf8ToHexString(name);

  return `${_signature}${_duration}${_name}`;
}

module.exports = {
  getRegisterData,
  getRenewData,
};
