// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC1155/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract GORegistry is ERC1155Burnable, Ownable {
    using SafeMath for uint256;

    uint256 public tokenNonce;

    mapping(uint256 => address) public certificateIssuers;

    mapping(uint256 => GOCertificate) public theGOStorage;
    mapping(uint256 => mapping(address => uint256)) public canceledGOs;

    mapping(address => bool) public certifiedIssuers;

    mapping(address => address) public userToIssuingBody;

    modifier onlyCertificateIssuer(uint256 certId) {
        require(certificateIssuers[certId] == msg.sender);
        _;
    }

    modifier onlyCertifiedIssuers(address issuer) {
        require(
            certifiedIssuers[issuer] == true,
            "You are not a certified issuer."
        );
        _;
    }

    event OneGOIssued(
        address indexed issuingBody,
        uint256 amount,
        int256 certificateType,
        bytes data
    );
    event OneGOCanceled(
        address indexed cancelIssuer,
        address indexed cancelClaimer,
        uint256 tokenId,
        uint256 amount,
        int256 certificateType,
        bytes cancelData
    );
    event BatchGOCanceled(
        address indexed cancelIssuer,
        address indexed cancelClaimer,
        uint256[] tokenIds,
        uint256[] amounts,
        int256[] certificateTypes,
        bytes[] cancelData
    );
    event IssuingBodyAdded(address issuer);
    event IssuingBodyRemoved(address issuer);

    struct GOCertificate {
        int256 certificateType;
        address issuingBody;
        bytes data;
        bytes validationFunction;
        bool hasPrivate;
        bytes32 rootHash;
        bytes privateData;
        bool isRevealed;
    }

    constructor() ERC1155("GOCertificateDomain/{id}") Ownable() {}

    function issueGOCertificate(
        address to,
        int256 _certificateType,
        uint256 amount,
        bytes calldata data,
        bytes calldata validationFunc,
        bool _hasPrivate,
        bytes32 _rootHash
    ) external onlyCertifiedIssuers(msg.sender) returns (uint256 _id) {
        _isValid(msg.sender, validationFunc);
        uint256 tokenId = _generateGOToken(msg.sender, amount, data);
        if (amount > 0) {
            safeTransferFrom(msg.sender, to, tokenId, amount, data);
        }
        theGOStorage[tokenId] = GOCertificate({
            certificateType: _certificateType,
            issuingBody: msg.sender,
            data: data,
            validationFunction: validationFunc,
            hasPrivate: _hasPrivate,
            rootHash: _rootHash,
            privateData: "",
            isRevealed: false
        });
        emit OneGOIssued(msg.sender, amount, _certificateType, data);
        return tokenId;
    }

    function revealPrivateData(uint256 certId, bytes memory revealedData) onlyCertificateIssuer(certId) public {
        GOCertificate storage go = theGOStorage[certId];
        require(go.hasPrivate && !go.isRevealed, "No private data or revealed");
        go.isRevealed = true;
        go.privateData = revealedData;
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
        if(!_isCertifiedIssuer(from) && from != address(0) && to != address(0)){
            for(uint256 i = 0; i < ids.length; i++){
                address fromIB = theGOStorage[ids[0]].issuingBody;
                address toIB = userToIssuingBody[to];
                require(fromIB != address(0) , "Sender is not registered within an IB");
                require(toIB != address(0) , "Receiver is not registered within an IB");
                require(_doesFromTradeWithTo(fromIB, toIB), 
                    "From does not trade with to");
            }
        }
        else if(!_isCertifiedIssuer(from) && from != address(0) && to == address(0)){
            for(uint256 i = 0; i < ids.length; i++){
                address fromIBToken = theGOStorage[ids[0]].issuingBody;
                address fromIBCurrent = userToIssuingBody[from];
                require(fromIBToken != address(0) , "");
                require(fromIBCurrent != address(0) , "");
                require(fromIBToken == fromIBCurrent ||_doesFromTradeWithTo(fromIBToken, fromIBCurrent), 
                    "burn IB check failed");
            }
        }
    }

    function safeTransferAndCancelGO(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes calldata data,
        bytes calldata cancelData
    ) external {
        GOCertificate memory go = theGOStorage[tokenId];
        _isValid(go.issuingBody, go.validationFunction);
        if (from != to) {
            super.safeTransferFrom(from, to, tokenId, amount, data);
        } else {
            require(
                from == _msgSender() || isApprovedForAll(from, _msgSender()),
                "ERC1155: caller is not owner nor approved"
            );
        }
        super._burn(to, tokenId, amount);
        canceledGOs[tokenId][to] = canceledGOs[tokenId][to].add(amount);
        emit OneGOCanceled(
            from,
            to,
            tokenId,
            amount,
            go.certificateType,
            cancelData
        );
    }

    function safeBatchTransferAndCancelGO(
        address from,
        address to,
        uint256[] memory tokenIds,
        uint256[] memory tokenAmounts,
        bytes calldata data,
        bytes[] calldata cancelData
    ) external {
        uint256 cancelRequests = tokenIds.length;
        require(
            cancelData.length == cancelRequests,
            "safeBatchTransferAndCancelGO: Cancel data must equal cancel requests"
        );
        if (from != to) {
            super.safeBatchTransferFrom(from, to, tokenIds, tokenAmounts, data);
        } else {
            require(
                from == _msgSender() || isApprovedForAll(from, _msgSender()),
                "ERC1155: caller is not owner nor approved"
            );
        }
        int256[] memory certificateTypes = new int256[](cancelRequests);
        for (uint256 i = 0; i < cancelRequests; i++) {
            canceledGOs[tokenIds[i]][to] = canceledGOs[tokenIds[i]][to].add(
                tokenAmounts[i]
            );
            GOCertificate memory go = theGOStorage[tokenIds[i]];
            certificateTypes[i] = go.certificateType;
        }

        super._burnBatch(to, tokenIds, tokenAmounts);
        emit BatchGOCanceled(
            from,
            to,
            tokenIds,
            tokenAmounts,
            certificateTypes,
            cancelData
        );
    }

    function addCertifiedIssuer(address issuer) external onlyOwner() {
        require(
            issuer != address(0),
            "Can not add zero address as certified issuer"
        );
        certifiedIssuers[issuer] = true;
        emit IssuingBodyAdded(issuer);
    }

    function removeCertifiedIssuer(address issuer) external onlyOwner() {
        require(
            issuer != address(0),
            "Can not remove zero address as certified issuer"
        );
        certifiedIssuers[issuer] = false;
        emit IssuingBodyRemoved(issuer);
    }

    function registerForIssuingBody(address registrant) public onlyCertifiedIssuers(msg.sender){
        userToIssuingBody[registrant] = msg.sender;
    }

    function _generateGOToken(
        address certificateIssuer,
        uint256 initialSupply,
        bytes memory data
    ) private returns (uint256 id) {
        uint256 certificateId = ++tokenNonce;
        certificateIssuers[certificateId] = certificateIssuer;
        super._mint(certificateIssuer, certificateId, initialSupply, data);
        return certificateId;
    }

    function _isValid(address sender, bytes memory validationFunction)
        internal
        view
    {
        if (_isOfTypeContract(sender)) {
            (bool success, bytes memory result) =
                sender.staticcall(validationFunction);

            require(
                success && abi.decode(result, (bool)),
                "IB does not validate request"
            );
        }
    }

    function _isOfTypeContract(address theAddress) private view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(theAddress)
        }
        return size > 0;
    }

    function _isCertifiedIssuer(address theSender) private view returns (bool){
        return certifiedIssuers[theSender];
    }

    function _doesFromTradeWithTo(address from, address to)
        private
        view
        returns (bool)
    {
        require(
            _isOfTypeContract(from),
            "not address"
        );
        require(
            _isOfTypeContract(to),
            "not address"
        );
        bytes memory validateFunc =
            abi.encodeWithSignature("isTradingWith(address)", from);
        (bool success, bytes memory result) = to.staticcall(validateFunc);
        require(
            success,
            "a and b do not trade"
        );
        return  abi.decode(result, (bool));
    }
}
