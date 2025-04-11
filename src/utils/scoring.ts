// Letter point values based on Scrabble scoring
export const LETTER_POINTS: { [key: string]: number } = {
  'A': 1, 'E': 1, 'I': 1, 'O': 1, 'U': 1, 'L': 1, 'N': 1, 'S': 1, 'T': 1, 'R': 1,
  'D': 2, 'G': 2,
  'B': 3, 'C': 3, 'M': 3, 'P': 3,
  'F': 4, 'H': 4, 'V': 4, 'W': 4, 'Y': 4,
  'K': 5,
  'J': 8, 'X': 8,
  'Q': 10, 'Z': 10
}

// Calculate score for a single word
export const calculateWordScore = (word: string): number => {
  return word
    .toUpperCase()
    .split('')
    .reduce((score, letter) => score + (LETTER_POINTS[letter] || 0), 0)
}

// Calculate total score for multiple words
export const calculateTotalScore = (words: string[]): number => {
  return words.reduce((total, word) => total + calculateWordScore(word), 0)
} 