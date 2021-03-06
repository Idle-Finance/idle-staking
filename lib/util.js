const { HardwareSigner } = require("./hardware-signer")
const { ethers, deployments, upgrades } = require('hardhat');
const { time } = require('@openzeppelin/test-helpers')

async function getNetworkSigner() {
  let network = await ethers.provider.getNetwork()

  let signer
  switch (network.chainId) {
    case 1:
      // mainnet deployment configuration
      signer = new HardwareSigner(ethers.provider, null, "m/44'/60'/0'/0/0"); break
    case 42:
      // kovan deployment configuration
      signer = new HardwareSigner(ethers.provider, null, "m/44'/60'/0'/42/0"); break
    case 1337:
      // local deployment configuration
      signer = new HardwareSigner(ethers.provider, null, "m/44'/60'/0'/0/0"); break
    default:
      signer = (await ethers.getSigners())[0]
  }

  return signer
}

async function deployAndSave(name, contractName, args, usingUpgrades=false, override=false) {
  const { getArtifact, save } = deployments
  signer = await getNetworkSigner()

  let contractArtifact = await getArtifact(contractName)
  let factory = await ethers.getContractFactory(
    contractArtifact.abi,
    contractArtifact.bytecode,
    signer
  )

  // contract already previously deployed
  if (await ethers.getContractOrNull(name) != null && !override) {
    let contract = await ethers.getContract(name)
    console.log(`Contract ${name} already deployed (${contract.address}). Skipping deploy`)

    return contract
  }

  console.log(`Deploying  '${contractName}' with name ${name} to chainId ${ethers.provider.network.chainId} with deployer (${await signer.getAddress()})`)
  let contract, receipt
  if (usingUpgrades) {
    console.log('Using openzeppelin `deployProxy` to deploy contract')
    contract = await upgrades.deployProxy(factory, args)
    receipt = await contract.deployTransaction.wait()
  }
  else {
    contract = await factory.deploy(...args)
    receipt = await contract.deployTransaction.wait()
  }
  

  // reference https://github.com/wighawag/hardhat-deploy/blob/c977d223297a84b12f33a8f396c0152a9516ff69/types.ts#L275
  let deploymentInfo = {
    abi: contractArtifact.abi,
    address: contract.address,
    receipt: receipt,
    transactionHash: receipt.transactionHash
  }

  save(name, deploymentInfo)
  console.log(`Deployed '${contractName}' to ${contract.address} @ tx ${receipt.transactionHash}`)

  return contract
}

async function disableFork() {
  await network.provider.request({
    method: "hardhat_reset",
    params: []
  })
}

async function advanceBlocks(n) {
  for (var i = 0; i < n; i++) {
    if (i === 0 || i % 100 === 0) {
      process.stdout.clearLine();  // clear current text
      process.stdout.cursorTo(0);
      process.stdout.write(`waiting for ${n - i} blocks...`);
    }

    await time.advanceBlock();
  }
  process.stdout.write("\n")
}

module.exports = {
  deployAndSave,
  getNetworkSigner,
  disableFork,
  advanceBlocks
}