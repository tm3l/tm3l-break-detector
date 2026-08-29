import { useState } from 'react';
import { Webhook, Save, GitPullRequest, ShieldAlert, MessageSquare } from 'lucide-react';

export function WebhookAnalytics() {
  const [secret, setSecret] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 font-mono text-emerald-400 bg-[#0d1117]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-slate-700/80 p-6 rounded bg-[#121820] flex flex-col items-center justify-center text-center">
          <GitPullRequest size={32} className="text-cyan-400 mb-3" />
          <div className="text-4xl font-bold text-slate-100">142</div>
          <div className="text-sm text-slate-400 uppercase tracking-widest mt-2">Pull Requests Scanned</div>
        </div>
        <div className="border border-slate-700/80 p-6 rounded bg-[#121820] flex flex-col items-center justify-center text-center">
          <ShieldAlert size={32} className="text-red-400 mb-3" />
          <div className="text-4xl font-bold text-slate-100">24</div>
          <div className="text-sm text-slate-400 uppercase tracking-widest mt-2">Breaking Changes Blocked</div>
        </div>
        <div className="border border-slate-700/80 p-6 rounded bg-[#121820] flex flex-col items-center justify-center text-center">
          <MessageSquare size={32} className="text-purple-400 mb-3" />
          <div className="text-4xl font-bold text-slate-100">18</div>
          <div className="text-sm text-slate-400 uppercase tracking-widest mt-2">Autonomously Commented</div>
        </div>
      </div>

      <div className="border border-slate-700/80 p-6 rounded bg-[#121820]">
        <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-3 mb-6">
          <Webhook size={24} />
          Git Provider Webhook Configuration
        </h2>
        
        <form onSubmit={handleSave} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wider">Forgejo / GitHub Webhook Secret</label>
            <input 
              type="password" 
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter webhook secret..."
              className="w-full bg-[#090c10] border border-slate-600 rounded p-3 text-emerald-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors placeholder:text-slate-600"
            />
          </div>
          <button 
            type="submit" 
            className="flex items-center gap-2 bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 px-6 py-2 rounded hover:bg-emerald-800/40 transition-colors font-bold uppercase tracking-wider"
          >
            <Save size={18} />
            {saved ? 'Saved!' : 'Save Configuration'}
          </button>
        </form>
      </div>
    </div>
  );
}
