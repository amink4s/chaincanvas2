import React from 'react';
import { useFarcasterIdentity } from '../hooks/useFarcasterIdentity';

const labelMap: Record<string, string> = {
  idle: 'Idle',
  initializing: 'Auth…',
  ready: 'Ready',
  token: 'Token OK',
  profile: 'Profile',
  error: 'Error'
};

const UserBadge: React.FC = () => {
  const { status, fid, profile, debug } = useFarcasterIdentity();

  return (
    <div className="fixed top-2 left-2 z-50 flex flex-col gap-2 max-w-[220px]">
      <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur px-3 py-2 rounded-lg border border-indigo-500/40 shadow-sm min-h-[44px]">
        {!profile && (
          <span className="text-[10px] text-slate-300">
            {labelMap[status] || status}
          </span>
        )}
        {profile && (
          <>
            <img
              src={profile.pfpUrl}
              alt={profile.username}
              className="w-8 h-8 rounded-full border border-slate-600 object-cover"
            />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white truncate">
                @{profile.username}
              </span>
              <span className="text-[9px] text-slate-400">fid {fid}</span>
            </div>
          </>
        )}
      </div>
      <div className="bg-black/60 border border-slate-700 rounded-md p-2">
        <div className="text-[9px] font-mono text-indigo-300 mb-1">Debug:</div>
        <ul className="text-[9px] font-mono text-slate-300 space-y-[2px] max-h-32 overflow-auto">
          {debug.map((d,i) => <li key={i}>{d}</li>)}
        </ul>
      </div>
    </div>
  );
};

export default UserBadge;