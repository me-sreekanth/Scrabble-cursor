import React, { useState, useEffect } from 'react'
import { Board } from './components/Board'
import { LetterRack } from './components/LetterRack'
import { generateLetters } from './utils/letterGenerator'
import { findWords, isValidWord, isValidPlacement } from './utils/wordValidator'
import './App.css'

const BOARD_SIZE = 15

const App: React.FC = () => {
  const [letters, setLetters] = useState<string[]>(generateLetters())
  const [board, setBoard] = useState<string[][]>(
    Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(''))
  )
  const [lockedCells, setLockedCells] = useState<boolean[][]>(
    Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false))
  )
  const [message, setMessage] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [currentWord, setCurrentWord] = useState<string>('')

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
    setLetters(prevLetters => [...prevLetters, ...generateLetters()])
  }

  const handleLetterDrop = (row: number, col: number, letter: string) => {
    if (isSubmitting || lockedCells[row][col]) return
    
    console.log('Handling letter drop:', { row, col, letter })

    // Check if the placement is valid
    if (!isValidPlacement(board, row, col, letter, lockedCells)) {
      setMessage('Invalid letter placement. Letter must form valid words with adjacent letters.')
      return
    }
    
    // Remove the letter from the rack
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

    // Update the board
    setBoard(prevBoard => {
      const newBoard = prevBoard.map(r => [...r])
      newBoard[row][col] = letter
      console.log('Updated board at position:', { row, col, letter })
      return newBoard
    })
    setMessage('')
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
      setMessage('No words found on the board')
      setIsSubmitting(false)
      return
    }

    // Extract just the word part without location for validation
    const wordsToValidate = words.map(word => word.split(' (')[0])
    
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
      setMessage(`Invalid words found: ${invalidWords.join(', ')}`)
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
      setMessage(`Valid words: ${words.join(', ')}`)
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
    setIsSubmitting(false)
  }

  return (
    <div className="app">
      <h1>Scrabble PWA</h1>
      <div className="game-container">
        <Board 
          board={board} 
          onLetterDrop={handleLetterDrop} 
          onLetterRemove={handleLetterRemove}
          lockedCells={lockedCells} 
        />
        <LetterRack
          letters={letters}
          onGenerateNewLetters={handleGenerateNewLetters}
        />
        {currentWord && (
          <div className="current-word">
            Current Word: {currentWord}
          </div>
        )}
        <button 
          onClick={handleSubmitWord} 
          className="submit-button"
          disabled={isSubmitting}
        >
          Submit Word
        </button>
        {message && <div className="message">{message}</div>}
      </div>
    </div>
  )
}

export default App 