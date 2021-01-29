// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC1155/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract GORegistry is ERC1155Burnable, Ownable {
    using SafeMath for uint256;

    uint256 public tokenNonce;

    mapping(uint256 => address) public certificateOwners;

    mapping(uint256 => GOCertificate) public theGOStorage;
    mapping(uint256 => mapping(address => uint256)) public canceledGOs;

    mapping(address => bool) public certifiedIssuers;

    modifier onlyCertificateOwner(uint256 certId) {
        require(certificateOwners[certId] == msg.sender);
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
    }

    //example token metadata domain, not really existing
    constructor() ERC1155("GOCertificateDomain/{id}") Ownable() {}

    function issueGOCertificate(
        address to,
        int256 _certificateType,
        uint256 amount,
        bytes calldata data
    ) external onlyCertifiedIssuers(msg.sender) returns (uint256 _id) {
        uint256 tokenId = _generateGOToken(msg.sender, amount, data);
        if (amount > 0) {
            safeTransferFrom(msg.sender, to, tokenId, amount, data);
        }
        theGOStorage[tokenId] = GOCertificate({
            certificateType: _certificateType,
            issuingBody: msg.sender,
            data: data
        });
        emit OneGOIssued(msg.sender, amount,_certificateType, data);
        return tokenId;
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

        if (from != to) {
            super.safeTransferFrom(from, to, tokenId, amount, data);
        }
        else{
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
        }
        else{
            require(
                from == _msgSender() || isApprovedForAll(from, _msgSender()),
                "ERC1155: caller is not owner nor approved"
            );        
        }
        int256[] memory certificateTypes = new int256[](cancelRequests);
        for (uint256 i = 0; i < cancelRequests; i++) {
            canceledGOs[tokenIds[i]][to] = canceledGOs[tokenIds[i]][to].add(tokenAmounts[i]);
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

    /////////////    Private  ////////////////

    function _generateGOToken(
        address certificateOwner,
        uint256 initialSupply,
        bytes memory data
    ) private returns (uint256 id) {
        uint256 certificateId = ++tokenNonce;
        certificateOwners[certificateId] = certificateOwner;
        super._mint(certificateOwner, certificateId, initialSupply, data);
        return certificateId;
    }
}