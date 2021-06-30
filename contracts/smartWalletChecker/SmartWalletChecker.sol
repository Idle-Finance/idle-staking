// SPDX-License-Identifier: Apache-2.0

pragma solidity =0.8.4;

import '@openzeppelin/contracts/access/Ownable.sol';

/**
 * @author Asaf Silman
 * @title Smart Wallet Checker interface
 * @notice Basic smart wallet checker interface for VotingEscrow
 */
interface ISmartWalletChecker {
    function check(address addr) external view returns (bool);
}

/**
 * @author Asaf Silman
 * @title Smart Wallet Checker implementation.
 * @notice Checks if an address is approved for staking.
 * @dev This is a basic implementation using a mapping for address => bool.
 * @dev This contract does not check if the address is a contract or not.
 */
contract SmartWalletChecker is Ownable, ISmartWalletChecker {
    mapping(address => bool) private _enabledAddresses;

    /**
     * @notice Enables an address 
     * @dev only callable by owner.
     * @dev This does not check if the address is actually a smart contract or not.
     * @param addr The contract address to enable.
     */
    function enableAddress(address addr) external onlyOwner {
        _enabledAddresses[addr] = true;
    }

    /**
     * @notice Disables an address 
     * @dev only callable by owner.
     * @param addr The contract address to disable.
     */
    function disableAddress(address addr) external onlyOwner {
        _enabledAddresses[addr] = false;
    }

    /**
     * @notice Check an address
     * @dev This method will be called by the VotingEscrow contract.
     * @param addr The contract address to check.
     */
    function check(address addr) external override view returns (bool) {
        return _enabledAddresses[addr];
    }
}
