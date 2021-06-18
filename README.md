# IDLE Staking Contracts

This repo contains the idle single token staking smart contracts. The staking contracts are based on the curve staking contracts and are located under `./contracts/curve/`. These contracts have been slightly modified to be compatiable with the idle token.

Idle tokens which have been staked are vote delegated to the [idle staking multisig](https://gnosis-safe.io/app/#/safes/0xb08696Efcf019A6128ED96067b55dD7D0aB23CE4/balances).

## Deployed Addresses
- stkIDLE - 0xaac13a116ea7016689993193fce4badc8038136f
- feeDistributor - 0xbabb82456c013fd7e3f25857e0729de8207f80e2
- feeExchangerProxyAdmin - 0x6ba1dacc73a8fbb2f4f85361a374257dd5d7d0fa
- feeExchangerImp - 0x8fa248e22655622581be74484b92b01207ce1905
- feeExchanger - 0x1594375eee2481ca5c1d2f6ce15034816794e8a3
- Staking Multisig - 0xb08696efcf019a6128ed96067b55dd7d0ab23ce4

## Installation
1. `npm install -i`
2. Create `.env` file from `.env.template`

## Running Unit Tests
`npx hardhat test`


## Running Integration Tests
`npx hardhat run scripts/<scriptname>`

## Deployment
`npx hardhat deploy --network <network_name>`
