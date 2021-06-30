// SPDX-License-Identifier: Apache-2.0

pragma solidity=0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IVotingEscrow {
    function create_lock(uint256, uint256) external;
}

contract MockStakerContract {
    IERC20 private _stakingToken;
    IVotingEscrow private _votingEscrow;

    uint256 constant DAY = 86400;

    constructor(IERC20 stakingToken, IVotingEscrow votingEscrow) {
        _stakingToken = stakingToken;
        _votingEscrow = votingEscrow;
    }

    function create_lock(uint256 amount, uint256 unlockTime) external {
        _stakingToken.approve(address(_votingEscrow), amount);

        _votingEscrow.create_lock(amount, unlockTime);
    }
} 