import React from 'react'
import { useDrop } from 'react-dnd'
import './Cell.css'

interface CellProps {
  letter: string
  row: number
  col: number
  onLetterRemove: (row: number, col: number, letter: string) => void
  isLocked: boolean
}

export const Cell: React.FC<CellProps> = ({ 
  letter, 
  row, 
  col, 
  onLetterRemove, 
  isLocked 
}) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'LETTER',
    canDrop: () => !isLocked,
    drop: (item: { letter: string }) => {
      onLetterRemove(row, col, letter)
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