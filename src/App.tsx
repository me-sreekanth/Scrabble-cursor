import React, { useState, useEffect } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Board } from './components/Board'
import { LetterRack } from './components/LetterRack'
import { generateLetters } from './utils/letterGenerator'
import { findWords, isValidWord, isValidPlacement } from './utils/wordValidator'
import './App.css'
import { calculateWordScore, calculateTotalScore } from './utils/scoring'
import { ethers } from 'ethers'
import { getContractAddress, getContractABI } from './utils/contractUtils'

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (accounts: string[]) => void) => void;
      removeListener: (event: string, callback: (accounts: string[]) => void) => void;
    };
  }
}

const App: React.FC = () => {
  const [boardSize, setBoardSize] = useState<number>(20) // Initialize with 20, will be updated from contract
  const [letters, setLetters] = useState<string[]>([])
  const [board, setBoard] = useState<string[][]>(
    Array.from({ length: 20 }, () => Array(20).fill(''))
  )
  const [lockedCells, setLockedCells] = useState<boolean[][]>(
    Array.from({ length: 20 }, () => Array(20).fill(false))
  )
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' }>({ text: '', type: 'info' })
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [currentWord, setCurrentWord] = useState<string>('')
  const [score, setScore] = useState<number>(0)
  const [lastWordScore, setLastWordScore] = useState<number>(0)
  const [moveCount, setMoveCount] = useState<number>(0)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [account, setAccount] = useState<string>('')
  const [contractAddress, setContractAddress] = useState<string>(getContractAddress())
  const [contract, setContract] = useState<ethers.Contract | null>(null)

  // Add contract functions for board state
  const getBoardState = async () => {
    if (!contract || !account) return
    try {
      // Get board size from contract
      const size = await contract.BOARD_SIZE()
      setBoardSize(Number(size))
      
      const boardState = await contract.getUserBoard(account)
      const newBoard = Array(20).fill(null).map(() => Array(20).fill(null))
      const newLockedCells = Array(20).fill(null).map(() => Array(20).fill(false))
      
      for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 20; j++) {
          const cell = boardState[i][j]
          if (cell !== '0x00') {
            newBoard[i][j] = cell
            newLockedCells[i][j] = true
          }
        }
      }
      
      setBoard(newBoard)
      setLockedCells(newLockedCells)
    } catch (error) {
      console.error('Error loading board state:', error)
    }
  }

  // Update board state in contract
  const updateBoardState = async () => {
    if (!contract || !account) return
    try {
      const bytesBoard = board.map(row => 
        row.map(cell => cell || '0x00')
      )
      await contract.updateBoardState(bytesBoard)
    } catch (error) {
      console.error('Error updating board state:', error)
    }
  }

  // Handle wallet connection
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        await provider.send("eth_requestAccounts", [])
        const signer = await provider.getSigner()
        const address = await signer.getAddress()
        
        setAccount(address)
        setIsConnected(true)
        localStorage.setItem('connectedAccount', address)
        setMessage({ text: 'Wallet connected successfully!', type: 'success' })

        const contract = new ethers.Contract(contractAddress, getContractABI(), signer)
        setContract(contract)

        // Load user's existing letters and board state after connection
        try {
          setMessage({ text: 'Loading game state...', type: 'info' })
          
          // Get the user's existing token IDs
          const tokenIds = await contract.getUserTokens(address)
          
          if (tokenIds.length > 0) {
            // Get the letters for existing token IDs
            const letters = await Promise.all(
              tokenIds.map(async (tokenId: any) => {
                const letter = await contract.getTokenLetter(tokenId)
                return String.fromCharCode(Number(letter))
              })
            )
            
            setLetters(letters)
            // Load board state from contract
            await getBoardState()
            setMessage({ text: 'Game state loaded successfully!', type: 'success' })
          } else {
            setMessage({ text: 'No letters found. Click "Claim Letters" to start playing!', type: 'info' })
            // Initialize empty board
            await getBoardState()
          }
        } catch (error) {
          console.error('Error loading game state:', error)
          setMessage({ text: 'No letters found. Click "Claim Letters" to start playing!', type: 'info' })
        }
      } catch (error) {
        console.error("Failed to connect wallet:", error)
        setMessage({ text: 'Failed to connect wallet.', type: 'error' })
      }
    } else {
      setMessage({ text: 'Please install MetaMask to use this application.', type: 'error' })
    }
  }

  // Handle wallet disconnection
  const disconnectWallet = () => {
    setIsConnected(false)
    setAccount('')
    localStorage.removeItem('connectedAccount')
    setMessage({ text: 'Wallet disconnected.', type: 'info' })
    setContract(null)
  }

  // Check for existing connection on load
  useEffect(() => {
    const storedAccount = localStorage.getItem('connectedAccount')
    if (storedAccount && window.ethereum) {
      const reconnectWallet = async () => {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider)
          const accounts = await provider.send("eth_accounts", [])
          if (accounts.length > 0 && accounts[0] === storedAccount) {
            const signer = await provider.getSigner()
            setAccount(storedAccount)
            setIsConnected(true)
            
            const contract = new ethers.Contract(contractAddress, [
              "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
              "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)",
              "function getUserLetters(address) returns (uint256[])",
              "function getUserTokens(address) view returns (uint256[])",
              "function getTokenLetter(uint256) view returns (bytes1)",
              "function submitWord(address,bytes[15][15],string,bytes32[])",
              "function verifyWord(bytes32,bytes32[]) view returns (bool)"
            ], signer)
            setContract(contract)

            // Load user's existing letters after reconnection
            try {
              setMessage({ text: 'Loading your letters...', type: 'info' })
              const tokenIds = await contract.getUserTokens(storedAccount)
              
              if (tokenIds.length > 0) {
                const letters = await Promise.all(
                  tokenIds.map(async (tokenId: any) => {
                    const letter = await contract.getTokenLetter(tokenId)
                    return String.fromCharCode(Number(letter))
                  })
                )
                
                setLetters(letters)
                setMessage({ text: 'Letters loaded successfully!', type: 'success' })
              } else {
                setMessage({ text: 'No letters found. Click "Claim Letters" to start playing!', type: 'info' })
              }
            } catch (error) {
              console.error('Error loading letters:', error)
              setMessage({ text: 'No letters found. Click "Claim Letters" to start playing!', type: 'info' })
            }
          } else {
            // If accounts don't match or no accounts found, clear stored account
            localStorage.removeItem('connectedAccount')
            setAccount('')
            setIsConnected(false)
          }
        } catch (error) {
          console.error('Error reconnecting wallet:', error)
          localStorage.removeItem('connectedAccount')
          setAccount('')
          setIsConnected(false)
        }
      }
      reconnectWallet()
    }
  }, [])

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet()
        } else if (accounts[0] !== account) {
          setAccount(accounts[0])
          localStorage.setItem('connectedAccount', accounts[0])
        }
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [account])

  // Debug effect for board state
  useEffect(() => {
    console.log('Board state updated:', board)
  }, [board])

  // Debug effect for letters state
  useEffect(() => {
    console.log('Letters state updated:', letters)
  }, [letters])

  // Update current word whenever board changes
  useEffect(() => {
    const words = findWords(board, lockedCells)
    if (words.length > 0) {
      setCurrentWord(words.join(', ')) // Show all found words with their locations
    } else {
      setCurrentWord('')
    }
  }, [board, lockedCells])

  const handleGenerateNewLetters = async () => {
    if (!contract || !account) {
      setMessage({ text: 'Please connect your wallet first', type: 'error' })
      return
    }

    try {
      setMessage({ text: 'Generating new letters...', type: 'info' })
      
      // Get new letters
      const tx = await contract.getUserLetters(account)
      await tx.wait()
      
      // Get all token IDs (including existing ones)
      const tokenIds = await contract.getUserTokens(account)
      
      // Get the letters for each token ID
      const newLetters = await Promise.all(
        tokenIds.map(async (tokenId: any) => {
          const letter = await contract.getTokenLetter(tokenId)
          return String.fromCharCode(Number(letter))
        })
      )

      // Update letters state with all letters
      setLetters(newLetters)
      setMessage({ text: 'New letters generated successfully!', type: 'success' })
    } catch (error) {
      console.error('Error generating letters:', error)
      setMessage({ text: 'No letters found. Click "Claim Letters" to start playing!', type: 'info' })
    }
  }

  // Update handleLetterDrop to sync with contract
  const handleLetterDrop = async (row: number, col: number, letter: string) => {
    if (lockedCells[row][col]) return;
    
    const newBoard = [...board];
    newBoard[row][col] = letter;
    setBoard(newBoard);
    
    await updateBoardState();
  };

  const handleLetterRemove = async (row: number, col: number) => {
    if (lockedCells[row][col]) return;
    
    const newBoard = [...board];
    newBoard[row][col] = '';
    setBoard(newBoard);
    
    await updateBoardState();
  };

  const getWordFromBoard = (): string | null => {
    // Find the first non-empty row or column
    for (let i = 0; i < 20; i++) {
      // Check row
      const rowWord = board[i].filter(cell => cell !== '').join('');
      if (rowWord.length > 1) return rowWord;
      
      // Check column
      const colWord = board.map(row => row[i]).filter(cell => cell !== '').join('');
      if (colWord.length > 1) return colWord;
    }
    return null;
  };

  // Update handleSubmitWord to use the correct board size
  const handleSubmitWord = async () => {
    if (!contract || !account) return;
    
    try {
      const bytesBoard = board.map(row => 
        row.map(cell => cell || '0x00')
      );
      
      const word = getWordFromBoard();
      if (!word) {
        alert('Please form a valid word on the board');
        return;
      }
      
      await contract.submitWord(account, bytesBoard, word);
      alert('Word submitted successfully!');
      
      // Refresh board state
      await getBoardState();
    } catch (error) {
      console.error('Error submitting word:', error);
      alert('Failed to submit word. Please try again.');
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app">
        {!isConnected ? (
          <div className="connect-container">
            <h1 className="game-title">Scrabble PWA</h1>
            <p className="connect-message">Connect your wallet to start playing!</p>
            <button onClick={connectWallet} className="connect-button">
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            <div className="game-header">
              <h1 className="game-title">Scrabble PWA</h1>
              <div className="account-info">
                <span className="account-address">
                  {`${account.slice(0, 6)}...${account.slice(-4)}`}
                </span>
                <button className="log-out-button" onClick={disconnectWallet}>
                  Disconnect
                </button>
              </div>
              <div className="score-container">
                <div className="score-label">Total Score</div>
                <div className="total-score">{score}</div>
                {lastWordScore > 0 && (
                  <div className="last-word-score">+{lastWordScore} points</div>
                )}
              </div>
            </div>
            <div className="contract-info">
              <span className="contract-label">Contract Address:</span>
              <span className="contract-address">{contractAddress}</span>
            </div>
            <div className="game-container">
              <div className="game-board-container">
                <Board 
                  board={board} 
                  onLetterDrop={handleLetterDrop} 
                  onLetterRemove={handleLetterRemove}
                  lockedCells={lockedCells} 
                />
              </div>

              <div className="game-sidebar">
                <div className="game-info">
                  <div className="moves">Move #{moveCount}</div>
                  {currentWord && (
                    <div className="current-word">
                      <span className="current-word-label">Current Word</span>
                      {currentWord}
                    </div>
                  )}
                  {message.text && (
                    <div className={`message ${message.type}`}>
                      {message.text}
                    </div>
                  )}
                </div>

                <LetterRack
                  letters={letters}
                  onGenerateNewLetters={handleGenerateNewLetters}
                />

                <button 
                  onClick={handleSubmitWord} 
                  className="submit-button"
                  disabled={isSubmitting || !currentWord}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Word'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </DndProvider>
  )
}

export default App 