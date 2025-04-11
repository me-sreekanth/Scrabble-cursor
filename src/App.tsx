import React, { useState, useEffect } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Board } from './components/Board'
import { LetterRack } from './components/LetterRack'
import { generateLetters } from './utils/letterGenerator'
import { findWords, isValidWord, isValidPlacement } from './utils/wordValidator'
import './App.css'
import { calculateWordScore, calculateTotalScore } from './utils/scoring'

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

  const handleGenerateNewLetters = () => {
    console.log('Generating new letters')
    const newLetters = generateLetters()
    setLetters(prevLetters => [...prevLetters, ...newLetters])
    setMessage({ text: 'New letters generated!', type: 'info' })
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
        <div className="game-header">
          <h1 className="game-title">Scrabble PWA</h1>
          <div className="score-container">
            <div className="score-label">Total Score</div>
            <div className="total-score">{score}</div>
            {lastWordScore > 0 && (
              <div className="last-word-score">+{lastWordScore} points</div>
            )}
          </div>
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
      </div>
    </DndProvider>
  )
}

export default App 