import React from 'react';
import { useFarcasterIdentity } from '../hooks/useFarcasterIdentity';

const UserBadge: React.FC = () => {
  const { fid, profile, status } = useFarcasterIdentity();

  return (
    <div className="absolute top-2 left-2 flex items-center gap-2 bg-slate-800/70 backdrop-blur px-3 py-2 rounded-lg border border-slate-700 shadow">
      {status === 'initializing' && (
        <span className="text-xs text-slate-400">Authenticating...</span>
      )}
      {status === 'error' && (
        <span className="text-xs text-red-400">Auth Error</span>
      )}
      {status === 'signed-in' && profile && (
        <>
          <img
            src={profile.pfpUrl}
            alt={profile.username}
            className="w-8 h-8 rounded-full border border-slate-600 object-cover"
          />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">@{profile.username}</span>
              <span className="text-[10px] text-slate-400">fid {fid}</span>
            </div>
        </>
      )}
      {status === 'signed-in' && !profile && (
        <span className="text-xs text-slate-400">Loading profile…</span>
      )}
    </div>
  );
};

export default UserBadge;