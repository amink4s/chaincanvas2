import React from 'react';
import GamePrototype from './components/GamePrototype';
import UserBadge from './components/UserBadge';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      <UserBadge />
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <div className="h-full"><GamePrototype /></div>
      </main>
      <style>{`
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 20px);
        }
      `}</style>
    </div>
  );
}