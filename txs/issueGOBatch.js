
var GORegistry = artifacts.require("GORegistry");
var GOIssuingBody = artifacts.require("GOIssuingBody");

const {GO_DATA, CANCEL_DATA, IB1_ADDRESS, IB2_ADDRESS} = require("./const.js");

const BATCH_ITERATIONS = 10;

const CERTIFICATE_TYPE_SOLAR = 1;


var fs = require('fs');

module.exports = async function(done) {
    try{
        let accounts = await web3.eth.getAccounts();
        console.log("Creating issuing body and certifying by GO registry...");

        const regInstance = await GORegistry.deployed();
        const ibInstance1 = await GOIssuingBody.at(IB1_ADDRESS);
        const ibInstance2 = await GOIssuingBody.at(IB2_ADDRESS);

        const bytesData = web3.utils.fromAscii(JSON.stringify(GO_DATA));


        const txAddCertifiedResult1 = await regInstance.addCertifiedIssuer(ibInstance1.address, {
            from: accounts[0],
        });
        console.log("Transaction add certified issuer:", txAddCertifiedResult1.tx);
        const txAddCertifiedResult2 = await regInstance.addCertifiedIssuer(ibInstance2.address, {
            from: accounts[0],
        });
        console.log("Transaction add certified issuer:", txAddCertifiedResult2.tx);

        console.log("Registering user in registry to Issuing Body 1...");
        const txAddUserToIBResult1 = await ibInstance1.addUserToIBinRegistry(accounts[0], {from: accounts[0]});
        console.log("Add user to Issuing Body:", txAddUserToIBResult1.tx);

        console.log("Registering user in registry to Issuing Body 2...");
        const txAddUserToIBResult2 = await ibInstance2.addUserToIBinRegistry(accounts[1], {from: accounts[0]});
        console.log("Add user to Issuing Body:", txAddUserToIBResult2.tx);

        const tokenIds = [];
        for(let i = 0; i< BATCH_ITERATIONS; i++){
            console.log(`Issuing GO to the address ${accounts[0]}...`);
            const resultIssueTx =  await ibInstance1.issueGO(25, accounts[0], 
                CERTIFICATE_TYPE_SOLAR, bytesData, {from: accounts[0]});
            try {
                const tokenId = resultIssueTx.logs[1].args.goId;
                if(typeof tokenId == 'undefined'){
                    throw new Error("tokenId is not defined");
                }
                tokenIds.push(tokenId);
                console.log("Issued go Tx:", resultIssueTx.tx);
                fs.appendFile('ids.txt', ` ${tokenId}`, function (err) {
                    if (err) throw err;
                    console.log('Token Id written to file!');
                });
               
            }
            catch(e){
                console.error(`Error reading token id, for the transaction: ${resultIssueTx}, error is ${e}`);
            }

        }
    } catch(e){
        console.log(e);
        done();
    }
    done();
}
