# RSK Registrar

RNS Registrar for _rsk_ top level domain.<sup>1</sup>

## Contracts

The registrar is separated into several components for simplicity, modularity, and privilege minimization.

### RSK Owner

Owner of _rsk_ top level domain. It can `setSubdomainOwner` in RNS.

- It represents domain ownership implementing ERC-721<sup>1</sup> non-fungible token standard. This standard provides basic functionality to track and transfer NFTs<sup>2</sup>.
- Stores domains' expiration time. The expiration time determines wether a domain is owned or not.
- Determines if a domain is available to be purchased.
- Accepts domain ownership clamming from previous _rsk_ registrar.
- Grants access to other contracts for registering new domains (registrar role)<sup>2</sup>.
- Grants access to other contracts for renewing domains (renewer role)<sup>2</sup>.
- Allows to reclaim ownership in RNS of owned domains.
- It has an owner that can<sup>2</sup>
  - Change _rsk_ tld resolver and ttl.
  - Add/remove registrar contracts.
  - Add/remove renewer contracts.

MainNet: [0x45d3e4fb311982a06ba52359d44cb4f5980e0ef1](https://explorer.rsk.co/address/0x45d3e4fb311982a06ba52359d44cb4f5980e0ef1)

TestNet: [0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71](https://explorer.testnet.rsk.co/address/0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71)

### FIFS Registrar

Has registration role in `RSK Owner`.

- Defines a commit-reveal process to avoid front-running.
- Accepts payments via
  - ERC-20 `approve()` + `register()`.<sup>3</sup>
  - ERC-721 `transferAndCall()`.<sup>4</sup>
- Calculates price using `NamePrice` contract.
- It has an owner that can<sup>2</sup>
  - Set minimum commitment age.
  - Set minimum registration name length available.
  - Change name price contract.

The registration must be performed as follows:

0. Calculate `makeCommitment` hash of the domain to be registered (off-chain).
1. Commit the calculated hash using `commit`.
2. Wait `minCommitmentAge` seconds.
3. Execute registration via ERC-20 (with approval) or ERC-677.

> Find `transferAndCall()` encoder in `utils/index.js`, `getRegisterData`

MainNet: [0x779195c53cc7c1a33bd2eea5f63f2c1da8798d61](https://explorer.rsk.co/address/0x779195c53cc7c1a33bd2eea5f63f2c1da8798d61)

TestNet: [0x36ffda909f941950a552011f2c50569fda14a169](https://explorer.testnet.rsk.co/address/0x36ffda909f941950a552011f2c50569fda14a169)

### FIFS Addr Registrar

Has registration role in `RSK Owner`.

- Adds an extra functionality to FIFS Registrar: set address resolution in registration transaction.

The registration must be performed following FIFS Registrar steps, adding address resolution in the last step.

> Find `transferAndCall()` encoder in `utils/index.js`, `getAddrRegisterData`

MainNet: [0xd9c79ced86ecf49f5e4a973594634c83197c35ab](https://explorer.rsk.co/address/0xd9c79ced86ecf49f5e4a973594634c83197c35ab)

TestNet: [0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d](https://explorer.testnet.rsk.co/address/0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d)

### Name Price

Determines the price of a domain.

| Years | Price |
| - | - |
| 1 | 2 RIF |
| 2 | 4 RIF |
| 2+k | 4+k RIF |

> For example, 5 years cost 7 RIF.

MainNet: [0xd09adf13e482928e47e96dd6f02aad1daf7a5a47](https://explorer.rsk.co/address/0x779195c53cc7c1a33bd2eea5f63f2c1da8798d61)

TestNet: [0x794f99f1a9382ba88b453ddb4bfa00acae8d50e8](https://explorer.testnet.rsk.co/address/0x36ffda909f941950a552011f2c50569fda14a169)

### Renewer

Has renewer role in `RSK Owner`.

- Accepts payments via
  - ERC-20 `approve()` + `register()`.<sup>3</sup>
  - ERC-721 `transferAndCall()`.<sup>4</sup>
- Calculates price using `NamePrice` contract.
- It has an owner that can<sup>2</sup> change name price contract.

MainNet: [0x7a9872a7615c475b62a62b8f6e491077fb05f663](https://explorer.rsk.co/address/0x7a9872a7615c475b62a62b8f6e491077fb05f663)

TestNet: [0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b](https://explorer.testnet.rsk.co/address/0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b)

## Setup

```
npm install
```

## Run tests

```
truffle test
slither .
```

> Get truffle: https://www.trufflesuite.com/
> Get slither:https://github.com/crytic/slither

## Import contracts

```
npm i @rsksmart/rns-rskregistrar
```

## References

1. Strongly based on https://github.com/ensdomains/ethregistrar.
2. https://github.com/OpenZeppelin/openzeppelin-contracts implementation.
3. https://eips.ethereum.org/EIPS/eip-20
4. https://github.com/ethereum/EIPs/issues/677
