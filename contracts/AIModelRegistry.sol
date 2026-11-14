// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AIModelRegistry is ERC1155, Ownable {
	struct ModelMetadata {
		string modelName;
		string creator;
		uint256 basePrice;
		bool isActive;
	}

	mapping(uint256 => ModelMetadata) public modelRegistry;
	uint256 public nextTokenId;

	event ModelRegistered(uint256 indexed tokenId, string modelName, address creator, uint256 basePrice);
	event LicenseAcquired(uint256 indexed tokenId, address indexed buyer, uint256 quantity);

	constructor() ERC1155("https://nuvyrahub.org/api/metadata/{id}.json") Ownable(msg.sender) {}

	function registerModel(
		string memory name,
		string memory creatorHandle,
		uint256 price,
		uint256 initialSupply
	) external returns (uint256) {
		uint256 tokenId = nextTokenId++;

		modelRegistry[tokenId] = ModelMetadata({
			modelName: name,
			creator: creatorHandle,
			basePrice: price,
			isActive: true
		});

		_mint(msg.sender, tokenId, initialSupply, "");

		emit ModelRegistered(tokenId, name, msg.sender, price);
		return tokenId;
	}

	function acquireLicense(uint256 tokenId, uint256 quantity) external payable {
		ModelMetadata memory model = modelRegistry[tokenId];
		require(model.isActive, "Model is not active");
		require(msg.value >= model.basePrice * quantity, "Insufficient ETH sent for license");

		_mint(msg.sender, tokenId, quantity, "");
		emit LicenseAcquired(tokenId, msg.sender, quantity);
	}

	function setModelActive(uint256 tokenId, bool status) external onlyOwner {
		modelRegistry[tokenId].isActive = status;
	}
}
