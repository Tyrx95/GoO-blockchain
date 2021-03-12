var GORegistry = artifacts.require("GORegistry");
var GOIssuingBody = artifacts.require("GOIssuingBody");

const PreciseProofs = require('precise-proofs-js').PreciseProofs;

const {GO_DATA} = require("./const.js");

const CERTIFICATE_TYPE_SOLAR = 1;

module.exports = async function(done) {
  try{
    let accounts = await web3.eth.getAccounts();
    console.log("Creating issuing body and certifying by GO registry...");

    const regInstance = await GORegistry.deployed();
    const ibInstance = await GOIssuingBody.new(regInstance.address);
    const txAddCertifiedResult = await regInstance.addCertifiedIssuer(ibInstance.address, {
        from: accounts[0],
    });
    console.log("Transaction add certified issuer:", txAddCertifiedResult.tx);
    console.log("Registering user in registry to Issuing Body...");
    const txAddUserToIBResult = await ibInstance.addUserToIBinRegistry(accounts[3], {from: accounts[0]});
    console.log("Add user to Issuing Body:", txAddUserToIBResult.tx);
    const leafs = PreciseProofs.createLeafs(GO_DATA);
    const merkleTree = PreciseProofs.createMerkleTree(leafs.map((leaf) => leaf.hash));
    const rootHash = PreciseProofs.getRootHash(merkleTree)
    const resultIssueTx =  await ibInstance.issueGOPrivate(51, accounts[3], 
        CERTIFICATE_TYPE_SOLAR, "0x2321521512", rootHash, {from: accounts[0]});
    let tokenId = resultIssueTx.logs[1].args.goId;
    console.log("Issue go with private dataTx:", resultIssueTx.tx);
    

    const goCertificate = await regInstance.theGOStorage.call(tokenId);
    const goRootHash = goCertificate.rootHash;
    
    const fakeData = {...GO_DATA, operatorName: "Fake inc"};
    const fakeLeafs = PreciseProofs.createLeafs(fakeData);
    const invalidProof = PreciseProofs.createProof('operatorName', fakeLeafs, false);
    if(!PreciseProofs.verifyProof(goRootHash, invalidProof)){
      console.log(`Value has not been verified`)
    }
    else{
      throw new Error("Error: Invalid proof has been verified");
    }
    console.log("Finished!");
    done();
  } catch(e){
      console.log(e);
      done();
  }
};
