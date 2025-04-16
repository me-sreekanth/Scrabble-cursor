import contractDetails from '../contracts/Scrabble.json';

export const getContractDetails = () => {
  return contractDetails;
};

export const getContractAddress = () => {
  return contractDetails.address;
};

export const getContractABI = () => {
  return contractDetails.abi;
}; 