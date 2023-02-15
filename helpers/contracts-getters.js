const {
    contractId,
} = require('./constants');
const {
    getContract,
} = require('./utils');


exports.getNFTOracleImpl = async () => {
    return await getContract(contractId.oracle, contractId.oracleImpl);
}


exports.getNFTOracleProxy = async () => {
    return await getContract(contractId.proxy, contractId.oracle);
}

exports.getNFTOracle = async () => {
    return await getContract(contractId.oracle);
}

exports.getPremium = async () => {
    return await getContract(contractId.premium);
}

exports.getCallFactory = async () => {
    return await getContract(contractId.callFactory);
}

exports.getNTokenFactory = async () => {
    return await getContract(contractId.nTokenFactory);
}

exports.getCallTokenFactory = async () => {
    return await getContract(contractId.callTokenFactory);
}

exports.getMockedERC721 = async (name, nftName=undefined) => {
    const poolName = nftName || name;
    return await getContract(name, contractId.NFT, undefined, poolName);
}

exports.getCallPool = async (address, poolName) => {
    return await getContract(contractId.callPool, undefined, addr=address, poolName=poolName);
}

exports.getNToken = async (address, poolName) => {
    return await getContract(contractId.nToken, undefined, addr=address, poolName=poolName);
}

exports.getCallToken = async (address, poolName) => {
    return await getContract(contractId.callToken, undefined, addr=address, poolName=poolName);
}

exports.getMockedOracle = async () => {
    return await getContract(contractId.mockedOracle);
}
