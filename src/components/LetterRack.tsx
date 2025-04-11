import React from 'react'
import { useDrag } from 'react-dnd'
import { LetterTile } from './LetterTile'
import './LetterRack.css'

interface LetterRackProps {
  letters: string[]
  onGenerateNewLetters: () => void
}

export const LetterRack: React.FC<LetterRackProps> = ({
  letters,
  onGenerateNewLetters
}) => {
  return (
    <div className="letter-rack">
      <div className="letters">
        {letters.map((letter, index) => (
          <DraggableLetter key={`${letter}-${index}`} letter={letter} />
        ))}
      </div>
      <button onClick={onGenerateNewLetters} className="generate-button">
        Generate New Letters
      </button>
    </div>
  )
}

interface DraggableLetterProps {
  letter: string
}

const DraggableLetter: React.FC<DraggableLetterProps> = ({ letter }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'LETTER',
    item: { letter },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    })
  }))

  return (
    <div
      ref={drag}
      className={`letter-tile-container ${isDragging ? 'dragging' : ''}`}
    >
      <LetterTile letter={letter} />
    </div>
  )
} 