//solidity
// contracts/Scrabble.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

contract Scrabble is ERC1155, ERC1155Supply {
    using Strings for uint256;
    uint256 private constant ALPHABET_LENGTH = 26;
    uint256 private nextTokenId;
    string private baseTokenURI;
    bytes32 public merkleRoot;
    uint256 public constant BOARD_SIZE = 15;
    
    mapping(address => uint256[]) public userTokens;
    mapping(uint256 => bytes1) public tokenLetters;
    mapping(address => bytes1[BOARD_SIZE][BOARD_SIZE]) public userBoard;
    mapping(address => bool[BOARD_SIZE][BOARD_SIZE]) public userBlockedCells;
    
    modifier onlyNewUser(address user) {
        require(userTokens[user].length == 0, "User already has minted tokens");
        _;
    }
    
    constructor() ERC1155("") {
        // Initial merkleRoot can be set here or later with setMerkleRoot
        merkleRoot = 0x0000000000000000000000000000000000000000000000000000000000000000;
        nextTokenId = 1;
        baseTokenURI = "ipfs://QmYourBaseURI/"; // Default base URI
    }

    function setMerkleRoot(bytes32 _merkleRoot) external {
        merkleRoot = _merkleRoot;
    }

    function verifyWord(bytes32 leaf, bytes32[] memory proof) public view returns (bool) {
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }

    function mintAlphabetTokens(address user) internal onlyNewUser(user) {
        uint256[] memory tokenIds = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, user, i)));
            uint256 letterIndex = random % ALPHABET_LENGTH;
            bytes1 letter = bytes1(uint8(letterIndex + 65)); // 'A' is ASCII 65
            uint256 tokenId = nextTokenId++;
            tokenIds[i] = tokenId;
            tokenLetters[tokenId] = letter;
            _mint(user, tokenId, 1, "");
            _setURI(baseTokenURI);
        }
        userTokens[user] = tokenIds;
    }

    function getUserTokens(address user) external view returns (uint256[] memory) {
        return userTokens[user];
    }

    function getUserLetters(address user) external returns (uint256[] memory) {
        uint256[] memory newTokenIds = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, user, i)));
            uint256 letterIndex = random % ALPHABET_LENGTH;
            bytes1 letter = bytes1(uint8(letterIndex + 65)); // 'A' is ASCII 65
            uint256 tokenId = nextTokenId++;
            newTokenIds[i] = tokenId;
            tokenLetters[tokenId] = letter;
            _mint(user, tokenId, 1, "");
            _setURI(baseTokenURI);
        }
        
        // Append new token IDs to existing ones
        uint256[] memory existingTokens = userTokens[user];
        uint256[] memory allTokens = new uint256[](existingTokens.length + newTokenIds.length);
        
        for (uint256 i = 0; i < existingTokens.length; i++) {
            allTokens[i] = existingTokens[i];
        }
        
        for (uint256 i = 0; i < newTokenIds.length; i++) {
            allTokens[existingTokens.length + i] = newTokenIds[i];
        }
        
        userTokens[user] = allTokens;
        return allTokens;
    }

    function getTokenLetter(uint256 tokenId) external view returns (bytes1) {
        return tokenLetters[tokenId];
    }

    function submitWord(address user, bytes[BOARD_SIZE][BOARD_SIZE] memory board, string memory word, bytes32[] memory proof) external {        
        // Check if the word is valid
        bytes32 wordHash = keccak256(abi.encodePacked(word));
        require(verifyWord(wordHash, proof), "Invalid word");

        bytes1[BOARD_SIZE][BOARD_SIZE] memory newBoard = convertToBytes1Board(board);
        for (uint256 i = 0; i < BOARD_SIZE; i++) {
            for (uint256 j = 0; j < BOARD_SIZE; j++) {
                if (board[i][j].length > 0) {
                    bytes1 currentLetter = userBoard[user][i][j];
                    if (currentLetter != 0 && currentLetter != newBoard[i][j]) {
                        userBlockedCells[user][i][j] = true;
                    }
                }
            }
        }
        
        // Burn tokens used in the word
        for (uint256 i = 0; i < BOARD_SIZE; i++) {
            for (uint256 j = 0; j < BOARD_SIZE; j++) {
                if(userBoard[user][i][j] != bytes1(0)) {
                    for(uint256 k = 0; k < userTokens[user].length; k++){
                         if(tokenLetters[userTokens[user][k]] == userBoard[user][i][j]) {
                            _burn(user, userTokens[user][k], 1);
                        }
                    }
                }
                
            }
        }

        userBoard[user] = newBoard;
        //mint new tokens
        mintAlphabetTokens(user);
    }

    function convertToBytes1Board(bytes[BOARD_SIZE][BOARD_SIZE] memory stringBoard) private pure returns (bytes1[BOARD_SIZE][BOARD_SIZE] memory) {
        bytes1[BOARD_SIZE][BOARD_SIZE] memory bytes1Board;

        for (uint256 i = 0; i < BOARD_SIZE; i++) {
            for (uint256 j = 0; j < BOARD_SIZE; j++) {
                if (stringBoard[i][j].length > 0) {
                    bytes1Board[i][j] = bytes1(stringBoard[i][j][0]);
                } else {
                    bytes1Board[i][j] = bytes1(0);
                }
            }
        }
        return bytes1Board;
    }
    
    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(baseTokenURI, Strings.toString(tokenId), ".json"));
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }
}