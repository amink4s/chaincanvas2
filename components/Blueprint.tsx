import React from 'react';
import { 
  Server, 
  Database, 
  Clock, 
  Smartphone, 
  Image as ImageIcon, 
  Share2, 
  Coins 
} from 'lucide-react';

const Blueprint: React.FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 pb-20">
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-2xl font-bold text-indigo-400 mb-4">Architectural Overview</h2>
        <p className="text-slate-300 mb-6 leading-relaxed">
          To build <strong>ChainReaction</strong> (working title), we need a hybrid architecture. 
          The frontend lives in the Farcaster Mini App (WebView), but the logic regarding the 
          30-minute timer and turn enforcement must live on a secure backend to prevent client-side tampering.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-400" /> Backend (State Machine)
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-slate-400 text-sm">
              <li><strong>PostgreSQL DB:</strong> Stores active game state, history, and the <code>target_fid</code> (who is allowed to edit).</li>
              <li><strong>Cron Job:</strong> Runs daily to spawn the initial image.</li>
              <li><strong>Webhook Receiver:</strong> Listens for Zora auction settlements to trigger the fund transfer logic.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-green-400" /> Storage &amp; AI
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-slate-400 text-sm">
              <li><strong>Venice AI Proxy:</strong> A server-side route to hold the Venice API key. Frontend sends prompt → Backend calls Venice → Returns image.</li>
              <li><strong>IPFS / Pinata:</strong> All generated images must be pinned to IPFS immediately so the final NFT metadata is valid.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-2xl font-bold text-indigo-400 mb-4">Critical Logic Flows</h2>
        
        <div className="space-y-6">
          <div className="flex gap-4 items-start">
            <div className="p-2 bg-slate-800 rounded-lg shrink-0 mt-1">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">The 30-Minute Timer</h3>
              <p className="text-slate-400 text-sm mt-1">
                <strong>Challenge:</strong> How to handle concurrency if the timer expires?
                <br />
                <strong>Solution:</strong> The database stores an <code>expiry_timestamp</code>. When a user attempts to load the "Edit" screen:
              </p>
              <ol className="list-decimal pl-5 text-slate-400 text-sm mt-2 space-y-1">
                <li>Server checks <code>Date.now() &gt; expiry_timestamp</code>.</li>
                <li>If true, the <code>target_fid</code> is set to <code>NULL</code> (wildcard mode).</li>
                <li>The first person to successfully submit a generated image locks the turn.</li>
              </ol>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="p-2 bg-slate-800 rounded-lg shrink-0 mt-1">
              <Share2 className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">Viral Loop (Compose Cast)</h3>
              <p className="text-slate-400 text-sm mt-1">
                Using the Neynar or Base Kit SDK, we pre-fill a cast.
                <br />
                <code className="bg-slate-800 px-2 py-1 rounded text-xs text-blue-300 mt-2 block w-fit">
                  "I just edited the daily image! @nextuser you have 30 mins to make your move. #ChainReaction"
                </code>
                <br />
                This is critical for the "Tag" mechanic. We verify the tag on the backend by checking who they selected in the UI before generating the share link.
              </p>
            </div>
          </div>

            <div className="flex gap-4 items-start">
              <div className="p-2 bg-slate-800 rounded-lg shrink-0 mt-1">
                <Coins className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Auction &amp; Recycling</h3>
                <p className="text-slate-400 text-sm mt-1">
                  After Turn 10, the "Edit" button becomes a "Bid" button.
                  We trigger a Zora Create call. The funds go to a treasury wallet.
                  Your backend monitors this wallet and uses a Swap API (like 0x or Uniswap) or a manual bridge to pay for the Venice API credits (if Venice accepts crypto, otherwise off-ramp).
                </p>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Blueprint;