const { expect } = require('chai')
const { ethers } = require('hardhat')
const { time } = require('@openzeppelin/test-helpers')

const toWei = ethers.utils.parseEther;
const toEtherBN = (x) => ethers.BigNumber.from(x.toString());

// distribute `amount` of `erc20` token to the first `staker`
const distributeTokenToFirstStaker = async (erc20, stakers, amount='1000') => {
    erc20.transfer(stakers[0].address, toWei(amount))
    return stakers[0]
}

async function getLockDuration(durationInYears) {
    let currentTime = await time.latest()
    return toEtherBN(currentTime.add(time.duration.years(durationInYears)))
}

describe("VotingEscrow", () => {
    let deployer
    let stakers

    let erc20
    let veIdle

    let WEEK = 7 * 86400 // 1 week in seconds
    let MAX_LOCKTIME = 4 * 365 * 86400 // 4 years in seconds

    beforeEach(async () => {
        [deployer, ...stakers] = await ethers.getSigners()
        erc20 = await (await ethers.getContractFactory("ERC20Mock")).deploy("Idle", "IDLE", toWei("20000"))

        veIdle = await (await ethers.getContractFactory("VotingEscrow")).deploy(
            erc20.address,
            "Staked Idle",
            "stkIdle",
            "1.0"
        )
    })
    describe("#__init__", async () => {
        it("Should set controller as deployer", async  () => {
            expect(await veIdle.controller()).to.equal(deployer.address)
        })
        it("Should set admin as deployer", async () => {
            expect(await veIdle.admin()).to.equal(deployer.address)
        })
        it("Should set staking token correctly", async () => {
            expect(await veIdle.token()).to.equal(erc20.address)
        })
        it("Should set token name correctly", async () => {
            expect(await veIdle.name()).to.equal("Staked Idle")
        })
        it("Should set token symbol correctly", async () => {
            expect(await veIdle.symbol()).to.equal("stkIdle")
        })
    })

    describe('#create_lock()', async () => {
        let amount
        let staker
        
        beforeEach(async () => {
            amount = toWei('1000')
            staker = await distributeTokenToFirstStaker(erc20, stakers)
            
            await erc20.connect(staker).approve(veIdle.address, amount);
        })
        
        it('Transfers token to contract', async () => {
            // Verify staker balance REDUCES, and contract balance INCREASES 
            expect(await veIdle.connect(staker).create_lock(amount, getLockDuration(1)))
                .to.changeTokenBalances(erc20, [staker, veIdle], [amount, -amount])
        })

        describe('When locking for 4 years', async () => {
            let lockEnd

            beforeEach(async () => {
                lockEnd = await getLockDuration(4)
                await veIdle.connect(staker).create_lock(amount, lockEnd)
            })

            it("Increases supply", async () => {
                expect(await veIdle.supply()).to.equal(amount)
            })
            it("Creates a LockedBalance", async() => {
                let [stakedAmount, end] = await veIdle.locked(staker.address)
                
                expect(stakedAmount).to.equal(amount)
                expect(end).to.be.closeTo(lockEnd, WEEK)
            })
            it("Updates staked balance", async () => {
                let stakedBalance = await veIdle['balanceOf(address)'](staker.address)
                expect(stakedBalance).to.be.closeTo(amount, toWei('10'))
            })
        })
    })

    describe('#withdraw()', async () => {
        describe("When supply > 0", async () => {
            let amount
            let staker

            beforeEach(async () => {
                amount = toWei('1000')

                staker = await distributeTokenToFirstStaker(erc20, stakers)
                await erc20.connect(staker).approve(veIdle.address, amount);
                await veIdle.connect(staker).create_lock(amount, getLockDuration(1))
            })

            it("Reverts when withdrawing before lock expires", async () => {
                expect(veIdle.connect(staker).withdraw()).to.revertedWith("The lock didn't expire")
            })
            it("Can withdraw after lock expires", async () => {
                // Need to call checkpoint atleast once a year otherwise the contract becomes locked
                await time.increase(time.duration.years(1))

                // token is transfered from contract to staker
                expect(await veIdle.connect(staker).withdraw()).to.changeTokenBalances(erc20, [staker, veIdle], [-amount, amount])
            })
        })
    })
})