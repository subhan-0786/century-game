// src/App.jsx
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import UserInfo from './components/UserInfo';
import GameSetup from './components/GameSetup';
import GamePlay from './components/GamePlay';
import SavedGames from './components/SavedGames';
import Toast from './components/Toast';
import Loading from './components/Loading';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameData, setGameData] = useState({});
  const [roundHistory, setRoundHistory] = useState([]);
  const [currentGameId, setCurrentGameId] = useState(null);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [previousGameState, setPreviousGameState] = useState(null);
  
  const [view, setView] = useState('auth'); // auth, setup, game, savedGames
  const [dbStatus, setDbStatusState] = useState({ message: 'Database Connected', type: 'connected' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentGameId && roundHistory.length > 0) {
      debouncedAutoSave(false);
    }
  }, [roundHistory]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
        setView('setup');
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const setDbStatus = (message, type) => {
    setDbStatusState({ message, type });
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setView('setup');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPlayers([]);
    setGameData({});
    setRoundHistory([]);
    setCurrentGameId(null);
    setPreviousGameState(null);
    setView('auth');
  };

  const handleStartGame = () => {
    if (players.length < 2) {
      showToast('Need at least 2 players!', 'error');
      return;
    }
    
    if (!confirm(`Start game with ${players.map(p => p.name).join(', ')}?`)) return;
    
    const newGameData = {};
    players.forEach(p => newGameData[p.name] = { score: 0, eliminated: false });
    
    setGameData(newGameData);
    setRoundHistory([]);
    setCurrentGameId(null);
    setPreviousGameState(null);
    setGameStartTime(Date.now());
    setView('game');
    showToast('Game started! 🎮', 'success');
  };

  const handleEndGame = () => {
    if (!confirm('End this game? All unsaved progress will be lost. Consider saving it first!')) return;
    
    setPlayers([]);
    setGameData({});
    setRoundHistory([]);
    setCurrentGameId(null);
    setGameStartTime(null);
    setPreviousGameState(null);
    setView('setup');
    showToast('Game ended', 'info');
  };

  const handleSaveGame = async () => {
    try {
      setDbStatus('Saving game...', 'saving');
      
      const activePlayers = players.filter(p => !gameData[p.name].eliminated);
      const isCompleted = activePlayers.length === 1;
      const winner = isCompleted ? activePlayers[0].name : null;
      
      const gameState = {
        players: players,
        gameData: gameData,
        roundHistory: roundHistory,
        gameStartTime: gameStartTime
      };
      
      if (currentGameId) {
        await updateSavedGame(isCompleted, winner, gameState);
      } else {
        const { data, error } = await supabase
          .from('saved_games')
          .insert([{
            user_id: currentUser.id,
            game_state: gameState,
            player_names: players.map(p => p.name),
            is_completed: isCompleted,
            winner_name: winner,
            total_rounds: roundHistory.length
          }])
          .select()
          .single();
        
        if (error) throw error;
        
        setCurrentGameId(data.id);
        showToast('Game saved successfully!', 'success');
      }
      
      setDbStatus('Database Connected', 'connected');
    } catch (err) {
      console.error('Save error:', err);
      setDbStatus('Error saving game', 'error');
      showToast('Failed to save game. Please try again.', 'error');
      setTimeout(() => setDbStatus('Database Connected', 'connected'), 3000);
    }
  };

  const updateSavedGame = async (isCompleted, winner, gameState) => {
    try {
      const { error } = await supabase
        .from('saved_games')
        .update({
          game_state: gameState,
          is_completed: isCompleted,
          winner_name: winner,
          total_rounds: roundHistory.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentGameId);
      
      if (error) throw error;
    } catch (err) {
      console.error('Update error:', err);
      throw err;
    }
  };

  const debouncedAutoSave = (isCompleted) => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    const timeout = setTimeout(async () => {
      if (currentGameId) {
        const activePlayers = players.filter(p => !gameData[p.name].eliminated);
        const completed = isCompleted || activePlayers.length === 1;
        const winner = completed ? activePlayers[0].name : null;
        
        const gameState = {
          players: players,
          gameData: gameData,
          roundHistory: roundHistory,
          gameStartTime: gameStartTime
        };
        
        try {
          await updateSavedGame(completed, winner, gameState);
        } catch (err) {
          console.error('Auto-save error:', err);
        }
      }
    }, 1000);
    
    setAutoSaveTimeout(timeout);
  };

  const handleLoadGame = (game) => {
    const state = game.game_state;
    setPlayers(state.players);
    setGameData(state.gameData);
    setRoundHistory(state.roundHistory);
    setGameStartTime(state.gameStartTime);
    setCurrentGameId(game.id);
    setPreviousGameState(null);
    setView('game');
  };

  return (
    <div className="container">
      <h1>Century</h1>
      <p className="subtitle">First to 100 points loses!</p>
      
      {/* <div className={`db-status ${dbStatus.type}`}>
        {dbStatus.type === 'connected' ? '🟢 ' : dbStatus.type === 'saving' ? '💾 ' : '🔴 '}
        {dbStatus.message} 
      </div> */}

      {view === 'auth' && (
        <Auth
          onAuthSuccess={handleAuthSuccess}
          showToast={showToast}
          setDbStatus={setDbStatus}
          setLoading={setLoading}
        />
      )}

      {view !== 'auth' && currentUser && (
        <>
          <UserInfo
            user={currentUser}
            onLogout={handleLogout}
            showToast={showToast}
          />
          
          <div className="card-values">
            <strong>Card Values:</strong> A = 1 | J = 0 | Q & K = 20 | Others = face value
          </div>
        </>
      )}

      {view === 'setup' && (
        <GameSetup
          players={players}
          setPlayers={setPlayers}
          onStartGame={handleStartGame}
          onViewSavedGames={() => setView('savedGames')}
          showToast={showToast}
        />
      )}

      {view === 'game' && (
        <GamePlay
          players={players}
          gameData={gameData}
          setGameData={setGameData}
          roundHistory={roundHistory}
          setRoundHistory={setRoundHistory}
          onSaveGame={handleSaveGame}
          onEndGame={handleEndGame}
          showToast={showToast}
          setLoading={setLoading}
          previousGameState={previousGameState}
          setPreviousGameState={setPreviousGameState}
        />
      )}

      {view === 'savedGames' && (
        <SavedGames
          user={currentUser}
          onBack={() => setView('setup')}
          onLoadGame={handleLoadGame}
          showToast={showToast}
          setLoading={setLoading}
        />
      )}

      {loading && <Loading />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default App;