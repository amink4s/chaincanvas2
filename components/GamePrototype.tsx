import React, { useState, useEffect, useRef } from 'react';
import {
  Timer,
  Send,
  RefreshCw,
  Camera,
  Loader2,
  Lock,
  Bug,
  CloudUpload,
  Search as SearchIcon,
  X
} from 'lucide-react';
import { editImage, getLastVeniceError, getLastVeniceDebug } from '../services/venice';
import { searchFarcasterUsers, debounce, SearchUser } from '../services/userSearch';
import { sdk } from '@farcaster/miniapp-sdk';

const MINI_APP_URL = 'https://chaincanvas-xi.vercel.app/';

interface ServerState {
  gameId: string;
  game: any;
  turns: any[];
  callerFid: number | null;
}

function getAuthToken(): string | null {
  return (window as any).QUICKAUTH_TOKEN || null;
}

function getMyFidFromContext(serverCallerFid: number | null): number | null {
  if (typeof serverCallerFid === 'number') return serverCallerFid;
  const fallback = (window as any).CURRENT_FID;
  if (fallback == null) return null;
  const n = Number(fallback);
  return Number.isFinite(n) ? n : null;
}

const GamePrototype: React.FC = () => {
  const [serverState, setServerState] = useState<ServerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugMeta, setDebugMeta] = useState<any>(null);
  const [lastDataUrl, setLastDataUrl] = useState<string | null>(null);
  const [ipfsStatus, setIpfsStatus] = useState<string | null>(null);
  const [pinning, setPinning] = useState(false);
  const [lastPinnedUrl, setLastPinnedUrl] = useState<string | null>(null);
  const [lastPinnedCid, setLastPinnedCid] = useState<string | null>(null);
  const [lastPromptForCast, setLastPromptForCast] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState(false);

  const [nextEditorQuery, setNextEditorQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedNextUser, setSelectedNextUser] = useState<SearchUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const debouncedSearch = useRef(
    debounce(async (q: string) => {
      if (!q.trim()) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      const results = await searchFarcasterUsers(q);
      setSearchResults(results);
      setSearchLoading(false);
      setDropdownOpen(true);
    }, 300)
  ).current;

  async function loadServerState() {
    setLoading(true);
    setLoadError(null);
    try {
      const token = getAuthToken();
      const resp = await fetch('/api/game-state', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const text = await resp.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Non-JSON response: ${text.slice(0, 120)}`);
      }
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to load game state');
      }
      setServerState(data);
    } catch (e: any) {
      setLoadError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  // Initial load
  useEffect(() => { loadServerState(); }, []);

  // Re-fetch when QuickAuth finishes (triggered externally)
  useEffect(() => {
    function onReady() {
      loadServerState();
    }
    window.addEventListener('quickauth-ready', onReady);
    return () => window.removeEventListener('quickauth-ready', onReady);
  }, []);

  useEffect(() => {
    if (!nextEditorQuery.trim()) {
      setSearchResults([]);
      return;
    }
    debouncedSearch(nextEditorQuery);
  }, [nextEditorQuery, debouncedSearch]);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  const currentImage = (() => {
    if (!serverState) return '';
    if (lastDataUrl) return lastDataUrl;
    const turns = serverState.turns;
    if (!turns.length) return serverState.game.seed_image_url;
    return turns[turns.length - 1].image_url || serverState.game.seed_image_url;
  })();

  const currentPrompt = (() => {
    if (!serverState) return '';
    if (lastDataUrl) return inputPrompt;
    const turns = serverState.turns;
    if (!turns.length) return serverState.game.seed_prompt || '';
    return turns[turns.length - 1].prompt_text || '';
  })();

  const myFid = getMyFidFromContext(serverState?.callerFid ?? null);
  const nextFid: number | null =
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
      <p className="text-white text-sm font-medium line-clamp-2">
        "{currentPrompt || (lastDataUrl ? inputPrompt : '')}"
      </p>
    </div>
        </div >

{
  isMyTurn?(
          <div className = "space-y-5" >
      {/* Step 1 */ }
      < div className = "space-y-2" >
              <label className="text-sm text-slate-400 font-semibold uppercase tracking-wider">
                1. Make your edit
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={e => setInputPrompt(e.target.value)}
                  placeholder='e.g. "Change the sky to purple"'
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                  disabled={isGenerating}
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !inputPrompt.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 rounded-lg flex items-center justify-center transition-all"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                </button>
              </div>
              { errorMsg && (
    <div className="text-xs bg-red-500/15 border border-red-600/40 text-red-300 rounded-md px-3 py-2 space-y-2">
      <div className="flex items-center gap-2">
        <Bug className="w-4 h-4" />
        <span>{errorMsg}</span>
      </div>
      <button
        onClick={() => setShowDebug(d => !d)}
        className="text-[10px] underline text-red-200 hover:text-red-100"
      >
        {showDebug ? 'Hide debug' : 'Show debug'}
      </button>
      {showDebug && debugMeta && (
        <pre className="max-h-64 overflow-auto text-[10px] bg-black/60 border border-red-900/40 p-2 rounded">
          {JSON.stringify(debugMeta, null, 2)}
        </pre>
      )}
    </div>
  )}
{
  lastDataUrl && !errorMsg && (
    <div className="flex items-center gap-2">
      <button
        onClick={pinToIpfs}
        disabled={pinning}
        className="text-xs flex items-center gap-2 px-3 py-2 rounded-md bg-slate-800 border border-slate-700 hover:border-indigo-500/60 text-slate-300 disabled:opacity-50"
      >
        <CloudUpload className="w-4 h-4" />
        {pinning ? 'Pinning...' : 'Pin to IPFS'}
      </button>
      {ipfsStatus && (
        <span className="text-[10px] text-indigo-300">
          {ipfsStatus}
        </span>
      )}
    </div>
  )
}
            </div >

  {/* Step 2 */ }
  < div className = "space-y-2" ref = { dropdownRef } >
              <label className="text-sm text-slate-400 font-semibold uppercase tracking-wider">
                2. Pass the torch
              </label>
              <div className="relative">
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500">
                  <SearchIcon className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={nextEditorQuery}
                    onChange={e => {
                      setNextEditorQuery(e.target.value);
                      setSelectedNextUser(null);
                    }}
                    placeholder="Search Farcaster username..."
                    className="flex-1 bg-transparent text-sm text-white outline-none"
                    autoComplete="off"
                  />
                  {nextEditorQuery && (
                    <button
                      className="text-slate-400 hover:text-slate-200"
                      onClick={() => {
                        setNextEditorQuery('');
                        setSearchResults([]);
                        setSelectedNextUser(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {dropdownOpen && searchResults.length > 0 && (
                  <div className="absolute z-40 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-lg max-h-56 overflow-auto">
                    {searchResults.map(u => (
                      <button
                        key={u.fid}
                        onClick={() => selectNextEditor(u)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${selectedNextUser?.fid === u.fid
                            ? 'bg-indigo-600/20 text-white'
                            : 'text-slate-300 hover:bg-slate-800'
                          }`}
                      >
                        <img
                          src={u.pfpUrl || 'https://placehold.co/32x32?text=U'}
                          className="w-8 h-8 rounded-full object-cover border border-slate-700"
                          alt={u.username}
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold">@{u.username}</span>
                          {u.displayName && (
                            <span className="text-[10px] text-slate-400">{u.displayName}</span>
                          )}
                        </div>
                        <span className="ml-auto text-[10px] text-slate-500">fid {u.fid}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchLoading && (
                  <div className="absolute right-2 top-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                )}
                {selectedNextUser && (
                  <div className="mt-2 text-[11px] text-green-400 flex items-center gap-2">
                    Selected: @{selectedNextUser.username} (fid {selectedNextUser.fid})
                  </div>
                )}
              </div>
            </div >

  {/* Step 3 */ }
  < button
onClick = { confirmTurn }
disabled = {!selectedNextUser || !lastDataUrl || !inputPrompt.trim()}
className = "w-full bg-white text-black font-bold py-4 rounded-xl shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
  >
  Finalize & Pass Turn < Send className = "w-4 h-4" />
            </button >
          </div >
        ) : (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
      <Lock className="w-8 h-8 text-slate-500" />
    </div>
    <div>
      <h3 className="text-lg font-bold text-white">Not Your Turn</h3>
      <p className="text-slate-400 text-sm max-w-[220px] mx-auto mt-2">
        Waiting for the current editor to finish. (Server-controlled)
      </p>
    </div>
  </div>
)}
      </div >

  { showShareModal && selectedNextUser && (
    <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">Turn Complete!</h3>
          <p className="text-slate-400 text-sm">Compose a cast to notify @{selectedNextUser.username}.</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-300 text-sm font-mono whitespace-pre-line">
            {`I just mutated the daily image with "${lastPromptForCast}".\n\nYour turn @${selectedNextUser.username}! You have 30 mins. ⏱️\n${MINI_APP_URL}`}
          </p>
          <div className="mt-3 rounded-md overflow-hidden h-32 w-full bg-black">
            <img
              src={lastDataUrl || currentImage}
              className="w-full h-full object-cover opacity-80"
              alt="Turn Result"
            />
          </div>
          {lastPinnedUrl && (
            <div className="mt-2 text-[11px] text-slate-400">
              Image embed: {lastPinnedUrl}
            </div>
          )}
        </div>
        <button
          onClick={composeCast}
          className="w-full bg-[#7C65C1] hover:bg-[#6952A3] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          Open Composer
        </button>
        <button
          onClick={() => setShowShareModal(false)}
          className="w-full text-slate-500 text-sm py-2 hover:text-slate-300"
        >
          Close
        </button>
      </div>
    </div>
  )}
    </div >
  );
};

export default GamePrototype;