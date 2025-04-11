const LETTER_FREQUENCIES: { [key: string]: number } = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1,
  K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6,
  U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1
}

const LETTER_POOL: string[] = []
Object.entries(LETTER_FREQUENCIES).forEach(([letter, count]) => {
  for (let i = 0; i < count; i++) {
    LETTER_POOL.push(letter)
  }
})

export const generateLetters = (count: number = 5): string[] => {
  const shuffled = [...LETTER_POOL].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
} 