const { expect } = require("chai");
const { makeSuite } = require('./make-suite');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';


makeSuite('NFTOracle', (testEnv) => {

    const revision = 0x1;
    let owner, operator;
    let mockAddress = [];
    let mockPrices = [
        {price: 21, vol: 10, asset: '0x0000000000000000000000000000000000000001'},
        {price: 22, vol: 20, asset: '0x0000000000000000000000000000000000000002'},
        {price: 23, vol: 30, asset: '0x0000000000000000000000000000000000000003'},
        {price: 24, vol: 40, asset: '0x0000000000000000000000000000000000000004'},
        {price: 25, vol: 50, asset: '0x0000000000000000000000000000000000000005'},
        {price: 26, vol: 60, asset: '0x0000000000000000000000000000000000000006'},
        {price: 0, vol: 0, asset: '0x0000000000000000000000000000000000000007'},
        {price: 65535, vol: 65535, asset: '0x0000000000000000000000000000000000000008'},
        {price: 31, vol: 10, asset: '0x0000000000000000000000000000000000000009'},
        {price: 32, vol: 20, asset: '0x0000000000000000000000000000000000000010'},
        {price: 33, vol: 30, asset: '0x0000000000000000000000000000000000000011'},
        {price: 34, vol: 40, asset: '0x0000000000000000000000000000000000000012'},
        {price: 35, vol: 50, asset: '0x0000000000000000000000000000000000000013'},
        {price: 36, vol: 60, asset: '0x0000000000000000000000000000000000000014'},
        {price: 0, vol: 0, asset: '0x0000000000000000000000000000000000000015'},
        {price: 65535, vol: 65535, asset: '0x0000000000000000000000000000000000000016'},
        {price: 46, vol: 60, asset: '0x0000000000000000000000000000000000000017'},
    ];

    before(async () => {
        const { users } = testEnv;
        owner = users[0];
        operator = users[1];
        for (let p of mockPrices) {
            mockAddress.push(p.asset);
        }

    });

    it('initialize', async function() {
        const {oracle, users} = testEnv;
        const instance = oracle.connect(users[1]);
        expect(
            await instance.ORACLE_REVISION()
        ).to.equal(revision);
        expect(
            await instance.owner()
        ).to.equal(await owner.getAddress());
        expect(
            await instance.operator()
        ).to.equal(await operator.getAddress());
    });

    it('Ownable: caller is not the owner', async function() {
        const { oracle } = testEnv;
        const instance = oracle.connect(operator);

        await expect(
            instance.addAssets(['0x0000000000000000000000000000000000000000'])
        ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('NFTOracle: caller is not the operator', async () => {
        const { oracle } = testEnv;
        const instance = oracle.connect(owner);

        await expect(
            instance.batchSetAssetPrice([], [])
        ).to.be.revertedWith('NFTOracle: caller is not the operator');
    });

    it('NFTOracle: caller is not the emergencyAdmin', async () => {
        const { oracle } = testEnv;
        const instance = oracle.connect(owner);

        await expect(
            instance.setPause(true)
        ).to.be.revertedWith('NFTOracle: caller is not the emergencyAdmin');
    });

    it('addAssets success', async () => {
        const { oracle } = testEnv;
        const instance = oracle.connect(owner);

        let res;

        res = await instance.getAddressList();
        await expect(res.length).to.be.equal(0);

        await instance.addAssets(mockAddress);

        res = await instance.getAddressList();
        await expect(res.length).to.be.equal(mockAddress.length);

        let i = 0;
        let j = 1;
        for (let addr of mockAddress) {
            let r = await instance.getIndexes(addr);
            await expect(r.OuterIndex.toNumber()).to.be.equal(i);
            await expect(r.InnerIndex.toNumber()).to.be.equal(j);
            if ( j == 8 ) {
                i = i + 1;
                j = 1;
            } else {
                j = j + 1;
            };
        };
    });

    it('batchSetAssetPrice success', async () => {
        const { oracle } = testEnv;
        const instance = oracle.connect(operator);

        let res = {};
        for (let item of mockPrices) {
            let r = await instance.getIndexes(item.asset);
            let OuterIndex = r.OuterIndex.toNumber();
            let InnerIndex = r.InnerIndex.toNumber();
            if (res[OuterIndex] == undefined) {
                res[OuterIndex] = [];
            };
            res[OuterIndex].push({
                price: item.price,
                vol: item.vol,
                index: InnerIndex,
            })
        };

        let indexes = Object.keys(res);
        let inputs = [];
        for (let index of indexes) {
            inputs.push(res[index]);
        };

        await instance.batchSetAssetPrice(indexes, inputs);

        const batchRes = await instance.getAssets(mockAddress);
        for (let index in mockAddress) {
            const addr = mockAddress[index];
            const mockP = mockPrices[index];
            const expectPrice = (mockP.price * 10 ** 16).toString();
            const expectVol = (mockP.vol * 10).toString();

            // test get price
            let p = (await instance.getAssetPrice(addr)).toString();
            await expect(p).to.be.equal(expectPrice);

            // test get vol
            let v = (await instance.getAssetVol(addr)).toString();
            await expect(v).to.be.equal(expectVol);


            // test get price & vol
            let r = await instance.getAsset(addr);
            await expect(r[0].toString()).to.be.equal(expectPrice);
            await expect(r[1].toString()).to.be.equal(expectVol);


            // test batch get price & vol
            await expect(batchRes[index][0].toString()).to.be.equal(expectPrice);
            await expect(batchRes[index][1].toString()).to.be.equal(expectVol);
        }
    });

    it('Pausable: paused', async () => {
        const { oracle, users } = testEnv;
        const emergencyAdmin = users[3];

        const ownerInstance = oracle.connect(owner);
        await ownerInstance.setEmergencyAdmin(await emergencyAdmin.getAddress(), true);

        const instance = oracle.connect(emergencyAdmin);
        await instance.setPause(true);

        await expect(
            instance.batchSetAssetPrice([], [])
        ).to.be.revertedWith('Pausable: paused');
    });

    it('NFTOracle: invalid admin', async () => {
        const { oracle } = testEnv;
        const instance = oracle.connect(owner);

        await expect(
            instance.setEmergencyAdmin(ZERO_ADDRESS, true)
        ).to.be.revertedWith('NFTOracle: invalid admin');
    });

    it('NFTOracle: invalid operator', async () => {
        const { oracle } = testEnv;
        const instance = oracle.connect(owner);

        await expect(
            instance.setOperator(ZERO_ADDRESS)
        ).to.be.revertedWith('NFTOracle: invalid operator');
    });

    it('NFTOracle: invalid index', async () => {
        const { oracle } = testEnv;
        const instance = oracle.connect(owner);

        await expect(
            instance.replaceAsset(ZERO_ADDRESS, ZERO_ADDRESS)
        ).to.be.revertedWith('NFTOracle: invalid index');
    });

    it('replaceAsset success', async () => {
        const { oracle } = testEnv;
        const instance = oracle.connect(owner);
        const newAddr = '0x1000000000000000000000000000000000000001'

        const oldRes = await instance.getAddressList();

        const oldAddr = oldRes[0];

        await instance.replaceAsset(oldAddr, newAddr);

        const newRes = await instance.getAddressList();

        expect(newRes[0]).to.be.equal(newAddr);
    });
});
