import React from 'react';

const TechStack: React.FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 pb-20">
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-2xl font-bold text-indigo-400 mb-6">Recommended Stack</h2>
        
        <div className="space-y-8">
          
          {/* Frontend */}
          <div>
            <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2 mb-4">Frontend & Social</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="font-bold text-orange-400 mb-1">Base Minikit (React)</div>
                <p className="text-slate-400 text-sm">
                  Essential for the 'Canvas' experience inside Warpcast. It handles the secure wallet connection and Frame Context (knowing who opened the app).
                </p>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="font-bold text-purple-400 mb-1">Neynar API</div>
                <p className="text-slate-400 text-sm">
                  Use Neynar for fetching the social graph (who follows who), getting User data (PFPs), and managing the "Cast" intent generation.
                </p>
              </div>
            </div>
          </div>

          {/* AI & Media */}
          <div>
            <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2 mb-4">AI & Media</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="font-bold text-pink-400 mb-1">Venice AI</div>
                <p className="text-slate-400 text-sm">
                  High-quality, uncensored image editing. Integration via standard REST API. Must be proxied via your backend.
                </p>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="font-bold text-cyan-400 mb-1">Pinata (IPFS)</div>
                <p className="text-slate-400 text-sm">
                  Storage layer. When an edit is finalized, upload to IPFS via Pinata SDK. This IPFS hash is what gets minted later.
                </p>
              </div>
            </div>
          </div>

          {/* On-Chain */}
          <div>
            <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2 mb-4">Blockchain (Base)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="font-bold text-blue-400 mb-1">Zora Protocol</div>
                <p className="text-slate-400 text-sm">
                  Use Zora's Creator Toolkit SDK. Specifically the <code>create1155</code> or Auction modules. Best liquidity for artistic NFTs on Base.
                </p>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="font-bold text-yellow-400 mb-1">Coinbase Smart Wallet</div>
                <p className="text-slate-400 text-sm">
                  Native to Base Minikit. Allows users to sign transactions (like Minting or Bidding) with passkeys. Zero friction.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TechStack;