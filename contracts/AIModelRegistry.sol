// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AIModelRegistry
 * @notice ERC-1155 registry of AI models. Each model is a token id; license
 *         holders own units of that token. The contract notarizes the model
 *         (creator address + content hash of the off-chain weights), enforces
 *         the base price and the maximum supply, and credits payments to the
 *         creator through a pull-payment withdrawal.
 */
contract AIModelRegistry is ERC1155, ERC1155Supply, Ownable, ReentrancyGuard {
    uint256 public constant MAX_STRING_LENGTH = 64;

    struct ModelMetadata {
        string modelName;
        string creatorHandle; // free text, NOT verified (the address is the real identity)
        address creator;      // msg.sender at registration
        bytes32 contentHash;  // hash (or CID digest) of the off-chain weights
        uint256 basePrice;    // price per license unit, in wei
        uint256 maxSupply;    // maximum number of license units
        bool isActive;
    }

    mapping(uint256 => ModelMetadata) public modelRegistry;
    mapping(bytes32 => bool) public isHashRegistered;
    mapping(address => uint256) public pendingWithdrawals;
    uint256 public nextTokenId;

    event ModelRegistered(
        uint256 indexed tokenId,
        address indexed creator,
        string modelName,
        bytes32 contentHash,
        uint256 basePrice,
        uint256 maxSupply
    );
    event LicenseAcquired(
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 quantity,
        uint256 paid
    );
    event ModelStatusChanged(uint256 indexed tokenId, bool isActive);
    event Withdrawn(address indexed account, uint256 amount);

    // Metadata base URI is centralized and replaceable (see setURI).
    constructor()
        ERC1155("https://nuvyrahub.org/api/metadata/{id}.json")
        Ownable(msg.sender)
    {}

    /**
     * @notice Register a new AI model and mint the initial license units to the creator.
     * @param name            Model name (1..64 bytes).
     * @param creatorHandle   Creator handle in text, e.g. "@VinciLabs" (1..64 bytes, unverified).
     * @param contentHash     Hash of the model weights stored off-chain (must be non-zero and unique).
     * @param price           Price per license unit in wei (0 allowed for free models).
     * @param maxSupply       Maximum license units that can ever exist (> 0).
     * @param initialSupply   Units minted to the creator now (<= maxSupply).
     */
    function registerModel(
        string calldata name,
        string calldata creatorHandle,
        bytes32 contentHash,
        uint256 price,
        uint256 maxSupply,
        uint256 initialSupply
    ) external returns (uint256) {
        require(_validLength(name), "Invalid name length");
        require(_validLength(creatorHandle), "Invalid handle length");
        require(contentHash != bytes32(0), "Content hash is zero");
        require(!isHashRegistered[contentHash], "Content hash already registered");
        require(maxSupply > 0, "Max supply is zero");
        require(initialSupply <= maxSupply, "Initial supply exceeds max supply");

        uint256 tokenId = nextTokenId++;
        isHashRegistered[contentHash] = true;

        modelRegistry[tokenId] = ModelMetadata({
            modelName: name,
            creatorHandle: creatorHandle,
            creator: msg.sender,
            contentHash: contentHash,
            basePrice: price,
            maxSupply: maxSupply,
            isActive: true
        });

        emit ModelRegistered(tokenId, msg.sender, name, contentHash, price, maxSupply);

        if (initialSupply > 0) {
            _mint(msg.sender, tokenId, initialSupply, "");
        }
        return tokenId;
    }

    /**
     * @notice Buy `quantity` license units of a model. The payment is credited to the
     *         creator; any excess ETH is credited back to the buyer. Both withdraw().
     */
    function acquireLicense(uint256 tokenId, uint256 quantity)
        external
        payable
        nonReentrant
    {
        ModelMetadata storage model = modelRegistry[tokenId];
        require(model.isActive, "Model is not active");
        require(quantity > 0, "Quantity is zero");
        require(
            totalSupply(tokenId) + quantity <= model.maxSupply,
            "Max supply reached"
        );

        uint256 cost = model.basePrice * quantity;
        require(msg.value >= cost, "Insufficient ETH sent for license");

        // Effects before interactions
        pendingWithdrawals[model.creator] += cost;
        uint256 excess = msg.value - cost;
        if (excess > 0) {
            pendingWithdrawals[msg.sender] += excess;
        }

        _mint(msg.sender, tokenId, quantity, "");
        emit LicenseAcquired(tokenId, msg.sender, quantity, cost);
    }

    /// @notice Withdraw the ETH credited to the caller (sales or refunded excess).
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        pendingWithdrawals[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Activate or deactivate sales of a model. Creator or contract owner only.
    function setModelActive(uint256 tokenId, bool status) external {
        ModelMetadata storage model = modelRegistry[tokenId];
        require(model.creator != address(0), "Model does not exist");
        require(
            msg.sender == model.creator || msg.sender == owner(),
            "Not creator or owner"
        );

        model.isActive = status;
        emit ModelStatusChanged(tokenId, status);
    }

    /// @notice Replace the metadata base URI (owner only).
    function setURI(string calldata newUri) external onlyOwner {
        _setURI(newUri);
    }

    function _validLength(string calldata s) private pure returns (bool) {
        uint256 len = bytes(s).length;
        return len > 0 && len <= MAX_STRING_LENGTH;
    }

    // Required override: ERC1155 + ERC1155Supply (OpenZeppelin v5)
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }
}
