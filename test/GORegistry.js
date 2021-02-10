const GORegistry = artifacts.require("GORegistry.sol");
const GOIssuingBody = artifacts.require("GOIssuingBody.sol");


const truffleAssert = require('truffle-assertions');


const CERTIFICATE_TYPE_SOLAR = 1;

contract("GORegistry and GOIssuingBody", (accounts) => {
  before(async function () {
    theGORegistryInstance = await GORegistry.new();
    issuingBodyInstanceOne = await GOIssuingBody.new(theGORegistryInstance.address);
    issuingBodyInstanceTwo = await GOIssuingBody.new(theGORegistryInstance.address);
    issuingBodyInstanceThree = await GOIssuingBody.new(theGORegistryInstance.address);
    issuingBodyInstanceFour = await GOIssuingBody.new(theGORegistryInstance.address);
  });

  it("...should add a certified issuer", async () => {
    await theGORegistryInstance.addCertifiedIssuer(issuingBodyInstanceOne.address, {
      from: accounts[0],
    });
    let isCertified = await theGORegistryInstance.certifiedIssuers.call(
      issuingBodyInstanceOne.address,
      { from: accounts[1] }
    );
    assert.isTrue(isCertified, "This address is expected to be certified");
  });

  it("...should return false for not certified issuer", async () => {
    let isCertified = await theGORegistryInstance.certifiedIssuers.call(
      issuingBodyInstanceTwo.address,
      { from: accounts[2] }
    );
    assert.isFalse(isCertified, "This address is expected to not be certified");
  });

  //Issues GO for 50 MWh = 50 GO
  it("...should issue certificates if called by certified issuer", async () => {
    // await theGORegistryInstance.registerForIssuingBody(accounts[0], {from: issuingBodyInstanceOne});
    // await theGORegistryInstance.registerForIssuingBody(accounts[1], {from: issuingBodyInstanceTwo});
    await issuingBodyInstanceOne.addUserToIBinRegistry(accounts[3], {from: accounts[0]});
    const result =  await issuingBodyInstanceOne.issueGO(51, accounts[3], 
        CERTIFICATE_TYPE_SOLAR, "0x2321521512", {from: accounts[0]});
    // const result = await theGORegistryInstance.issueGOCertificate(accounts[1], CERTIFICATE_TYPE_SOLAR,
    //   50,
    //   "0x2321521512",
    //   { from: accounts[1] }
    // );

    let tokenId = result.logs[1].args.goId;

    const tokenBalance = await theGORegistryInstance.balanceOf.call(accounts[3], tokenId);
    assert.equal(tokenBalance, 51, "Token balance expected to be 5!");
  });

  it("...should not issue certificates if not called by certified issuer", async () => {
    await truffleAssert.fails(
      issuingBodyInstanceTwo.issueGO(51, accounts[4], 
        CERTIFICATE_TYPE_SOLAR, "0x2321521512", {from: accounts[0]}
        ),
        truffleAssert.ErrorType.REVERT
    );
  });

  it("...should cancel GO,with transfer", async () => {
    await theGORegistryInstance.addCertifiedIssuer(issuingBodyInstanceThree.address, {
      from: accounts[0],
    });
    await issuingBodyInstanceOne.addUserToIBinRegistry(accounts[4], {from: accounts[0]});
    await issuingBodyInstanceThree.addUserToIBinRegistry(accounts[5], {from: accounts[0]});
    await issuingBodyInstanceOne.issueGO(150, accounts[4], 
      CERTIFICATE_TYPE_SOLAR, "0x2321521512", {from: accounts[0]});
    await issuingBodyInstanceThree.setTradesWith(issuingBodyInstanceOne.address, {from: accounts[0]});

    const result = await theGORegistryInstance.safeTransferAndCancelGO(accounts[4], accounts[5],2,
      23,
      "0x2321521512",
      "0x123151252",
      { from: accounts[4] }
    );
    const tokenBalance = await theGORegistryInstance.balanceOf.call(accounts[4], 2);
    assert.equal(tokenBalance, 127, "Token balance expected to be 127!");
    const canceledTokens = await theGORegistryInstance.canceledGOs.call(2, accounts[5]);
    assert.equal(canceledTokens.toNumber(), 23, "Canceled token balance expected to be 23!");
  });

  it("...should cancel GO,without transfer", async () => {
    const result = await theGORegistryInstance.safeTransferAndCancelGO(accounts[4], accounts[4],2,
      27,
      "0x2321521512",
      "0x123151252",
      { from: accounts[4] }
    );
    const tokenBalance = await theGORegistryInstance.balanceOf.call(accounts[4], 2);
    assert.equal(tokenBalance, 100, "Token balance expected to be 100!");
    const canceledTokens = await theGORegistryInstance.canceledGOs.call(2, accounts[4]);
    assert.equal(canceledTokens.toNumber(), 27, "Canceled token balance expected to be 27!");
  });

  it("...should fail when cancelling GO,issuing bodies do not trade", async () => {
    await theGORegistryInstance.addCertifiedIssuer(issuingBodyInstanceFour.address, {
      from: accounts[0],
    });
    await issuingBodyInstanceFour.addUserToIBinRegistry(accounts[4], {from: accounts[0]});
    await truffleAssert.fails(
      theGORegistryInstance.safeTransferAndCancelGO(accounts[4], accounts[6],2,
        27,
        "0x2321521512",
        "0x123151252",
        { from: accounts[4] }
      ),
      truffleAssert.ErrorType.REVERT
    );
  });

  it("...should fail when cancelling GO,issuing bodies do not trade", async () => {
    await theGORegistryInstance.addCertifiedIssuer(issuingBodyInstanceFour.address, {
      from: accounts[0],
    });
    await issuingBodyInstanceFour.addUserToIBinRegistry(accounts[4], {from: accounts[0]});
    await truffleAssert.fails(
      theGORegistryInstance.safeTransferAndCancelGO(accounts[4], accounts[6],2,
        27,
        "0x2321521512",
        "0x123151252",
        { from: accounts[4] }
      ),
      truffleAssert.ErrorType.REVERT
    );
  });

  it("...should fail when self cancelling GO, changed issuing body, does not trade", async () => {
    await issuingBodyInstanceFour.addUserToIBinRegistry(accounts[4], {from: accounts[0]});
    await truffleAssert.fails(
      theGORegistryInstance.safeTransferAndCancelGO(accounts[4], accounts[4],2,
        27,
        "0x2321521512",
        "0x123151252",
        { from: accounts[4] }
      ),
      truffleAssert.ErrorType.REVERT
    );
  });

  it("...should fail when cancelling GO, not sent from owner address ", async () => {
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
//   it("...should cancel GO, sent from operator address ", async () => {
//     await theGORegistryInstance.setApprovalForAll(accounts[1], true, {from: accounts[2]});

//     const result = await theGORegistryInstance.safeTransferAndCancelGO(accounts[2], accounts[2],1,
//       1,
//       "0x2321521512",
//       "0x123151252",
//       { from: accounts[1] }
//     );
//     const tokenBalance = await theGORegistryInstance.balanceOf.call(accounts[2], 1);
//     assert.equal(tokenBalance, 26, "Token balance expected to be 26!");
//     const canceledTokens = await theGORegistryInstance.canceledGOs.call(1, accounts[2]);
//     assert.equal(canceledTokens.toNumber(), 24, "Canceled token balance expected to be 24!");
//   });

  it("...should cancel batch GO, send from owner address, no transfer", async () => {
    await issuingBodyInstanceOne.addUserToIBinRegistry(accounts[7], {from: accounts[0]});

    const resultIssueGOFirst = await issuingBodyInstanceOne.issueGO(30, accounts[7], 
      CERTIFICATE_TYPE_SOLAR, "0x2321521512", {from: accounts[0]});
      let tokenIdFirst = resultIssueGOFirst.logs[1].args.goId;

    const resultIssueGOSecond = await issuingBodyInstanceOne.issueGO(40, accounts[7], 
      CERTIFICATE_TYPE_SOLAR, "0x2321521512", {from: accounts[0]});
    let tokenIdSecond = resultIssueGOSecond.logs[1].args.goId;

    const result = await theGORegistryInstance.safeBatchTransferAndCancelGO(accounts[7], accounts[7],[tokenIdFirst,tokenIdSecond],
      [20,25],
      "0x2321521512",
      ["0x123151252", "0x213123421"],
      { from: accounts[7] }
    );
    const tokenBalance2 = await theGORegistryInstance.balanceOf.call(accounts[7], tokenIdSecond);
    assert.equal(tokenBalance2, 15, "Token balance expected to be 15!");
    const canceledTokens2 = await theGORegistryInstance.canceledGOs.call(tokenIdSecond, accounts[7]);
    assert.equal(canceledTokens2.toNumber(), 25, "Canceled token balance expected to be 25!");

    const tokenBalance1 = await theGORegistryInstance.balanceOf.call(accounts[7], tokenIdFirst);
    assert.equal(tokenBalance1, 10, "Token balance expected to be 10!");
    const canceledTokens1 = await theGORegistryInstance.canceledGOs.call(tokenIdFirst, accounts[7]);
    assert.equal(canceledTokens1.toNumber(), 20, "Canceled token balance expected to be 20!");
  });


  it("...should cancel batch GO, send from owner address, with transfer", async () => {
    await issuingBodyInstanceOne.addUserToIBinRegistry(accounts[7], {from: accounts[0]});
    await issuingBodyInstanceFour.addUserToIBinRegistry(accounts[8], {from: accounts[0]});

    await issuingBodyInstanceFour.setTradesWith(issuingBodyInstanceOne.address, true, {from:accounts[0]});

    const result = await theGORegistryInstance.safeBatchTransferAndCancelGO(accounts[7], accounts[8],[3,4],
      [5,6],
      "0x2321521512",
      ["0x123151252", "0x213123421"],
      { from: accounts[7] }
    );
    const tokenBalance2 = await theGORegistryInstance.balanceOf.call(accounts[7], 4);
    assert.equal(tokenBalance2, 9, "Token balance expected to be 9!");
    const canceledTokens2 = await theGORegistryInstance.canceledGOs.call(4, accounts[8]);
    assert.equal(canceledTokens2.toNumber(), 6, "Canceled token balance expected to be 6!");

    const tokenBalance1 = await theGORegistryInstance.balanceOf.call(accounts[7], 3);
    assert.equal(tokenBalance1, 5, "Token balance expected to be 5!");
    const canceledTokens1 = await theGORegistryInstance.canceledGOs.call(3, accounts[8]);
    assert.equal(canceledTokens1.toNumber(), 5, "Canceled token balance expected to be 5!");
  });

  it("...should fail when batch cancelling  GO, not sent from owner address ", async () => {
    await truffleAssert.fails(
      theGORegistryInstance.safeBatchTransferAndCancelGO(accounts[2], accounts[2],[3,4],
        [5,5],
        "0x2321521512",
        ["0x123151252","0x12321321"],
        { from: accounts[3] }
      ),
      truffleAssert.ErrorType.REVERT
    );
  });
 });
