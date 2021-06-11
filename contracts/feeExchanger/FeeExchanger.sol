// SPDX-License-Identifier: Apache-2.0

pragma solidity =0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';

import '../interface/IFeeExchanger.sol';

/**
 * @author Asaf Silman
 * @title FeeExchanger Implementation
 * @notice This contract should be inherited by contracts specific to a DEX or exchange strategy for protocol fees.
 * @dev This contract implmenents the basic requirements for a feeExchanger.
 * @dev Contracts which inherit this are required to implmenent the `exchange` function.
 */
abstract contract FeeExchanger is Initializable, OwnableUpgradeable, IFeeExchanger {
    using SafeERC20 for IERC20;

    IERC20 internal _inputToken;
    IERC20 internal _outputToken;

    address internal _outputAddress;

    // Keep an internal mapping of which addresses can exchange fees
    mapping(address => bool) private _canExchange;

    /**
     * @notice Initialises the FeeExchanger.
     * @param inputToken_ The input ERC20 token representing fees.
     * @param outputToken_ The output ERC20 token, fees will be exchanged into this currency.
     * @param outputAddress_ Exchanged fees will be transfered to this address.
     */
    function __FeeExchanger_init(IERC20 inputToken_, IERC20 outputToken_, address outputAddress_) internal initializer {       
        OwnableUpgradeable.__Ownable_init();
        
        _inputToken = inputToken_;
        _outputToken = outputToken_;

        _outputAddress = outputAddress_;

        emit OutputAddressUpdated(address(0), _outputAddress);
    }

    /**
     * @notice Modifier to check if msg.sender can exchange.
     */
    modifier isExchanger() {
        require(_canExchange[msg.sender], "FE: NOT EXCHANGER");
        _;
    }

    /**
     * @notice Adds an address as an exchanger.
     * @dev Exchangers have permission to exchange funds via the `exchange` function.
     * @dev This method can only be called by the owner.
     * @param exchanger The address of the exchanger.
     */
    function addExchanger(address exchanger) onlyOwner external override {
        require(!_canExchange[exchanger], "FE: ALREADY EXCHANGER");

        _canExchange[exchanger] = true;

        emit ExchangerUpdated(exchanger, true);
    }

    /**
     * @notice Removed an address as an exchanger.
     * @dev This method can only be called by the owner.
     * @param exchanger The address of the exchanger.
     */
    function removeExchanger(address exchanger) onlyOwner external override {
        require(_canExchange[exchanger], "FE: NOT EXCHANGER");

        _canExchange[exchanger] = false;

        emit ExchangerUpdated(exchanger, false);
    }
    
    /**
     * @notice Check if an address is an exchanger.
     * @dev This is a view method to use with tools such as etherscan.
     * @param exchanger The address of the exchanger.
     * @return Boolean whether address is exchanger
     */
    function canExchange(address exchanger) external view override returns (bool) {
        return _canExchange[exchanger];
    }

    /**
     * @notice Update the ouput address.
     * @dev Fees which have been swapped will be sent to the new address after this has been called.
     * @dev address(0) is not checked in for newOutputAddress.
     * @param newOutputAddress The new address to send swapped fees to.
     */
    function updateOutputAddress(address newOutputAddress) onlyOwner external override {
        emit OutputAddressUpdated(_outputAddress, newOutputAddress);
        
        _outputAddress = newOutputAddress;
    }

    /**
     * @notice Return the input token address.
     * @return Input token address.
     */
    function inputToken() external view override returns (IERC20) { return _inputToken; }

    /**
     * @notice Return the ouput token address.
     * @return Output token address.
     */
    function outputToken() external view override returns (IERC20) { return _outputToken; }

    /**
     * @notice Return the output address.
     * @return Output address.
     */
    function outputAddress() external view override returns (address) { return _outputAddress; }
}
