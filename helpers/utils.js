const low = require('lowdb');
const fs = require('fs');
const FileSync = require('lowdb/adapters/FileSync');
const BigNumber = require('bignumber.js');
const {contractId} = require('./constants');

let DRE;

exports.setDRE = (_DRE) => {
    DRE = _DRE;
};


exports.getDRE = () => {
    return DRE;
};


function sleep(second) {
    return new Promise((resolve) => setTimeout(resolve, 1000 * second));
};


function getDB(poolName) {
    if(poolName === null){
        return low(new FileSync('deployed-contracts-base.json'));
    }
    else{
        return low(new FileSync('deployed-contracts-pool.json'));
    }
};


function getKey(name, poolName) {
    if(poolName === null){
        return `${name}.${DRE.network.name}.address`;
    }
    else{
        return `${name}.${DRE.network.name}.${poolName}`;
    }
}


exports.bigNumber = (number, decimals = 0) => {
    return new BigNumber(number).multipliedBy(10 ** decimals);
};


exports.loadJson = (jsonFile) => {
    return JSON.parse(fs.readFileSync(jsonFile).toString().trim());
};


exports.getAddress = async (name, poolName=null) => {
    const key = getKey(name, poolName);
    return await getDB(poolName).get(
        `${key}`,
    ).value();
};


exports.saveContract = async (name, contract, poolName) => {
    const key = getKey(name, poolName);
    await getDB(poolName).set(
        key,
        contract.address
    ).write();
};


exports.waitTx = async (tx) => {
    console.log('🍵 TransactionHash:', tx.hash);
    const res = await tx.wait(1);
    console.log('✅ gasUsed', res.gasUsed.toString());
    return res;
};


exports.getSigner = async (index = 0 ) => {
    const accounts = await DRE.ethers.getSigners();
    return accounts[index];
};


exports.getContract = async (contractName, dbName = undefined, addr = undefined, poolName=null) => {
    const name = dbName || contractName;
    const address = addr || (await this.getAddress(name, poolName));

    if (!address) {
        return null;
    }
    console.log(`Get ${contractName} Contract at ${address}`);
    return await DRE.ethers.getContractAt(contractName, address);
};


exports.verifyContract = async (name, contractAddress, ...args) => {
    console.log(`⭐️  Verify ${name} at`, contractAddress);
    try {
        // npx hardhat verify --network network
        await DRE.run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        });
    } catch (error) {
        console.log("❌ Verified Error, Please check on scan.", error);
    };
};


exports.getTxConfig = () => {
    let txConfig = {}
    if (process.env.maxPriorityFeePerGas && process.env.maxFeePerGas && process.env.gasLimit) {
        txConfig = {
            maxPriorityFeePerGas: process.env.maxPriorityFeePerGas,
            maxFeePerGas: process.env.maxFeePerGas,
            gasLimit: process.env.gasLimit,
        }
        console.log('👉 Get Config:', txConfig);
    };
    return txConfig;
};


exports.deployContract = async (contractName, args, verify = false, dbName = undefined, poolName=null) => {
    const name = dbName || contractName;
    console.log(`Deploying ${name} contract...`);
    const Contract = await DRE.ethers.getContractFactory(contractName);
    const txConfig = this.getTxConfig();
    const contract = await Contract.deploy(...args, txConfig);
    await contract.deployed()

    console.log(`✅  Deployed ${contractName} contract at ${contract.address}\n`);

    await this.saveContract(name, contract, poolName);

    if (verify) {
        const second = 30;
        console.log(`🍵 Wait ${second} seconds for verify...`);
        await sleep(second);
        await this.verifyContract(name, contract.address, ...args);
    };
    return contract;
}


exports.getBalance = async (address) => {
    return await DRE.waffle.provider.getBalance(address);
}


exports.saveCallPool = async (contractName, poolName, address, verify = false) => {
    await getDB(poolName).set(
        `${contractName}.${DRE.network.name}.${poolName}`,
        address,
    ).write();

    if (verify) {
        await this.verifyContract(contractId.callPool, address);
    };
};
