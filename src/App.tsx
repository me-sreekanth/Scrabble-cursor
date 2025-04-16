import React, { useState, useEffect } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Board } from './components/Board'
import { LetterRack } from './components/LetterRack'
import { generateLetters } from './utils/letterGenerator'
import { findWords, isValidWord, isValidPlacement } from './utils/wordValidator'
import './App.css'
import { calculateTotalScore } from './utils/scoring'
import { ethers, BrowserProvider, Contract } from 'ethers';
import ScrabbleABI from './ScrabbleABI.json';

const BOARD_SIZE = 15

const App: React.FC = () => {
  const [letters, setLetters] = useState<string[]>(generateLetters())
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
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [account, setAccount] = useState<string>('');
  
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

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        setAccount(address);
        setIsConnected(true);
        localStorage.setItem('connectedAccount', address);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        setMessage({ text: 'Failed to connect wallet.', type: 'error' });
      }
    } else {
      console.error("No Ethereum provider found");
      setMessage({ text: 'No Ethereum provider found. Please install MetaMask or another wallet.', type: 'error' });
    }
  };

  useEffect(() => {
    const storedAccount = localStorage.getItem('connectedAccount');
    if (storedAccount) {
      setAccount(storedAccount);
      setIsConnected(true);
    }
  }, []);



  const disconnectWallet = () => {
    setIsConnected(false);
    setAccount('');
  };
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
  const handleSubmitWord = () => {
    setIsSubmitting(true);
    const words = findWords(board, lockedCells);
    console.log('Found words:', words);

    if (words.length === 0) {
        setMessage({ text: 'No valid words found on the board', type: 'error' });
        setIsSubmitting(false);
        return;
    }

    // Basic validation for testing.
    const isValid = words.length > 0; 
    if (!isValid) {
        setMessage({ text: 'Invalid word.', type: 'error' });
    }

    setMessage({ text: 'Word submitted successfully!', type: 'success' });
    setIsSubmitting(false);
  }
  const handleSubmitWord = () => {
    setIsSubmitting(true);
    setMessage({ text: 'Word submitted successfully!', type: 'success' });
    setIsSubmitting(false);
    setLockedCells(prevLockedCells =>
      prevLockedCells.map(row => row.map(() => true))

    );
    setScore(prevScore => prevScore + 10);
  };
  return (
    <div className="app">

      {!isConnected ? (
        <button onClick={connectWallet} className="connect-button">
          Connect Wallet
        </button>
      ) : (
        <>

          <div className="game-header">
            <h1 className="game-title">Scrabble PWA</h1>
            {isConnected && (
              <div className="account-info">                
                <span className="account-address">{account}</span><button className="log-out-button" onClick={disconnectWallet}>Disconnect</button>
              </div>
            
                           



            )}
             <div className="score-container">
              <div className="score-label">Total Score</div>
              <div className="total-score">{score}</div>
              {lastWordScore > 0 && (
                <div className="last-word-score">+{lastWordScore} points</div>
              )}
            </div>
          </div>
          <DndProvider backend={HTML5Backend}>
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

                  <div className="current-word">
                    <span className="current-word-label">Current Word</span>{currentWord}

                  </div>

                  {message.text && (
                    <div className={`message ${message.type}`}>
                      {message.text}
                    </div>
                  )}
                </div>

                <LetterRack
                  letters={letters}
                  onGenerateNewLetters={() => {
                    setLetters(generateLetters());
                  }}
                />
                <div className="controls">
                  <button
                    onClick={handleSubmitWord}
                    className="submit-button"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Word"}
                  </button>
                </div>
              </div>
            </div>
          </DndProvider>
        </>
      )}
    </div>
  );
}

export default App 