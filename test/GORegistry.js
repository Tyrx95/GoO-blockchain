const GORegistry = artifacts.require("GORegistry.sol");
const truffleAssert = require('truffle-assertions');


const CERTIFICATE_TYPE_SOLAR = 1;

contract("GORegistry", (accounts) => {
  before(async function () {
    theGORegistryInstance = await GORegistry.deployed();
  });

  it("...should add a certified issuer", async () => {
    await theGORegistryInstance.addCertifiedIssuer(accounts[1], {
      from: accounts[0],
    });
    let isCertified = await theGORegistryInstance.certifiedIssuers.call(
      accounts[1],
      { from: accounts[1] }
    );
    assert.isTrue(isCertified, "This address is expected to be certified");
  });

  it("...should return false for not certified issuer", async () => {
    let isCertified = await theGORegistryInstance.certifiedIssuers.call(
      accounts[2],
      { from: accounts[2] }
    );
    assert.isFalse(isCertified, "This address is expected to not be certified");
  });

  //Issues GO for 50 MWh = 50 GO
  it("...should issue certificates if called by certified issuer", async () => {
    const result = await theGORegistryInstance.issueGOCertificate(accounts[2], CERTIFICATE_TYPE_SOLAR,
      50,
      "0x2321521512",
      { from: accounts[1] }
    );
    let tokenId = result.logs[0].args.id;
    const tokenBalance = await theGORegistryInstance.balanceOf.call(accounts[2], tokenId);
    assert.equal(tokenBalance, 50, "Token balance expected to be 50!");
  });

  it("...should not issue certificates if not called by certified issuer", async () => {
    await truffleAssert.fails(
        theGORegistryInstance.issueGOCertificate(accounts[2], CERTIFICATE_TYPE_SOLAR,
            50,
            "0x2321521512",
            { from: accounts[3] }
        ),
        truffleAssert.ErrorType.REVERT
    );
  });

  it("...should cancel GO, sent from owner address ", async () => {
    const result = await theGORegistryInstance.safeTransferAndCancelGO(accounts[2], accounts[2],1,
      23,
      "0x2321521512",
      "0x123151252",
      { from: accounts[2] }
    );
    const tokenBalance = await theGORegistryInstance.balanceOf.call(accounts[2], 1);
    assert.equal(tokenBalance, 27, "Token balance expected to be 27!");
    const canceledTokens = await theGORegistryInstance.canceledGOs.call(1, accounts[2]);
    assert.equal(canceledTokens.toNumber(), 23, "Canceled token balance expected to be 23!");
  });

  it("...should fail when cancelling GO, not sent from owner address ", async () => {
    const result = await 
    await truffleAssert.fails(
      theGORegistryInstance.safeTransferAndCancelGO(accounts[2], accounts[2],1,
        23,
        "0x2321521512",
        "0x123151252",
        { from: accounts[1] }
      ),
      truffleAssert.ErrorType.REVERT
  );
  });
  it("...should cancel GO, sent from operator address ", async () => {
    await theGORegistryInstance.setApprovalForAll(accounts[1], true, {from: accounts[2]});

    const result = await theGORegistryInstance.safeTransferAndCancelGO(accounts[2], accounts[2],1,
      1,
      "0x2321521512",
      "0x123151252",
      { from: accounts[1] }
    );
    const tokenBalance = await theGORegistryInstance.balanceOf.call(accounts[2], 1);
    assert.equal(tokenBalance, 26, "Token balance expected to be 26!");
    const canceledTokens = await theGORegistryInstance.canceledGOs.call(1, accounts[2]);
    assert.equal(canceledTokens.toNumber(), 24, "Canceled token balance expected to be 24!");
  });

  it("...should cancel batch GO, send from owner address", async () => {
    await theGORegistryInstance.issueGOCertificate(accounts[2], CERTIFICATE_TYPE_SOLAR,
      30,
      "0x2321521512",
      { from: accounts[1] }
    );
    const result = await theGORegistryInstance.safeBatchTransferAndCancelGO(accounts[2], accounts[2],[1,2],
      [2,2],
      "0x2321521512",
      ["0x123151252", "0x213123421"],
      { from: accounts[2] }
    );
    const tokenBalance2 = await theGORegistryInstance.balanceOf.call(accounts[2], 2);
    assert.equal(tokenBalance2, 28, "Token balance expected to be 28!");
    const canceledTokens2 = await theGORegistryInstance.canceledGOs.call(2, accounts[2]);
    assert.equal(canceledTokens2.toNumber(), 2, "Canceled token balance expected to be 2!");

    const tokenBalance1 = await theGORegistryInstance.balanceOf.call(accounts[2], 1);
    assert.equal(tokenBalance1, 24, "Token balance expected to be 24!");
    const canceledTokens1 = await theGORegistryInstance.canceledGOs.call(1, accounts[2]);
    assert.equal(canceledTokens1.toNumber(), 26, "Canceled token balance expected to be 26!");
  });

  it("...should fail when batch cancelling  GO, not sent from owner address ", async () => {
    await truffleAssert.fails(
      theGORegistryInstance.safeBatchTransferAndCancelGO(accounts[2], accounts[2],[1,2],
        [5,5],
        "0x2321521512",
        ["0x123151252","0x12321321"],
        { from: accounts[3] }
      ),
      truffleAssert.ErrorType.REVERT
    );
  });
});
