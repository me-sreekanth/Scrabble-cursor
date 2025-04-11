import React from 'react'
import { useDrag } from 'react-dnd'
import './LetterRack.css'

interface LetterRackProps {
  letters: string[]
  onGenerateNewLetters: () => void
}

interface DraggableLetterProps {
  letter: string
}

const DraggableLetter: React.FC<DraggableLetterProps> = ({ letter }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'letter',
    item: { letter },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  return (
    <div
      ref={drag}
      className={`letter-tile ${isDragging ? 'dragging' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {letter}
    </div>
  )
}

export const LetterRack: React.FC<LetterRackProps> = ({
  letters,
  onGenerateNewLetters,
}) => {
  return (
    <div className="letter-rack">
      <div className="letter-tiles">
        {letters.map((letter, index) => (
          <DraggableLetter key={`${letter}-${index}`} letter={letter} />
        ))}
      </div>
      <button className="generate-button" onClick={onGenerateNewLetters}>
        Generate New Letters
      </button>
    </div>
  )
}

export default LetterRack 