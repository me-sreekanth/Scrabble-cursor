import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ScrabbleABI from '../ScrabbleABI.json'; // Assuming this is where your ABI is

interface ScrabbleContract {
  getUserLetters: (address: string) => Promise<string[]>;
  submitWord: (user: string, board: string[][], word: string, proof: string[]) => Promise<void>;
  // Add other functions as needed, based on your ABI
}

interface Web3ContextType {
  contract: ScrabbleContract | null;
  account: string | null;
    connectWallet: () => Promise<void>;
    getUserLetters: () => Promise<string[] | undefined>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);
export const useWeb3 = () => useContext(Web3Context);
export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contract, setContract] = useState<ScrabbleContract | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // Replace with your deployed contract address

  const getContract = async (provider: ethers.BrowserProvider, signer?: ethers.Signer) => {
    return new ethers.Contract(
      contractAddress,
      ScrabbleABI,
      signer ?? provider
    ) as unknown as ScrabbleContract;
  }

  const connectWallet = async () => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      try {
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        setAccount(address);
        const newContract = await getContract(provider, signer);
        setContract(newContract);
        localStorage.setItem('connectedAccount', address);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    }
  };

  const getUserLetters = async (): Promise<string[] | undefined> => {
    if (contract && account) {
      const lettersBytes = await contract.getUserLetters(account);
      if(lettersBytes){
        return lettersBytes.map((byte: any) => String.fromCharCode(parseInt(byte, 16)))
      }else {
        return undefined;
      }
    }
    return undefined;
  };

  useEffect(() => {
    const storedAccount = localStorage.getItem('connectedAccount');
    if (storedAccount && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      setAccount(storedAccount);
      getContract(provider).then(setContract).catch(e => {
        console.error("error getting contract", e)
      })
    }
  }, []);
  return (
    <Web3Context.Provider value={{contract, account, connectWallet, getUserLetters}}>
      {children}
    </Web3Context.Provider>
  );
};