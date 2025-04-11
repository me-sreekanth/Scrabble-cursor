// This is a simple word validator that uses a dictionary API
// You can replace this with a local dictionary if needed

const API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/'

export const isValidWord = async (word: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}${word.toLowerCase()}`)
    if (response.ok) {
      return true
    }
    return false
  } catch (error) {
    console.error('Error validating word:', error)
    return false
  }
}

// Helper function to get a word at a position in a given direction
const getWordAtPosition = (
  board: string[][],
  row: number,
  col: number,
  direction: 'horizontal' | 'vertical'
): { word: string; start: number; end: number } | null => {
  const size = board.length
  let word = ''
  let start = 0
  let startRow = row
  let startCol = col

  // Look backwards
  if (direction === 'horizontal') {
    while (startCol >= 0 && board[row][startCol]) {
      startCol--
    }
    startCol++
    start = startCol

    // Build the word horizontally
    let end = start
    while (end < size && board[row][end]) {
      word += board[row][end]
      end++
    }
    
    return word.length >= 2 ? { word, start, end: end - 1 } : null
  } else {
    // Vertical word
    while (startRow >= 0 && board[startRow][col]) {
      startRow--
    }
    startRow++
    start = startRow

    // Build the word vertically
    let end = start
    while (end < size && board[end][col]) {
      word += board[end][col]
      end++
    }
    
    return word.length >= 2 ? { word, start, end: end - 1 } : null
  }
}

export const findWords = (board: string[][], lockedCells: boolean[][]): string[] => {
  const words: string[] = []
  const size = board.length
  const seen = new Set<string>() // To track unique word positions

  // Helper function to check if a word contains any unlocked letters
  const hasUnlockedLetters = (
    startRow: number, 
    startCol: number, 
    endRow: number, 
    endCol: number
  ): boolean => {
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        if (board[row][col] && !lockedCells[row][col]) {
          return true
        }
      }
    }
    return false
  }

  // Check each cell for words
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!board[row][col]) continue

      // Check horizontal word
      const horizontalWord = getWordAtPosition(board, row, col, 'horizontal')
      if (horizontalWord && !seen.has(`h${row}${horizontalWord.start}`)) {
        // Include the word if it contains at least one unlocked letter
        if (hasUnlockedLetters(row, horizontalWord.start, row, horizontalWord.end)) {
          words.push(`${horizontalWord.word} (Row ${row + 1}, Cols ${horizontalWord.start + 1}-${horizontalWord.end + 1})`)
        }
        seen.add(`h${row}${horizontalWord.start}`)
      }

      // Check vertical word
      const verticalWord = getWordAtPosition(board, row, col, 'vertical')
      if (verticalWord && !seen.has(`v${col}${verticalWord.start}`)) {
        // Include the word if it contains at least one unlocked letter
        if (hasUnlockedLetters(verticalWord.start, col, verticalWord.end, col)) {
          words.push(`${verticalWord.word} (Col ${col + 1}, Rows ${verticalWord.start + 1}-${verticalWord.end + 1})`)
        }
        seen.add(`v${col}${verticalWord.start}`)
      }
    }
  }

  return words
}

// Helper function to check if a letter placement creates valid words
export const isValidPlacement = (
  board: string[][],
  row: number,
  col: number,
  letter: string,
  lockedCells: boolean[][]
): boolean => {
  const size = board.length
  const hasAdjacentLetter = (
    (row > 0 && board[row - 1][col]) ||
    (row < size - 1 && board[row + 1][col]) ||
    (col > 0 && board[row][col - 1]) ||
    (col < size - 1 && board[row][col + 1])
  )

  // If there are no adjacent letters, allow placement
  if (!hasAdjacentLetter) {
    return true
  }

  // Create a temporary board with the new letter
  const tempBoard = board.map(r => [...r])
  tempBoard[row][col] = letter

  // Get all possible words that would be formed
  const horizontalWord = getWordAtPosition(tempBoard, row, col, 'horizontal')
  const verticalWord = getWordAtPosition(tempBoard, row, col, 'vertical')

  // If there are adjacent letters, ensure at least one valid word is formed
  const hasValidHorizontal = horizontalWord !== null && horizontalWord.word.length >= 2
  const hasValidVertical = verticalWord !== null && verticalWord.word.length >= 2

  return hasValidHorizontal || hasValidVertical
} 