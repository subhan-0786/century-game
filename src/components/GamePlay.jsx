// src/components/GamePlay.jsx
import { useState, useEffect } from 'react';

export default function GamePlay({
  players,
  gameData,
  setGameData,
  roundHistory,
  setRoundHistory,
  onSaveGame,
  onEndGame,
  showToast,
  setLoading,
  previousGameState,
  setPreviousGameState
}) {
  const [selectedChecker, setSelectedChecker] = useState(null);
  const [scores, setScores] = useState({});
  const [resultMessage, setResultMessage] = useState({ text: '', type: '' });
  const [isCalculating, setIsCalculating] = useState(false);
    // AUTO-SAVE when game data changes
  useEffect(() => {
    if (!gameData || roundHistory.length === 0) return;

    onSaveGame(); // auto-save
  }, [gameData, roundHistory]);


  useEffect(() => {
    const initialScores = {};
    players.filter(p => !gameData[p.name].eliminated).forEach(p => {
      initialScores[p.name] = 0;
    });
    setScores(initialScores);
  }, [players, gameData]);

  const activePlayers = players.filter(p => !gameData[p.name].eliminated);
  const eliminatedPlayers = players.filter(p => gameData[p.name].eliminated);
  const gameEnded = activePlayers.length === 1;

  const handleScoreChange = (playerName, value) => {
    const val = parseInt(value) || 0;
    setScores({ ...scores, [playerName]: val });
  };

  const calculateCheck = async () => {
    if (isCalculating) return;
    
    if (!selectedChecker) {
      showToast('Please select who called CHECK!', 'error');
      return;
    }
    
    let hasInvalidInput = false;
    for (const name in scores) {
      const val = scores[name];
      if (val < 0 || val > 65) {
        hasInvalidInput = true;
        break;
      }
    }
    
    if (hasInvalidInput) {
      showToast('Please enter valid scores (0-65)', 'error');
      return;
    }
    
    setIsCalculating(true);
    setLoading(true);
    
    try {
      // Save previous state for undo
      setPreviousGameState({
        gameData: JSON.parse(JSON.stringify(gameData)),
        roundHistory: JSON.parse(JSON.stringify(roundHistory)),
        selectedChecker: selectedChecker
      });
      
      const checkerScore = scores[selectedChecker];
      let checkerWins = true;
      
      for (const name in scores) {
        if (name !== selectedChecker && scores[name] <= checkerScore) {
          checkerWins = false;
          break;
        }
      }

      const roundPenalties = {};
      players.forEach(p => roundPenalties[p.name] = 0);
      const newGameData = { ...gameData };

      if (checkerWins) {
        let msg = `✅ ${selectedChecker} wins the CHECK!<br><br>`;
        for (const name in scores) {
          if (name !== selectedChecker) {
            const penalty = scores[name];
            newGameData[name].score += penalty;
            roundPenalties[name] = penalty;
            msg += `${name}: +${penalty} points (Total: ${newGameData[name].score})<br>`;
            if (newGameData[name].score >= 100) {
              newGameData[name].eliminated = true;
              msg += `<strong>🚫 ${name} is ELIMINATED!</strong><br>`;
            }
          }
        }
        setResultMessage({ text: msg, type: 'success' });
      } else {
        newGameData[selectedChecker].score += 50;
        roundPenalties[selectedChecker] = 50;
        let msg = `❌ ${selectedChecker} loses the CHECK!<br><br>${selectedChecker}: +50 penalty (Total: ${newGameData[selectedChecker].score})`;
        if (newGameData[selectedChecker].score >= 100) {
          newGameData[selectedChecker].eliminated = true;
          msg += `<br><strong>🚫 ${selectedChecker} is ELIMINATED!</strong>`;
        }
        setResultMessage({ text: msg, type: 'error' });
      }

      setGameData(newGameData);
      setRoundHistory([...roundHistory, { 
        checker: selectedChecker, 
        penalties: roundPenalties, 
        timestamp: Date.now() 
      }]);
      
      setSelectedChecker(null);
      
      const newActivePlayers = players.filter(p => !newGameData[p.name].eliminated);
      if (newActivePlayers.length === 1) {
        const winner = newActivePlayers[0];
        setResultMessage({ 
          text: resultMessage.text + `<br><br>🏆 <strong>${winner.name} WINS THE GAME!</strong>`,
          type: 'success'
        });
        showToast(`🏆 ${winner.name} wins!`, 'success');
      }
    } catch (error) {
      console.error('Calculate error:', error);
      showToast('Error calculating round', 'error');
    } finally {
      setIsCalculating(false);
      setLoading(false);
    }
  };

  const undoLastRound = () => {
    if (!previousGameState || roundHistory.length === 0) {
      showToast('Nothing to undo', 'info');
      return;
    }
    
    if (!confirm('Undo the last round?')) return;
    
    setGameData(JSON.parse(JSON.stringify(previousGameState.gameData)));
    setRoundHistory(JSON.parse(JSON.stringify(previousGameState.roundHistory)));
    setSelectedChecker(null);
    setPreviousGameState(null);
    setResultMessage({ text: '', type: '' });
    showToast('Round undone', 'info');
  };

  return (
    <div>
      <div className="nav-buttons">
        <button className="nav-btn" onClick={onSaveGame}>
          💾 Save Game
        </button>
        <button 
          className="nav-btn btn-warning" 
          onClick={undoLastRound}
          disabled={!previousGameState || roundHistory.length === 0}
        >
          ↩️ Undo Last Round
        </button>
      </div>

      <div 
        className="check-section" 
        style={{
          pointerEvents: gameEnded ? 'none' : 'auto',
          opacity: gameEnded ? '0.5' : '1'
        }}
      >
        <div className="check-title">⚡ Who called CHECK?</div>
        <div style={{ textAlign: 'center' }}>
          {activePlayers.map(player => (
            <button
              key={player.name}
              className={`checker-btn ${selectedChecker === player.name ? 'selected' : ''}`}
              onClick={() => setSelectedChecker(player.name)}
              aria-label={`Select ${player.name} as checker`}
            >
              {player.name}
            </button>
          ))}
        </div>
        <div className="score-inputs">
          {activePlayers.map(player => (
            <div key={player.name} className="score-input-group">
              <label htmlFor={`score_${player.name}`}>{player.name}'s Sum:</label>
              <input
                type="number"
                id={`score_${player.name}`}
                min="0"
                max="65"
                value={scores[player.name] || 0}
                onChange={(e) => handleScoreChange(player.name, e.target.value)}
                aria-label={`${player.name}'s card sum`}
              />
            </div>
          ))}
        </div>
        <button onClick={calculateCheck} className="btn-success" style={{ width: '100%' }}>
          Calculate Penalties
        </button>
        {resultMessage.text && (
          <div 
            className={`result-message ${resultMessage.type}`}
            dangerouslySetInnerHTML={{ __html: resultMessage.text }}
          />
        )}
      </div>

      <div>
        {gameEnded && activePlayers.length === 1 && (
          <div className="player-card winner">
            <div className="player-header">
              <div className="player-name">
                {activePlayers[0].name}
                <span className="status-badge badge-winner">🏆 WINNER!</span>
              </div>
              <div className="player-score">{gameData[activePlayers[0].name].score} pts</div>
            </div>
          </div>
        )}
        
        {!gameEnded && activePlayers.map(player => (
          <div key={player.name} className="player-card">
            <div className="player-header">
              <div className="player-name">{player.name}</div>
              <div className="player-score">
                {gameData[player.name].score} pts
              </div>
            </div>
          </div>
        ))}

        
        {eliminatedPlayers.map(player => (
          <div key={player.name} className="player-card eliminated">
            <div className="player-header">
              <div className="player-name">
                {player.name}
                <span className="status-badge badge-eliminated">❌ ELIMINATED</span>
              </div>
              <div className="player-score">{gameData[player.name].score} pts</div>
            </div>
          </div>
        ))}
      </div>

      <div className="score-table-container">
        <table className="score-table">
          <thead>
            <tr>
              <th>Player</th>
              {roundHistory.map((_, i) => (
                <th key={i}>R{i + 1}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {[...players].sort((a, b) => gameData[a.name].score - gameData[b.name].score).map(player => (
              <tr key={player.name}>
                <td><strong>{player.name}</strong></td>
                {roundHistory.map((round, i) => {
                  const penalty = round.penalties[player.name] || 0;
                  return <td key={i}>{penalty > 0 ? `+${penalty}` : '-'}</td>;
                })}
                <td style={{
                  color: gameData[player.name].eliminated ? '#ff3366' : '',
                  fontWeight: 'bold'
                }}>
                  {gameData[player.name].score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button onClick={onEndGame} className="btn-danger">
          🏁 End Game
        </button>
      </div>
    </div>
  );
}