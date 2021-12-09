const chalk = require('chalk')

function dim() {
  if (!process.env.HIDE_DEPLOY_LOG) {
    console.log(chalk.dim.call(chalk, ...arguments))
  }
}

function cyan() {
  if (!process.env.HIDE_DEPLOY_LOG) {
    console.log(chalk.cyan.call(chalk, ...arguments))
  }
}

function yellow() {
  if (!process.env.HIDE_DEPLOY_LOG) {
    console.log(chalk.yellow.call(chalk, ...arguments))
  }
}

function green() {
  if (!process.env.HIDE_DEPLOY_LOG) {
    console.log(chalk.green.call(chalk, ...arguments))
  }
}

function displayResult(name, result) {
  if (!result.newlyDeployed) {
    yellow(`Re-used existing ${name} at ${result.address}`)
  } else {
    green(`${name} deployed at ${result.address}`)
  }
}

const chainName = (chainId) => {
  switch(chainId) {
    case 1: return 'Mainnet';
    case 3: return 'Ropsten';
    case 4: return 'Rinkeby';
    case 5: return 'Goerli';
    case 42: return 'Kovan';
    case 56: return 'Binance Smart Chain';
    case 77: return 'POA Sokol';
    case 97: return 'Binance Smart Chain (testnet)';
    case 99: return 'POA';
    case 100: return 'xDai';
    case 137: return 'Matic';
    case 31337: return 'HardhatEVM';
    case 80001: return 'Matic (Mumbai)';
    default: return 'Unknown';
  }
}

module.exports = async (hardhat) => {
  // Edit this 
  const revocable = true;
  const tokenAddress = "";
  const totalAmount = 2000000;
  const start = 1739060000;
  const cliff = 60*60*24*30*9;
  const duration = 60*60*24*30;
  const slicePerDuration = 1000;
  const wallets = ['' , '']; // [address1, address2 ..]
  const percentages = [5000, 5000]; // 50% / 50%

  const { getNamedAccounts, deployments, getChainId, ethers } = hardhat
  const { deploy } = deployments

  let {
    deployer
  } = await getNamedAccounts()
  const chainId = parseInt(await getChainId(), 10)
  // 31337 is unit testing, 1337 is for coverage
  const isTestEnvironment = chainId === 31337 || chainId === 1337

  dim("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
  dim("Vesting - Deploy Script")
  dim("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")

  dim(`network: ${chainName(chainId)} (${isTestEnvironment ? 'local' : 'remote'})`)
  dim(`deployer: ${deployer}`)
  
  const erc20 = await ethers.getContractFactory("IERC20")
  const erc20Contract = await erc20.attach(tokenAddress)

  cyan(`\nDeploying Vesting contract...`)
  const VestingResult = await deploy("Vesting", {
    from: deployer,
    args: [
        revocable,
        tokenAddress,
        totalAmount,
        start,
        cliff,
        duration,
        slicePerDuration,
        wallets,
        percentages
    ]
  })
  displayResult('Vesting', VestingResult)

  try {
    cyan(`\n Transfering ERC20 tokens to vesting contract...`)
    const res = await (await erc20Contract.transfer(VestingResult.address)).wait();
    green(`ERC20 transfer success \n Transaction hash: ${res.hash}`);
  } catch (e) {
      yellow('Transfer failed');
  }

  dim("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
  green("Contract Deployments Complete!")
  dim("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")

};
