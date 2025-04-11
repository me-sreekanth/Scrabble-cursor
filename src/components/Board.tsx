import React from 'react'
import { useDrop } from 'react-dnd'
import { LetterTile } from './LetterTile'
import './Board.css'

interface BoardProps {
  board: string[][]
  onLetterDrop: (row: number, col: number, letter: string) => void
  onLetterRemove: (row: number, col: number, letter: string) => void
  lockedCells: boolean[][]
}

export const Board: React.FC<BoardProps> = ({ board, onLetterDrop, onLetterRemove, lockedCells }) => {
  const renderCell = (row: number, col: number, letter: string) => {
    const [{ isOver }, drop] = useDrop(() => ({
      accept: 'LETTER',
      drop: (item: { letter: string }) => {
        console.log('Dropping letter:', item.letter, 'at position:', row, col)
        onLetterDrop(row, col, item.letter)
      },
      canDrop: () => !lockedCells[row][col],
      collect: (monitor) => ({
        isOver: !!monitor.isOver()
      })
    }))

    const handleClick = () => {
      if (letter && !lockedCells[row][col]) {
        onLetterRemove(row, col, letter)
      }
    }

    return (
      <div
        ref={drop}
        className={`board-cell ${isOver ? 'cell-hover' : ''} ${lockedCells[row][col] ? 'locked' : ''} ${letter ? 'has-letter' : ''}`}
        key={`${row}-${col}`}
        onClick={handleClick}
      >
        {letter && <LetterTile letter={letter} isLocked={lockedCells[row][col]} />}
      </div>
    )
  }

  return (
    <div className="board">
      {board.map((row, rowIndex) => (
        <div className="board-row" key={rowIndex}>
          {row.map((letter, colIndex) =>
            renderCell(rowIndex, colIndex, letter)
          )}
        </div>
      ))}
    </div>
  )
} 