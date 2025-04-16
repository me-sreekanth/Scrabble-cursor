const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const fs = require('fs');

function generateMerkleRoot(words) {
  const leaves = words.map(word => keccak256(word));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = tree.getHexRoot();
  return root;
}

try {
  const rawData = fs.readFileSync('words.json');
  const words = JSON.parse(rawData);
  const merkleRoot = generateMerkleRoot(words);
  console.log('Merkle Root:', merkleRoot);
} catch (error) {
  console.error('Error:', error);
}