// src/components/SavedGames.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function SavedGames({ 
  user, 
  onBack, 
  onLoadGame, 
  showToast,
  setLoading 
}) {
  const [games, setGames] = useState([]);
  const [LocalLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    loadSavedGames();
  }, []);

  const loadSavedGames = async () => {
    try {
      setLocalLoading(true);
      setLoading(true);
      
      const { data, error } = await supabase
        .from('saved_games')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      setGames(data || []);
    } catch (err) {
      console.error('Error loading saved games:', err);
      showToast('Error loading saved games', 'error');
    } finally {
      setLocalLoading(false);
      setLoading(false);
    }
  };

  const handleLoadGame = async (gameId) => {
    try {
      setLoading(true);
      
      const { data: game, error } = await supabase
        .from('saved_games')
        .select('*')
        .eq('id', gameId)
        .single();
      
      if (error) throw error;
      
      onLoadGame(game);
      showToast('Game loaded successfully!', 'success');
    } catch (err) {
      console.error('Error loading game:', err);
      showToast('Failed to load game. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGame = async (gameId) => {
    if (!confirm('Are you sure you want to delete this saved game? This cannot be undone.')) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('saved_games')
        .delete()
        .eq('id', gameId);
      
      if (error) throw error;
      
      showToast('Game deleted', 'info');
      loadSavedGames();
    } catch (err) {
      console.error('Error deleting game:', err);
      showToast('Failed to delete game. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (LocalLoading) {
    return <div>Loading saved games...</div>;
  }

  return (
    <div>
      <h2 style={{ color: '#00d4ff', marginBottom: '20px' }}>📂 My Saved Games</h2>
      <button className="nav-btn" onClick={onBack} style={{ marginBottom: '20px' }}>
        ← Back
      </button>
      
      {games.length === 0 ? (
        <div className="empty-state">
          <h3>🎮 Ready to Play!</h3>
          <p>Start your first game of Century and save it to track your progress.</p>
        </div>
      ) : (
        games.map(game => {
          const date = new Date(game.updated_at || game.created_at).toLocaleString();
          const status = game.is_completed
            ? <span className="saved-game-badge">✅ Completed</span>
            : <span className="saved-game-badge" style={{ background: '#00d4ff' }}>▶️ In Progress</span>;

          return (
            <div key={game.id} className="stat-card">
              <h3>
                {game.player_names.join(', ')} {status}
              </h3>
              <div className="stat-row">
                <span className="stat-label">Last Played:</span>
                <span>{date}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Rounds Played:</span>
                <span>{game.total_rounds}</span>
              </div>
              {game.winner_name && (
                <div className="stat-row">
                  <span className="stat-label">Winner:</span>
                  <span>🏆 {game.winner_name}</span>
                </div>
              )}
              <div className="action-buttons">
                {!game.is_completed && (
                  <button
                    className="btn-success"
                    onClick={() => handleLoadGame(game.id)}
                  >
                    Resume Game
                  </button>
                )}
                <button
                  className="btn-danger"
                  onClick={() => handleDeleteGame(game.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}