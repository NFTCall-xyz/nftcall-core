const { expect } = require("chai");
const { makeSuite } = require('./make-suite');


makeSuite('Premium', (testEnv) => {

    it("Should return the right premium", async function () {
        const { premium } = testEnv;
        /// test premium 0: [0, 1, 2, 3, 4, 5, 6...]
        expect(await premium.getPremium(0, 0)).to.equal(0);
        expect(await premium.getPremium(0, 5000)).to.equal(5);
    });

    it("Should not return premium when vol >= 990%", async function () {
        const { premium } = testEnv;
        await expect(
            premium.getPremium(0, 99000)
        ).to.be.revertedWith("Vol exceeds limit");
    });
});
