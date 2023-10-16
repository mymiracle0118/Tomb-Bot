
## Installation

Use the package manager [npm](https://www.npmjs.com/get-npm) to install this bot's dependencies using the following command.

```bash
 npm install
```

## Usage

Modify the [config.json](../main/config.json) with your wallet address and private key.
Optionally, change the harvestThreshold based on how often you want to dump rewards.
slipTolerance is set to 3.0% and may need to be changed depending on TOMB's peg
```json
"privateKey": "NOT_YOUR_MNEMONIC_PHRASE",
"userAddress": "YOUR_WALLET_ADDRESS",
"harvestThreshold": 0.125,
"slipTolerance": "300",
```


Start the farming script
```bash
 npm start
```
