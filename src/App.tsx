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

const BOARD_SIZE = 15

const App: React.FC = () => {
  const [letters, setLetters] = useState<string[]>([])
  const [board, setBoard] = useState<string[][]>(
    Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(''))
  )
  const [lockedCells, setLockedCells] = useState<boolean[][]>(
    Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false))
  )
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' }>({ text: '', type: 'info' })
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [currentWord, setCurrentWord] = useState<string>('')
  const [score, setScore] = useState<number>(0)
  const [lastWordScore, setLastWordScore] = useState<number>(0)
  const [moveCount, setMoveCount] = useState<number>(0)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [account, setAccount] = useState<string>('')
  const [contractAddress, setContractAddress] = useState<string>('0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9') // Updated to new deployed contract address
  const [contract, setContract] = useState<ethers.Contract | null>(null)

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

        const contract = new ethers.Contract(contractAddress, [
          // ERC1155 Events
          "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
          "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)",
          
          // Contract Functions
          "function getUserLetters(address) returns (uint256[])",
          "function getUserTokens(address) view returns (uint256[])",
          "function getTokenLetter(uint256) view returns (bytes1)",
          "function submitWord(address,bytes[15][15],string,bytes32[])",
          "function verifyWord(bytes32,bytes32[]) view returns (bool)"
        ], signer)
        setContract(contract)

        // Load user's existing letters after connection
        try {
          setMessage({ text: 'Loading your letters...', type: 'info' })
          
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
            setMessage({ text: 'Letters loaded successfully!', type: 'success' })
          } else {
            setMessage({ text: 'No letters found. Click "Claim Letters" to start playing!', type: 'info' })
          }
        } catch (error) {
          console.error('Error loading letters:', error)
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

  const handleLetterDrop = (row: number, col: number, letter: string) => {
    if (isSubmitting || lockedCells[row][col]) {
      setMessage({ text: 'This cell is locked!', type: 'error' })
      return
    }
    
    console.log('Handling letter drop:', { row, col, letter })

    if (!isValidPlacement(board, row, col, letter, lockedCells)) {
      setMessage({ 
        text: 'Invalid placement. Letters must form valid words with adjacent letters.', 
        type: 'error' 
      })
      return
    }
    
    setLetters(prevLetters => {
      const letterIndex = prevLetters.indexOf(letter)
      if (letterIndex === -1) {
        console.log('Letter not found in rack:', letter)
        return prevLetters
      }
      const newLetters = [...prevLetters.slice(0, letterIndex), ...prevLetters.slice(letterIndex + 1)]
      console.log('Updated letters:', newLetters)
      return newLetters
    })

    setBoard(prevBoard => {
      const newBoard = prevBoard.map(r => [...r])
      newBoard[row][col] = letter
      console.log('Updated board at position:', { row, col, letter })
      return newBoard
    })
    
    setMoveCount(prev => prev + 1)
    setMessage({ text: '', type: 'info' })
  }

  const handleLetterRemove = (row: number, col: number, letter: string) => {
    if (isSubmitting || lockedCells[row][col]) return

    console.log('Removing letter:', { row, col, letter })
    
    // Add the letter back to the rack
    setLetters(prevLetters => [...prevLetters, letter])

    // Clear the board cell
    setBoard(prevBoard => {
      const newBoard = prevBoard.map(r => [...r])
      newBoard[row][col] = ''
      return newBoard
    })
  }

  const handleSubmitWord = async () => {
    setIsSubmitting(true)
    const words = findWords(board, lockedCells)
    console.log('Found words:', words)
    
    if (words.length === 0) {
      setMessage({ text: 'No valid words found on the board', type: 'error' })
      setIsSubmitting(false)
      return
    }

    const wordsToValidate = words.map(word => word.split(' (')[0])
    
    try {
      const validationResults = await Promise.all(
        wordsToValidate.map(async (word) => ({
          word,
          isValid: await isValidWord(word)
        }))
      )

      const invalidWords = validationResults
        .filter((result) => !result.isValid)
        .map((result) => result.word)

      if (invalidWords.length > 0) {
        setMessage({ 
          text: `Invalid words found: ${invalidWords.join(', ')}`, 
          type: 'error' 
        })
        // Clear the invalid words from the board and return letters to rack
        setBoard(prevBoard => {
          const newBoard = prevBoard.map(r => [...r])
          // Find all cells that are not locked and contain letters
          const lettersToReturn: string[] = []
          for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
              if (newBoard[row][col] && !lockedCells[row][col]) {
                lettersToReturn.push(newBoard[row][col])
                newBoard[row][col] = ''
              }
            }
          }
          // Return the letters to the rack
          setLetters(prevLetters => [...prevLetters, ...lettersToReturn])
          return newBoard
        })
      } else {
        const wordScore = calculateTotalScore(wordsToValidate)
        setLastWordScore(wordScore)
        setScore(prevScore => prevScore + wordScore)
        setMessage({ 
          text: `Words submitted successfully! +${wordScore} points`, 
          type: 'success' 
        })
        // Lock the cells that contain the valid words
        setLockedCells(prevLocked => {
          const newLocked = prevLocked.map(r => [...r])
          // Only lock cells that are part of the newly formed words
          words.forEach(wordWithLocation => {
            const [, location] = wordWithLocation.split(' (')
            const [type, range] = location.split(', ')
            const [typeValue, number] = type.split(' ')
            const [, rangeValues] = range.split(' ')
            const [start, end] = rangeValues.split('-').map(n => parseInt(n) - 1)

            if (typeValue === 'Row') {
              const row = parseInt(number) - 1
              for (let col = start; col <= end; col++) {
                if (board[row][col] && !newLocked[row][col]) {
                  newLocked[row][col] = true
                }
              }
            } else { // Column
              const col = parseInt(number) - 1
              for (let row = start; row <= end; row++) {
                if (board[row][col] && !newLocked[row][col]) {
                  newLocked[row][col] = true
                }
              }
            }
          })
          return newLocked
        })
        // Generate new letters after successful word submission
        setLetters(prevLetters => [...prevLetters, ...generateLetters()])
        // Clear the current word display
        setCurrentWord('')
      }
    } catch (error) {
      setMessage({ 
        text: 'Error validating words. Please try again.', 
        type: 'error' 
      })
    }
    
    setIsSubmitting(false)
  }

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