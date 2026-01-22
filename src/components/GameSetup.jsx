// src/components/GameSetup.jsx
import { useState } from 'react';

export default function GameSetup({ 
  players, 
  setPlayers, 
  onStartGame, 
  onViewSavedGames,
  showToast 
}) {
  const [playerName, setPlayerName] = useState('');
  const [nameInvalid, setNameInvalid] = useState(false);

  const addPlayer = () => {
    const name = playerName.trim();
    
    if (!name) {
      showToast('Please enter a player name!', 'error');
      setNameInvalid(true);
      return;
    }
    
    setNameInvalid(false);
    
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      showToast('Player already exists!', 'error');
      setNameInvalid(true);
      return;
    }
    
    setPlayers([...players, { name, score: 0, eliminated: false }]);
    setPlayerName('');
    showToast(`${name} added!`, 'success');
  };

  const removePlayer = (index) => {
    const removedName = players[index].name;
    setPlayers(players.filter((_, i) => i !== index));
    showToast(`${removedName} removed`, 'info');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addPlayer();
    }
  };

  return (
    <div>
      <div className="nav-buttons" style={{ marginBottom: '20px' }}>
        <button className="nav-btn" onClick={onViewSavedGames}>
          📂 My Saved Games
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="playerName">Enter Player Names:</label>
        <input
          type="text"
          id="playerName"
          value={playerName}
          onChange={(e) => {
            setPlayerName(e.target.value);
            setNameInvalid(false);
          }}
          onKeyPress={handleKeyPress}
          className={nameInvalid ? 'invalid' : ''}
          placeholder="Enter player name"
          autoComplete="off"
        />
      </div>
      <button onClick={addPlayer} className="btn-success">
        ➕ Add Player
      </button>
      
      <div style={{ marginTop: '20px' }}>
        {players.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px' }}>
            <p style={{ color: '#999' }}>
              No players added yet. Add at least 2 players to start.
            </p>
          </div>
        ) : (
          players.map((player, index) => (
            <div key={index} className="player-item">
              <span>
                <strong>Player {index + 1}:</strong> {player.name}
              </span>
              <button
                className="remove-btn"
                onClick={() => removePlayer(index)}
                aria-label={`Remove ${player.name}`}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
      
      <button
        onClick={onStartGame}
        className="btn-success"
        style={{ marginTop: '20px', width: '100%' }}
        disabled={players.length < 2}
      >
        🎮 Start Game
      </button>
    </div>
  );
}