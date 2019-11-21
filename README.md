# RSK Registrar

RNS Registrar for _rsk_ top level domain.<sup>1</sup>

## Contracts

The registrar is separated into several components for simplicity, modularity, and privilege minimization.

### RSK Owner

Owner of _rsk_ top level domain. It can `setSubdomainOwner` in RNS.

- It represents domain ownership implementing ERC-721c<sup>1</sup> non-fungible token standard. This standard provides basic functionality to track and transfer NFTs<sup>2</sup>.
- Stores domains' expiration time. The expiration time determines wether a domain is owned or note.
- Determines if a domain is available to be purchased.
- Accepts domain ownership clamming from previous _rsk_ registrar.
- Grants access to other contracts for registering new domains (registrar role)<sup>2</sup>.
- Grants access to other contracts for renewing domains (renewer role)<sup>2</sup>.
- Allows to reclaim ownership in RNS of owned domains.
- It has an owner that can<sup>2</sup>
  - Change _rsk_ tld resolver and ttl.
  - Add/remove registrar contracts.
  - Add/remove renewer contracts.

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

> Find `transferAndCall()` encoder in `utils/index.js`

### Name Price

Determines the price of a domain.

| Years | Price |
| - | - |
| 1 | 2 RIF |
| 2 | 4 RIF |
| 2+k | 4+k RIF |

> For example, 5 years cost 7 RIF.

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

## References

1. Strongly based on https://github.com/ensdomains/ethregistrar.
2. https://github.com/OpenZeppelin/openzeppelin-contracts implementation.
3. https://eips.ethereum.org/EIPS/eip-20
4. https://github.com/ethereum/EIPs/issues/677