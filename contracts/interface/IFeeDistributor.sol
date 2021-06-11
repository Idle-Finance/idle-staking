// SPDX-License-Identifier: Apache-2.0

pragma solidity =0.8.4;

// Interface for FeeDistributor.vy contract
interface IFeeDistributor {
    event CheckpointToken(uint256 time, uint256 tokens);

    function checkpoint_token() external;
    function burn(address) external;

    function toggle_allow_checkpoint_token() external;
    function can_checkpoint_token() external returns (bool);
    function token_last_balance() external returns (uint256);
}
