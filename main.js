const config = require("./config.json");
const networkId = config.networkId;
const networkRPC = config.networkRPC;
const networkName = config.networkName;
const privateKey = config.privateKey;
const user_address = config.userAddress;
const harvestThreshold = config.harvestThreshold;
const liquidityThreshold = config.liquidityThreshold;
const slipTolerance = config.slipTolerance;

const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3 = require('web3');
const provider = new HDWalletProvider(privateKey, networkRPC, 0, 2);
const web3 = new Web3(provider);

const TShareRewardPoolAddress = web3.utils.toChecksumAddress(config.TShareRewardPoolAddress);
const SpookyRouterAddress = web3.utils.toChecksumAddress(config.spookyRouterAddress);
const TombTokenAddress = web3.utils.toChecksumAddress(config.tombTokenAddress);
const TshareTokenAddress = web3.utils.toChecksumAddress(config.tshareTokenAddress);
const wFTMAddress = web3.utils.toChecksumAddress(config.wFTMAddress);
const SpookyFactoryAddress = web3.utils.toChecksumAddress(config.spookyFactoryAddress);
const FTMTOMBPair = web3.utils.toChecksumAddress(config.FTMTOMBPair);

const BigNumber = require('bignumber.js');
const providers = require('@ethersproject/providers');
const TShareRewardPoolABI = require('./abis/TShareRewardPool.json');
const SpookyRouterABI = require('./abis/SpookyRouter.json');
const SpookyFactoryABI = require('./abis/SpookyFactory.json');
const SpookyPairABI = require('./abis/SpookyPair.json');
const TombTokenABI = require('./abis/TombToken.json');
const TshareTokenABI = require('./abis/TshareToken.json');

var localProvider = new providers.JsonRpcProvider(networkRPC);
var coinName = "fantom";

function refreshStatus() {
	console.log("-".repeat(45));
	
	const TShareRewardPoolContract = new web3.eth.Contract(
		TShareRewardPoolABI,
		TShareRewardPoolAddress
	);

	return TShareRewardPoolContract.methods.pendingShare(0, user_address).call()
		.then( pendingShare => {
			var pendingTshareParsed = parseFloat( pendingShare / 1e18 ).toFixed(4);
			pendingTshareParsed = parseFloat(pendingTshareParsed)
			if(pendingTshareParsed >= harvestThreshold) {
				console.log("Claiming pool ...")
				return harvestTsharePoolZero()

			} else {
				console.log(`${new Date()} | ${pendingTshareParsed} Tshare claimable (threshold = ${harvestThreshold})`)
			}
		})
		.then( () => {
			const tshareTokenContract = new web3.eth.Contract(
				TshareTokenABI,
				TshareTokenAddress
			)
			
			return tshareTokenContract.methods.balanceOf( user_address ).call()
				.then( balanceData => {
					if(balanceData != 0) {
						return createSpookySwapTrade(balanceData);
					}

					return true;
				})
		})
}

function createSpookySwapTrade( amountIn ) {
	amountIn = amountIn / 2;
	console.log(`Swap ${BigNumber(amountIn).dividedBy(1e18)} Tshare for FTM Start`);
	return swapForFTM(amountIn)
		.then(() => {
			console.log(`Swap ${BigNumber(amountIn).dividedBy(1e18)} Tshare for TOMB Start`);
			return swapForTOMB(amountIn)
			.then(() => {
				console.log(`Adding TOMB-FTM-LP ...`);
				return addLP()
					.then(() => {
						return addStacked();
					})
			})
		})
}

function swapForFTM(amountIn) {
	const spookyRouterContract = new web3.eth.Contract(
		SpookyRouterABI,
		SpookyRouterAddress
	);

	const tx = spookyRouterContract.methods.swapExactTokensForETHSupportingFeeOnTransferTokens(
		BigNumber(amountIn),
		0,
		[
			TshareTokenAddress,
			wFTMAddress
		],
		user_address,
		Date.now() + 1000 * 60 * 10
	);

	return tx.estimateGas({from: user_address})
		.then(gas => {
			return web3.eth.getGasPrice()
				.then(gasPrice => {
					const data = tx.encodeABI();
					return web3.eth.getTransactionCount(user_address)
						.then(nonce => {
							const txData = {
								from: user_address,
								to: SpookyRouterAddress,
								data: data,
								gas,
								gasPrice,
								nonce, 
								chainId: networkId
							};

							return web3.eth.sendTransaction(txData)
								.then( receipt => {			
									console.log(`Swap Tshare for FTM Success!`);
								})
						})
				})
		}).catch(err => {
			console.log("Swap Tshare for FTM Error!")
			console.error(err)
			throw err;
		})
}

function swapForTOMB( amountIn ) {
	const spookyRouterContract = new web3.eth.Contract(
		SpookyRouterABI,
		SpookyRouterAddress
	);
	
	const tx = spookyRouterContract.methods.swapExactTokensForTokensSupportingFeeOnTransferTokens(
		BigNumber(amountIn),
		0,
		[
			TshareTokenAddress,
			wFTMAddress,
			TombTokenAddress
		],
		user_address,
		Date.now() + 1000 * 60 * 10
	);
	
	return tx.estimateGas({from: user_address})
		.then(gas => {
			return web3.eth.getGasPrice()
				.then(gasPrice => {
					const data = tx.encodeABI();
					return web3.eth.getTransactionCount(user_address)
						.then(nonce => {
							const txData = {
								from: user_address,
								to: SpookyRouterAddress,
								data: data,
								gas,
								gasPrice,
								nonce, 
								chainId: networkId
							};


							return web3.eth.sendTransaction(txData)
								.then( receipt => {			
									console.log(`Swap Tshare for TOMB Success!`);
								})
						})
				})
		}).catch(err => {
			console.log("Swap Tshare for TOMB Error!")
			console.error(err)
			throw err;
		})
}

function harvestTsharePoolZero() {
	const TShareRewardPoolContract = new web3.eth.Contract(
		TShareRewardPoolABI,
		TShareRewardPoolAddress
	);
	
	const tx = TShareRewardPoolContract.methods.withdraw(0, 0);
	return tx.estimateGas({from: user_address})
		.then(gas => {
			return web3.eth.getGasPrice()
				.then(gasPrice => {
					const data = tx.encodeABI();
					return web3.eth.getTransactionCount(user_address)
						.then(nonce => {
							const txData = {
								from: user_address,
								to: TShareRewardPoolAddress,
								data: data,
								gas,
								gasPrice,
								nonce, 
								chainId: networkId
							};

							return web3.eth.sendTransaction(txData)
								.then( receipt => {
									console.log("Claim Success!")
								})
						})
				})
		}).catch(err => {
			console.log("Claim Error!")
			console.error(err)
			throw err;
		})
}

function addLP() {
	const tombTokenContract = new web3.eth.Contract(
		TombTokenABI,
		TombTokenAddress
	)
	return tombTokenContract.methods.balanceOf( user_address ).call()
		.then( balanceData => {
			if(balanceData >= liquidityThreshold*1e18) {
				const spookyFactoryContract = new web3.eth.Contract(
					SpookyFactoryABI,
					SpookyFactoryAddress
				);
					
				return spookyFactoryContract.methods.getPair( wFTMAddress, TombTokenAddress ).call()
					.then((pairAddress) => {
						const spookyPairContract = new web3.eth.Contract(
							SpookyPairABI, pairAddress
						);
						return spookyPairContract.methods.getReserves().call()
							.then((reserves) => {
								let ftmAmount = reserves._reserve0/reserves._reserve1*balanceData;
								const spookyRouterContract = new web3.eth.Contract(
									SpookyRouterABI,
									SpookyRouterAddress
								);
								const tx = spookyRouterContract.methods.addLiquidityETH(
									TombTokenAddress,
									BigNumber(balanceData),
									BigNumber(balanceData/10),
									BigNumber(ftmAmount/10),
									user_address,
									Date.now() + 1000 * 60 * 10
								);
								return web3.eth.getGasPrice()
									.then(gasPrice => {
										const data = tx.encodeABI();
										return web3.eth.getTransactionCount(user_address)
											.then(nonce => {
												const txData = {
													from: user_address,
													to: SpookyRouterAddress,
													value: BigNumber(ftmAmount),
													data: data,
													gas: '450000',
													gasPrice,
													nonce, 
													chainId: networkId
												};
												
												return web3.eth.sendTransaction(txData)
													.then( receipt => {			
														console.log(`Add TOMB-FTM-LP Success!`);
													})
											})
									})
									.catch(err => {
										console.log("Add TOMB-FTM-LP Error!")
										console.error(err)
										throw err;
									})
							})
					});
			}

			return true;
		})
}

function addStacked() {
	console.log("Adding LP to FARM ...")
	const spookyPairContract = new web3.eth.Contract(
		SpookyPairABI, FTMTOMBPair
	);
	return spookyPairContract.methods.balanceOf( user_address ).call()
		.then( balanceData => {
			if(balanceData != 0) {
				console.log(balanceData);
				const TShareRewardPoolContract = new web3.eth.Contract(
					TShareRewardPoolABI,
					TShareRewardPoolAddress
				);

				const tx = TShareRewardPoolContract.methods.deposit(0, BigNumber(balanceData));
				return tx.estimateGas({from: user_address})
					.then(gas => {
						return web3.eth.getGasPrice()
							.then(gasPrice => {
								const data = tx.encodeABI();
								return web3.eth.getTransactionCount(user_address)
									.then(nonce => {
										const txData = {
											from: user_address,
											to: TShareRewardPoolAddress,
											data: data,
											gas,
											gasPrice,
											nonce, 
											chainId: networkId
										};

										return web3.eth.sendTransaction(txData)
											.then( receipt => {
												console.log("LP to FARM Success!")
											})
									})
							})
					}).catch(err => {
						console.log("LP to FARM Error!")
						console.error(err)
						throw err;
					})
			}

			return true;
		})

}

web3.eth.accounts.wallet.add(privateKey);

var intervalCheck = setInterval(refreshStatus, 300000)

refreshStatus()
