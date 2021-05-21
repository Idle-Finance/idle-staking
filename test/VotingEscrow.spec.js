const { expect } = require('chai')
const { ethers } = require('hardhat')
const { time } = require('@openzeppelin/test-helpers')

const toWei = ethers.utils.parseEther;
const toEtherBN = (x) => ethers.BigNumber.from(x.toString());

// distribute `amount` of `erc20` token to all `stakers`
const distributeTokenToAllStakers = async (erc20, stakers, amount='1000') => {
    stakers.map(async (staker) => {
        await erc20.transfer(staker.address, toWei(amount))
    })
}

// distribute `amount` of `erc20` token to the first `staker`
const distributeTokenToFirstStaker = async (erc20, stakers, amount='1000') => {
    erc20.transfer(stakers[0].address, toWei(amount))
    return stakers[0]
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
        async function getLockDuration(durationInYears) {
            let currentTime = await time.latest()
            return toEtherBN(currentTime.add(time.duration.years(durationInYears)))
        }

        let amount
        let staker
        let erc20AsStaker
        let veIdleAsStaker
        
        beforeEach(async () => {
            amount = toWei('1000')
            staker = await distributeTokenToFirstStaker(erc20, stakers)
            erc20AsStaker = await erc20.connect(staker)
            veIdleAsStaker = await veIdle.connect(staker)
            
            await erc20AsStaker.approve(veIdle.address, amount);
        })
        
        it('Transfers token to contract', async () => {
            expect(await veIdleAsStaker.create_lock(amount, await getLockDuration(1)))
                .to.changeTokenBalances(erc20, [staker, veIdle], [amount, -amount])
        })

        describe('When locking for 4 years', async () => {
            let lockEnd

            beforeEach(async () => {
                lockEnd = await getLockDuration(4)
                await veIdleAsStaker.create_lock(amount, lockEnd)
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
            it("Fails to withdraw before lock expires", async () => {
                expect(veIdleAsStaker.withdraw()).to.revertedWith("The lock didn't expire")
            })
            it("Can withdraw after lock expires", async () => {
                // Need to call checkpoint atleast once a year otherwise the contract becomes locked
                for (let i=0; i<4; i++) {
                    await time.increase(time.duration.years(1))
                    await veIdle.checkpoint()
                }

                expect(await veIdleAsStaker.withdraw()).to.changeTokenBalances(erc20, [staker, veIdle], [-amount, amount])
            })
        })
    })
})