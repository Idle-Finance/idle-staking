const { HardwareSigner } = require("../lib/hardware-signer")

module.exports = async ({getNamedAccounts, getChainId, deployments, ethers}) => {
  const { deploy } = deployments
  const { idle } = await getNamedAccounts()
  
  let signer
  let chainId = await getChainId()
  switch (chainId) {
    case '1':
      // mainnet deployment configuration
      signer = new HardwareSigner(ethers.provider, null, "m/44'/60'/0'/0/0"); break
    case '42':
      // kovan deployment configuration
      signer = new HardwareSigner(ethers.provider, null, "m/44'/60'/0'/42/0"); break
    case '1337':
      // kovan deployment configuration
      signer = new HardwareSigner(ethers.provider, null, "m/44'/60'/0'/1337/0"); break
    default:
      signer = (await ethers.getSigners())[0]
  }

  console.log(await signer.getAddress())

  let idleAddress
  if (idle==null) {
    // on test networks deploy mockIDLE
    let receipt = await deploy("IDLE", {
      from: signer.address,
      args: ['IDLE', 'IDLE', ethers.utils.parseEther('1000')],
      contract: "ERC20Mock"
    })
    idleAddress = receipt.address
  }
  else {
    idleAddress = idle
  }

  await deploy('VotingEscrow', {
    from: signer.address,
    args: [idleAddress, 'Staked IDLE', 'stkIDLE', '1.0'],
    log: true
  })
}
