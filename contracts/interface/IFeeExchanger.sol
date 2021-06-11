// SPDX-License-Identifier: Apache-2.0

pragma solidity =0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @author Asaf Silman
 * @title Interface for a FeeExchanger
 * @dev This interface should be implemented to swap fees generated from a protocol via a DEX
 */
interface IFeeExchanger {
    function inputToken() external returns (IERC20);
    function outputToken() external returns (IERC20);

    event OutputAddressUpdated(address previousAddress, address newAddress);
    function updateOutputAddress(address) external;
    function outputAddress() external returns (address);

    event TokenExchanged(IERC20 indexed tokenIn, IERC20 tokenOut, uint256 amountIn, uint256 amountOut, string exchangeName);
    function exchange(uint256 amountIn, uint256 minAmountOut) external returns (uint256);

    event ExchangerUpdated(address indexed exchanger, bool canExchange);
    function addExchanger(address exchanger) external;
    function removeExchanger(address exchanger) external;
    function canExchange(address exchanger) external returns (bool);
}
