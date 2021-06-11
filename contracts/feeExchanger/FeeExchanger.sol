pragma solidity =0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';

import '../interface/IFeeExchanger.sol';

abstract contract FeeExchanger is Initializable, OwnableUpgradeable, IFeeExchangerUpgradable {
    IERC20 internal _inputToken;
    IERC20 internal _outputToken;

    address internal _outputAddress;

    mapping(address => bool) private _canExchange;

    function __FeeExchanger_init(IERC20 inputToken_, IERC20 outputToken_, address outputAddress_) internal initializer {
        OwnableUpgradeable.__Ownable_init();
        
        _inputToken = inputToken_;
        _outputToken = outputToken_;

        _outputAddress = outputAddress_;
    }

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

    function inputToken() external view override returns (IERC20) { return _inputToken; }
    function outputToken() external view override returns (IERC20) { return _outputToken; }

    function outputAddress() external view override returns (address) { return _outputAddress; }
}