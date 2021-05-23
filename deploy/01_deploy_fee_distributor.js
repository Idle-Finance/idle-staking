const { deployAndSave } = require("../lib/util")

module.exports = async ({ethers, network}) => {
  console.log(`------------------ Executing deployment 01 on network ${network.name} ------------------`)
  console.log()

  let stakedIdle = await ethers.getContract('StakedIdle')
  console.log(`StakedIDLE is at ${stakedIdle.address}`)

  console.log()
}
