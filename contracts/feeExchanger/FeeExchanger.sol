// SPDX-License-Identifier: Apache-2.0

pragma solidity =0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';

import '../interface/IFeeExchanger.sol';

/**
 * @author Asaf Silman
 * @title FeeExchanger abstract implementation of IFeeExchanger
 * @notice This contract should be inherited by contracts specific to a DEX or exchange strategy for protocol fees.
 * @dev This contract implmenents the basic requirements for a feeExchanger.
 * @dev Contracts which inherit this are required to implmenent the `exchange` function
 */
abstract contract FeeExchanger is Initializable, OwnableUpgradeable, IFeeExchanger {
    using SafeERC20 for IERC20;

    IERC20 internal _inputToken;
    IERC20 internal _outputToken;

    address internal _outputAddress;

    // Keep an internal mapping of which addresses can exchange fees
    mapping(address => bool) private _canExchange;

    /**
     * @notice Initialises the FeeExchanger
     * @param inputToken_ The input ERC20 token representing fees
     * @param outputToken_ The output ERC20 token, fees will be exchanged into this currency
     * @param outputAddress_ Exchanged fees will be transfered to this address
     */
    function __FeeExchanger_init(IERC20 inputToken_, IERC20 outputToken_, address outputAddress_) internal initializer {       
        OwnableUpgradeable.__Ownable_init();
        
        _inputToken = inputToken_;
        _outputToken = outputToken_;

        _outputAddress = outputAddress_;
    }

    /**
     * 
     */
    modifier isExchanger() {
        require(_canExchange[msg.sender], "FE: NOT EXCHANGER");
        _;
    }

    function addExchanger(address exchanger) onlyOwner external override {
        require(!_canExchange[exchanger], "FE: ALREADY EXCHANGER");

        _canExchange[exchanger] = true;
    }
    function removeExchanger(address exchanger) onlyOwner external override {
        require(_canExchange[exchanger], "FE: NOT EXCHANGER");

        _canExchange[exchanger] = false;
    }
    
    function canExchange(address exchanger) external view override returns (bool) {
        return _canExchange[exchanger];
    }

    function updateOutputAddress(address newOutputAddress) onlyOwner external override {
        _outputAddress = newOutputAddress;
    }

    function inputToken() external view override returns (IERC20) { return _inputToken; }
    function outputToken() external view override returns (IERC20) { return _outputToken; }

    function outputAddress() external view override returns (address) { return _outputAddress; }
}