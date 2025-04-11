import React from 'react'
import './LetterTile.css'

interface LetterTileProps {
  letter: string
  isLocked?: boolean
}

export const LetterTile: React.FC<LetterTileProps> = ({ letter, isLocked = false }) => {
  return (
    <div className={`letter-tile ${isLocked ? 'locked' : ''}`}>
      <span className="letter">{letter}</span>
    </div>
  )
} 