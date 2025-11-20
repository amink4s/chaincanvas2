import React, { useState } from 'react';
import { TabView } from './types';
import Blueprint from './components/Blueprint';
import GamePrototype from './components/GamePrototype';
import TechStack from './components/TechStack';
import UserBadge from './components/UserBadge';
import { Layers, PlayCircle, Code2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.PROTOTYPE);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      <UserBadge />
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {activeTab === TabView.BLUEPRINT && <div className="h-full overflow-y-auto"><Blueprint /></div>}
        {activeTab === TabView.PROTOTYPE && <div className="h-full"><GamePrototype /></div>}
        {activeTab === TabView.STACK && <div className="h-full overflow-y-auto"><TechStack /></div>}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-6 py-3 z-50 shadow-xl pb-safe">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <button 
            onClick={() => setActiveTab(TabView.BLUEPRINT)}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === TabView.BLUEPRINT ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Layers className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Plan</span>
          </button>
          <button 
            onClick={() => setActiveTab(TabView.PROTOTYPE)}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === TabView.PROTOTYPE ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <PlayCircle className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Demo</span>
          </button>
          <button 
            onClick={() => setActiveTab(TabView.STACK)}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === TabView.STACK ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Code2 className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Stack</span>
          </button>
        </div>
      </nav>
      <style>{`
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 20px);
        }
      `}</style>
    </div>
  );
}