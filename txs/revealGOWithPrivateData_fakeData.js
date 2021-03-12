var GORegistry = artifacts.require("GORegistry");
var GOIssuingBody = artifacts.require("GOIssuingBody");
const PreciseProofs = require('precise-proofs-js').PreciseProofs;
const randomBytes = require('random-bytes');


const {GO_DATA} = require("./const.js");

const CERTIFICATE_TYPE_SOLAR = 1;

module.exports = async function(done) {
  try{
    const GO_PRIVATE_DATA = GO_DATA;
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
    const salts = [];
    for (const [key, value] of Object.entries(GO_PRIVATE_DATA)) {
      const salt = await randomBytes(16);
      salts.push(salt.toString("base64"));
    }
    const leafs = PreciseProofs.createLeafs(GO_PRIVATE_DATA, salts);
    const merkleTree = PreciseProofs.createMerkleTree(leafs.map((leaf) => leaf.hash));
    const rootHash = PreciseProofs.getRootHash(merkleTree)
    const resultIssueTx =  await ibInstance.issueGOPrivate(51, accounts[3], 
        CERTIFICATE_TYPE_SOLAR, "0x2321521512", rootHash, {from: accounts[0]});
    let tokenId = resultIssueTx.logs[1].args.goId;
    console.log("Issue go with private dataTx:", resultIssueTx.tx);
    const fakeData = {...GO_PRIVATE_DATA, issuer: "Fake inc"};
    const revealingObject = {
      revealedData: fakeData,
      revealedSalts: salts
    }
    const bytesData = web3.utils.fromAscii(JSON.stringify(revealingObject));
    await ibInstance.revealGOPrivateData(tokenId, bytesData, {from: accounts[0]});
    const goCertificate = await regInstance.theGOStorage.call(tokenId);

    const {revealedData, revealedSalts} = JSON.parse(web3.utils.toAscii(goCertificate.privateData));
    const goRootHash = goCertificate.rootHash;
    const revealedLeafs = PreciseProofs.createLeafs(revealedData, revealedSalts);
    

    let verified = true;
    for (const [key, value] of Object.entries(revealedData)) {
      console.log(`Creating proof for field: ${key}, with value: ${value}`);
      const proof = PreciseProofs.createProof(key, revealedLeafs, false);
      if(!PreciseProofs.verifyProof(goRootHash, proof)){
        verified = false;
        console.log(`Proof for field: ${key}, has not been verified, invalid proof`);
        break;
      }
      else{
        console.log(`Proof for field: ${key}, has been  verified`);
      }
    }
    if(verified){
      throw new Error("Invalid proof verified");
    }
    done();
  } catch(e){
      console.log(e);
      done();
  }
};
