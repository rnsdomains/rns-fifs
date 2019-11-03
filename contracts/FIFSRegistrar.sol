pragma solidity ^0.5.3;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract FIFSRegistrar is Ownable {
    using SafeMath for uint256;

    mapping (bytes32 => uint) private commitmentRevealTime;
    uint public minCommitmentAge = 1 minutes;

    function makeCommitment (bytes32 label, address nameOwner, bytes32 secret) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(label, nameOwner, secret));
    }

    function commit(bytes32 commitment) external {
        commitmentRevealTime[commitment] = now.add(minCommitmentAge);
    }

    function canReveal(bytes32 commitment) public view returns (bool) {
        uint revealTime = commitmentRevealTime[commitment];
        return 0 < revealTime && revealTime <= now;
    }

    function register(string calldata name, address nameOwner, bytes32 secret, uint /*duration*/) external view {
        bytes32 label = keccak256(abi.encodePacked(name));
        bytes32 commitment = makeCommitment(label, nameOwner, secret);
        require(canReveal(commitment), "No commitment found");
    }

    function setMinCommitmentAge (uint newMinCommitmentAge) external onlyOwner {
        minCommitmentAge = newMinCommitmentAge;
    }
}
