const { ethers } = require("hardhat")
const { time } = require('@openzeppelin/test-helpers')

const toEtherBN = (x) => ethers.BigNumber.from(x.toString());

async function main() {
    let [account] = await ethers.getSigners()

    let veCrv = await ethers.getContractFactory("VotingEscrow", account)

    let weeks = [0,1,2,3,4,5,6,7,8,9,10].map(x => x*26) // half year in weeks
    for (const week of weeks) {
        await time.increase(time.duration.weeks(week))

        let fullBlock = toEtherBN("15000000")
        let tx = await veCrv.checkpoint({gasLimit: fullBlock})
        let receipt = await tx.wait()
        let gasUsed = receipt.gasUsed

        let blockPct = gasUsed.mul('100').div(fullBlock)
        console.log(`Waited ${week} weeks. Gas used: ${gasUsed}. Block pct ${blockPct} %`)
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch(error => {
  console.error(error);
  process.exit(1);
});