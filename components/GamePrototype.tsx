import React, { useState, useEffect } from 'react';
import { GameState, MOCK_USERS, FarcasterUser } from '../types';
// import { getInitialState, simulateEdit, formatTimeLeft } from '../services/simulation';
import { getInitialState, formatTimeLeft } from '../services/simulation';
import { editImage } from '../services/venice';
import { Timer, Send, UserPlus, RefreshCw, Camera, Loader2, Lock } from 'lucide-react';

const GamePrototype: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(getInitialState());
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<FarcasterUser | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(formatTimeLeft(gameState.deadline));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState.deadline]);

  const handleGenerate = async () => {
    if (!inputPrompt.trim()) return;
    
    setIsGenerating(true);
    const newImageUrl = await editImage(inputPrompt, gameState.currentImage);
    
    setGameState(prev => ({
      ...prev,
      currentImage: newImageUrl,
      currentPrompt: inputPrompt,
    }));
    setIsGenerating(false);
    // Move to picking a user state logic if we separated steps, 
    // but for this single screen UI we just update state
  };

  const confirmTurn = () => {
    if (!selectedUser) return;
    
    const turnData = {
      turn: gameState.turnCount,
      editor: MOCK_USERS[3], // Assuming 'You' are editing
      image: gameState.currentImage,
      prompt: gameState.currentPrompt
    };

    setGameState(prev => ({
      ...prev,
      history: [...prev.history, turnData],
      turnCount: prev.turnCount + 1,
      lastEditor: MOCK_USERS[3],
      nextEditor: selectedUser,
      deadline: Date.now() + 30 * 60 * 1000,
      currentPrompt: '' // Reset prompt
    }));
    
    setInputPrompt('');
    setShowShareModal(true);
  };

  const isMyTurn = gameState.nextEditor?.fid === 88; // 88 is 'you' in mock

  return (
    <div className="h-full flex flex-col max-w-md mx-auto bg-black border-x border-slate-800 relative shadow-2xl">
      
      {/* Header Status Bar */}
      <div className="bg-slate-900 p-4 flex justify-between items-center border-b border-slate-800">
        <div className="flex flex-col">
          <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Round</span>
          <span className="text-xl font-black text-indigo-400">{gameState.turnCount} / {gameState.maxTurns}</span>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
          <Timer className={`w-4 h-4 ${gameState.deadline && Date.now() > gameState.deadline ? 'text-red-500' : 'text-green-400'}`} />
          <span className="text-sm font-mono text-slate-200">{timeLeft}</span>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Image Stage */}
        <div className="relative group rounded-xl overflow-hidden border-2 border-slate-700 shadow-lg shadow-indigo-500/10 bg-slate-900 aspect-square flex items-center justify-center">
          <img 
            src={gameState.currentImage} 
            alt="Current State" 
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
            <p className="text-white text-sm font-medium line-clamp-2">
              "{gameState.currentPrompt}"
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold">
                 {gameState.lastEditor ? gameState.lastEditor.username[0].toUpperCase() : 'S'}
              </div>
              <span className="text-xs text-slate-300">
                {gameState.lastEditor ? `Edited by @${gameState.lastEditor.username}` : 'Seed Image'}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        {isMyTurn ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Step 1: Edit */}
            <div className="space-y-2">
              <label className="text-sm text-slate-400 font-semibold uppercase tracking-wider">1. Make your edit</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Add a cyberpunk glitch effect..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                  disabled={isGenerating}
                />
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !inputPrompt}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 rounded-lg flex items-center justify-center transition-all"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Step 2: Pick User */}
            <div className="space-y-2">
              <label className="text-sm text-slate-400 font-semibold uppercase tracking-wider">2. Pass the torch</label>
              <div className="grid grid-cols-3 gap-2">
                {MOCK_USERS.filter(u => u.fid !== 88).map(user => (
                  <button
                    key={user.fid}
                    onClick={() => setSelectedUser(user)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                      selectedUser?.fid === user.fid 
                        ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-500/50'
                    }`}
                  >
                    <img src={user.pfpUrl} className="w-8 h-8 rounded-full" alt={user.username} />
                    <span className="text-xs font-medium truncate max-w-full">@{user.username}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Submit */}
            <button
              onClick={confirmTurn}
              disabled={!selectedUser || !inputPrompt}
              className="w-full bg-white text-black font-bold py-4 rounded-xl shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              Finalize & Pass Turn <Send className="w-4 h-4" />
            </button>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-slate-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Not Your Turn</h3>
              <p className="text-slate-400 text-sm max-w-[200px] mx-auto mt-2">
                Waiting for <span className="text-indigo-400">@{gameState.nextEditor?.username}</span> to make a move.
              </p>
            </div>
            {gameState.deadline && Date.now() > gameState.deadline && (
               <button className="mt-4 bg-red-500/20 text-red-400 border border-red-500/50 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-500/30 transition-all">
                 Steal Turn (Timer Expired)
               </button>
            )}
          </div>
        )}
      </div>

      {/* Share Modal Simulation */}
      {showShareModal && (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Turn Complete!</h3>
              <p className="text-slate-400 text-sm">
                You must cast this to notify @{selectedUser?.username}.
              </p>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
               <p className="text-slate-300 text-sm font-mono">
                 I just mutated the daily image with "{gameState.currentPrompt}". <br/><br/>
                 Your turn @{selectedUser?.username}! You have 30 mins. ⏱️ <br/>
                 #ChainReaction #Base #Farcaster
               </p>
               <div className="mt-3 rounded-md overflow-hidden h-32 w-full bg-black">
                 <img src={gameState.currentImage} className="w-full h-full object-cover opacity-80" />
               </div>
            </div>

            <button 
              onClick={() => setShowShareModal(false)}
              className="w-full bg-[#7C65C1] hover:bg-[#6952A3] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              Compose Cast
            </button>
            <button 
              onClick={() => setShowShareModal(false)}
              className="w-full text-slate-500 text-sm py-2 hover:text-slate-300"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamePrototype;