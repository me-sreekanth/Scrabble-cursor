import React from 'react'
import { useDrag } from 'react-dnd'
import './LetterRack.css'

interface LetterRackProps {
  letters: string[]
  onGenerateNewLetters: () => void
}

interface DraggableLetterProps {
  letter: string
  index: number
}

const DraggableLetter: React.FC<DraggableLetterProps> = ({ letter, index }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'LETTER',
    item: { letter },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  return (
    <div
      key={`${letter}-${index}`}
      ref={drag}
      className={`letter ${isDragging ? 'dragging' : ''}`}
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
      <div className="letter-rack-title">Your Letters</div>
      <div className="letter-container">
        {letters.map((letter, index) => (
          <DraggableLetter key={`${letter}-${index}`} letter={letter} index={index} />
        ))}
      </div>
      <button onClick={onGenerateNewLetters} className="generate-letters-button">
        Claim Letters
      </button>
    </div>
  )
}

export default LetterRack 