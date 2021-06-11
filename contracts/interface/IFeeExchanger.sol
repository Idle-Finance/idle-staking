pragma solidity =0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IFeeExchangerUpgradable {
    function inputToken() external returns (IERC20);
    function outputToken() external returns (IERC20);

    function outputAddress() external returns (address);

    event TokenExchanged(IERC20 indexed tokenIn, IERC20 tokenOut, uint256 amountIn, uint256 amountOut, string exchangeName);
    function exchange(uint256 amountIn, uint256 minAmountOut) external returns (uint256);

    function addExchanger(address exchanger) external;
    function removeExchanger(address exchanger) external;
    function canExchange(address exchanger) external returns (bool);
}