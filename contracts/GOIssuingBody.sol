// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
pragma experimental ABIEncoderV2;

import "./GORegistry.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155Holder.sol";

contract GOIssuingBody is Ownable, ERC165, ERC1155Holder {
    using SafeMath for uint256;

    GORegistry public theGORegistry;
    uint256 private reqIdCounter;
    mapping(uint256 => GORequest) reqs;
    mapping(uint256 => uint256) fromGOToReq;
    mapping(uint256 => bool) withdrawnGO;
    mapping(address => bool) tradesWithIBAddrs;

    event GORequested(address indexed theGOOwner, uint256 indexed reqId);
    event GORequestConfirmed(
        uint256 indexed requestId,
        uint256 indexed goId,
        address indexed owner
    );
    event GORequestWithdrawn(uint256 indexed reqId, address indexed reqOwner);
    event IssuedGOWithdrawn(uint256 indexed tokenGOId);

    struct GORequest {
        address owner;
        bool confirmed;
        bool withdrawn;
        address solicitor;
        bytes goData;
        int256 energyType;
    }

    constructor(address regAddress) Ownable() {
        require(
            msg.sender != address(0),
            "constructor(): Issuing body smart contract can no be instantiated by zero address"
        );
        theGORegistry = GORegistry(regAddress);
    }

    function requestGO(
        address theGOOwner,
        bytes memory theGOData,
        int256 _type
    ) public returns (uint256 id) {
        uint256 reqId = reqIdCounter++;
        reqs[reqId] = GORequest({
            owner: theGOOwner,
            withdrawn: false,
            confirmed: false,
            solicitor: msg.sender,
            goData: theGOData,
            energyType: _type
        });
        emit GORequested(theGOOwner, reqId);
        return reqId;
    }

    function confirmGORequest(
        bytes memory validityFunc,
        uint256 reqId,
        uint256 amount
    ) public onlyOwner returns (uint256) {
        require(
            _notConfirmedOrWithdrawn(reqId),
            "confirmGORequest(): Request has been previously confirmed or withdrawn"
        );
        GORequest storage req = reqs[reqId];
        require(!req.confirmed, "The request has already been confirmed");
        req.confirmed = true;
        uint256 goId =
            theGORegistry.issueGOCertificate(
                req.owner,
                req.energyType,
                amount,
                req.goData,
                validityFunc
            );
        fromGOToReq[reqId] = goId;
        emit GORequestConfirmed(reqId, goId, req.owner);
        return goId;
    }

    function issueGO(
        uint256 amount,
        address receiver,
        int256 energyType,
        bytes memory goData
    ) public onlyOwner returns (uint256) {
        uint256 reqId = requestGO(receiver, goData, energyType);
        return
            confirmGORequest(
                abi.encodeWithSignature("validateGO(uint256)", reqId),
                reqId,
                amount
            );
    }

    function withdrawGORequest(uint256 reqId) external returns (bool) {
        GORequest storage req = reqs[reqId];

        require(
            msg.sender == owner() || msg.sender == req.owner,
            "Request can be withdrawn only by Issuing Body or the request initiator"
        );
        require(
            !req.confirmed,
            "Confirmed GO requests can not be withdrawn, call withdrawGOCertificate(uint256) to revoke already confirmed GO request"
        );
        require(!req.withdrawn, "The request has already been withdrawn ");

        req.withdrawn = true;
        emit GORequestWithdrawn(reqId, req.owner);
        return true;
    }

    function withdrawIssuedGO(uint256 goTokenId) external returns (bool) {
        require(
            !withdrawnGO[goTokenId],
            "GO has already been withdrawn by the Issuing Body Owner"
        );
        withdrawnGO[goTokenId] = true;

        emit IssuedGOWithdrawn(goTokenId);
        return true;
    }

    function validateGO(uint256 reqId) external view returns (bool) {
        GORequest memory req = reqs[reqId];
        uint256 tokenGOId = fromGOToReq[reqId];

        return
            req.confirmed &&
            !req.withdrawn &&
            !withdrawnGO[tokenGOId] &&
            reqId <= reqIdCounter;
    }

    function setTradesWith(address theIBAddress, bool value) public onlyOwner {
        tradesWithIBAddrs[theIBAddress] = value;
    }

    function isTradingWith(address issuingBodyAddress)
        public
        view
        returns (bool)
    {
        return tradesWithIBAddrs[issuingBodyAddress];
    }

    function transferGO(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public onlyOwner {
        theGORegistry.safeTransferFrom(from, to, id, amount, data);
    }

    function transferGOBatch(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyOwner {
        theGORegistry.safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    function addUserToIBinRegistry(address registrant) public onlyOwner {
        theGORegistry.registerForIssuingBody(registrant);
    }

    /////Private functions///////

    function _notConfirmedOrWithdrawn(uint256 reqId)
        private
        view
        returns (bool)
    {
        return !reqs[reqId].confirmed && !reqs[reqId].withdrawn;
    }
}
