pragma solidity ^0.5.3;

import "@openzeppelin/contracts/math/SafeMath.sol";

contract FIFSRegistrar {
    using SafeMath for uint256;

    mapping (bytes32 => uint) private commitmentRevealTime;

    function makeCommitment (bytes32 label, address _owner, bytes32 secret) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(label, _owner, secret));
    }

    function commit(bytes32 commitment) public {
        commitmentRevealTime[commitment] = now.add(1 minutes);
    }

    function canReveal(bytes32 commitment) public view returns (bool) {
        return now > commitmentRevealTime[commitment];
    }
}
