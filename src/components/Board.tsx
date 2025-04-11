import React from 'react'
import { useDrop } from 'react-dnd'
import './Board.css'

interface BoardProps {
  board: string[][]
  lockedCells: boolean[][]
  onLetterDrop: (row: number, col: number, letter: string) => void
  onLetterRemove: (row: number, col: number, letter: string) => void
}

export const Board: React.FC<BoardProps> = ({
  board,
  lockedCells,
  onLetterDrop,
  onLetterRemove,
}) => {
  const renderCell = (row: number, col: number) => {
    const letter = board[row][col]
    const isLocked = lockedCells[row][col]

    const [{ isOver, canDrop }, drop] = useDrop({
      accept: 'letter',
      canDrop: () => !isLocked,
      drop: (item: { letter: string }) => {
        onLetterDrop(row, col, item.letter)
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    })

    const handleClick = () => {
      if (letter && !isLocked) {
        onLetterRemove(row, col, letter)
      }
    }

    const cellClassName = [
      'board-cell',
      isLocked ? 'locked' : '',
      !isLocked && (isOver || letter) ? 'droppable' : '',
      isOver && canDrop ? 'can-drop' : '',
      isOver && !canDrop ? 'cant-drop' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div
        key={`${row}-${col}`}
        ref={drop}
        className={cellClassName}
        onClick={handleClick}
      >
        <div className="board-cell-content">
          {letter}
        </div>
      </div>
    )
  }

  return (
    <div className="board">
      {board.map((row, rowIndex) =>
        row.map((_, colIndex) => renderCell(rowIndex, colIndex))
      )}
    </div>
  )
}

export default Board 