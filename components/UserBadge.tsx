import React from 'react';
import { useFarcasterIdentity } from '../hooks/useFarcasterIdentity';

const UserBadge: React.FC = () => {
  const { fid, profile, status, debug } = useFarcasterIdentity();

  return (
    <div
      className="fixed top-2 left-2 z-50 flex flex-col gap-2"
      style={{ maxWidth: '160px' }}
    >
      <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur px-3 py-2 rounded-lg border border-indigo-500/40 shadow-sm">
        {status === 'initializing' && (
          <span className="text-[10px] text-slate-300">Authenticating…</span>
        )}
        {status === 'error' && (
          <span className="text-[10px] text-red-400">Auth Error</span>
        )}
        {status === 'no-session' && (
          <span className="text-[10px] text-yellow-400">No session yet</span>
        )}
        {status === 'signed-in' && profile && (
          <>
            <img
              src={profile.pfpUrl}
              alt={profile.username}
              className="w-8 h-8 rounded-full border border-slate-600 object-cover"
            />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white truncate">@{profile.username}</span>
              <span className="text-[9px] text-slate-400">fid {fid}</span>
            </div>
          </>
        )}
        {status === 'signed-in' && !profile && (
            <span className="text-[10px] text-slate-300">Loading profile…</span>
        )}
      </div>
      {/* Debug panel (remove later) */}
      <div className="bg-black/70 border border-slate-700 rounded-md p-2">
        <div className="text-[9px] font-mono text-indigo-300">Debug:</div>
        <ul className="text-[9px] font-mono text-slate-300 space-y-0 max-h-24 overflow-auto">
          {debug.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default UserBadge;