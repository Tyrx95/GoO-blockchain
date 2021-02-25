var GORegistry = artifacts.require("GORegistry");
var GOIssuingBody = artifacts.require("GOIssuingBody");

const CERTIFICATE_TYPE_SOLAR = 1;

const {GO_DATA, CANCEL_DATA, IB1_ADDRESS, IB2_ADDRESS} = require("./const.js");

const BATCH_ITERATIONS = 20;

var fs = require('fs');


module.exports = async function(done) {

    try{
        let accounts = await web3.eth.getAccounts();

        const regInstance = await GORegistry.deployed();
        const ibInstance1 = await GOIssuingBody.at(IB1_ADDRESS);
        const ibInstance2 = await GOIssuingBody.at(IB2_ADDRESS);

        const bytesData = web3.utils.fromAscii(JSON.stringify(GO_DATA));
        const bytesCancelData = web3.utils.fromAscii(JSON.stringify(CANCEL_DATA));

        let input = fs.readFileSync('ids.txt', 'utf8');
        let numbersString = input.split(" ");
        let tokenIds = [];
        let cancelData = [];
        let amounts = [];
        
        for(let numberStr of numbersString){
            let number = parseInt(numberStr)
            if(!isNaN(number)){
                tokenIds.push(number);
                cancelData.push(bytesCancelData);
                amounts.push(5);
            }
        }
        console.log(`Transfering and batch cancelling GO from: ${accounts[0]} to ${accounts[1]}...for ids ${tokenIds}`);
        await ibInstance2.setTradesWith(ibInstance1.address, {from: accounts[0]});
        let start = new Date().getTime();
        const resultCancelGO = await regInstance.safeBatchTransferAndCancelGO(accounts[0], accounts[1],tokenIds,
            amounts,
            bytesData,
            cancelData,
            { from: accounts[0] }
        );
        let end = new Date().getTime();
        let time = end - start;
        console.log("Execution time: " + time);
        console.log("Canceled go Tx:", resultCancelGO.tx);
        console.log("Finished!");
        done();
  } catch(e){
      console.log(e);
      done();
  }
};