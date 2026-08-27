import { useState } from 'react';
import { ShieldAlert, ShieldCheck, Shield, GitCommit, FileJson, AlertOctagon, CheckSquare } from 'lucide-react';
import { BreakingChange } from '../types';

interface CIMonitorProps {
  status: 'SAFE' | 'WARNING' | 'BREAKING';
  connectionState: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
  currentProjectId: string;
  events: string[];
  diffStatus: string | null;
  breakingChanges: BreakingChange[];
  setShowModal: (show: boolean) => void;
}

const syntaxHighlight = (json: any) => {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, undefined, 2);
  }
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match: string) {
    let cls = 'json-number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'json-key';
      } else {
        cls = 'json-string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'json-boolean';
    } else if (/null/.test(match)) {
      cls = 'json-null';
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
};

export function CIMonitor({
  status,
  connectionState,
  currentProjectId,
  events,
  diffStatus,
  breakingChanges,
  setShowModal
}: CIMonitorProps) {
  const [expandedJson, setExpandedJson] = useState<Record<number, boolean>>({});
  const toggleJson = (idx: number) => setExpandedJson(prev => ({ ...prev, [idx]: !prev[idx] }));

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="border border-amber-500/20 p-1 bg-amber-500/5 rounded flex items-center">
        <AlertOctagon size={14} className="text-amber-500/80 ml-2 mr-2 flex-shrink-0" />
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500/80 overflow-hidden whitespace-nowrap overflow-ellipsis">
          NOTICE: All CI/CD manual overrides are permanently recorded to the immutable Postgres audit ledger. Maintain protocol at all times.
        </div>
      </div>

      <main className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="col-span-1 border border-slate-700/80 bg-[#121820] p-6 flex flex-col items-center justify-center space-y-6 rounded shadow-lg shadow-black/50">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-700/50 pb-2 w-full text-center">System Status</h2>
          {status === 'SAFE' && <ShieldCheck size={80} className="text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.2)]" />}
          {status === 'WARNING' && <Shield size={80} className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.2)]" />}
          {status === 'BREAKING' && <ShieldAlert size={80} className="text-rose-400 animate-pulse drop-shadow-[0_0_20px_rgba(251,113,133,0.4)]" />}
          <div className="border border-slate-700/80 px-6 py-2 bg-[#090c10] rounded shadow-inner">
            <span className="text-lg font-bold tracking-[0.2em] uppercase text-slate-200">{status}</span>
          </div>
        </div>

        <div className="col-span-1 md:col-span-3 border border-slate-700/80 bg-[#121820] p-6 flex flex-col rounded shadow-lg shadow-black/50">
          <h2 className="text-xs font-bold mb-4 flex flex-wrap justify-between items-center gap-2 uppercase tracking-widest text-slate-400 border-b border-slate-700/50 pb-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full animate-pulse ${connectionState === 'CONNECTED' ? 'bg-emerald-400' : connectionState === 'CONNECTING' ? 'bg-amber-400' : 'bg-rose-400'}`}></span>
              Live Event Socket ({currentProjectId})
            </div>
            <span className={`text-[9px] px-2 py-1 rounded border ${connectionState === 'CONNECTED' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : connectionState === 'CONNECTING' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 'border-rose-500/30 text-rose-400 bg-rose-500/10'}`}>
              {connectionState}
            </span>
          </h2>
          <div className="flex-1 bg-[#090c10] p-4 border border-slate-800 font-mono text-[11px] space-y-2 h-48 overflow-y-auto overflow-x-hidden rounded shadow-inner text-emerald-400/70 leading-relaxed">
            {events.length === 0 ? (
              <p className="text-slate-500 italic flex items-center h-full justify-center">Listening on port 8080... Waiting for CI dispatch.</p>
            ) : (
              events.map((e, i) => (
                <div key={i} className="border-b border-slate-800/80 pb-2 break-all hover:text-emerald-300 transition-colors animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                  <span className="text-slate-600 mr-2">{new Date().toLocaleTimeString()}</span> {e}
                </div>
              ))
            )}
          </div>
        </div>
        
        {diffStatus === 'FAILED' && (
          <div className="col-span-1 md:col-span-4 border border-rose-500/50 p-6 bg-[#160f11] shadow-[0_4px_30px_rgba(225,29,72,0.1)] rounded mt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-rose-500/20 pb-4 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-rose-400 uppercase tracking-wide flex items-center gap-3">
                  <ShieldAlert size={24} className="text-rose-500" /> Pipeline Blocked
                </h2>
                <p className="text-sm text-slate-300 mt-2 flex items-center gap-2">
                  <GitCommit size={14} className="text-slate-400"/> Diff Engine detected violations
                </p>
              </div>
              <button onClick={() => setShowModal(true)} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/50 px-6 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors rounded">
                Init Override Protocol
              </button>
            </div>
            
            {breakingChanges.length > 0 ? (
              <div className="space-y-4">
                {breakingChanges.map((change, idx) => (
                  <div key={idx} className="bg-[#121820] p-5 border border-slate-700/80 rounded animate-fade-in-up">
                    <div className="font-bold text-sm mb-4 flex flex-wrap justify-between items-center gap-2 border-b border-slate-700/80 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 uppercase rounded text-[10px] tracking-widest flex items-center gap-1">
                          <FileJson size={10} /> {change.line ? change.line : 'TARGET_PATH'}
                        </span> 
                        <span className="text-cyan-300 font-mono text-sm">{change.path || 'N/A'}</span>
                      </div>
                      <button onClick={() => toggleJson(idx)} className="text-[10px] tracking-widest bg-[#0d1117] hover:bg-slate-800 text-slate-300 border border-slate-600 px-3 py-1.5 font-bold uppercase rounded transition-colors flex items-center gap-2">
                        {expandedJson[idx] ? '[-] HIDE RAW' : '[+] VIEW RAW'}
                      </button>
                    </div>
                    <div className="text-xs mb-3 font-medium text-slate-300 border-l-2 border-amber-500/50 pl-4 py-1.5 bg-amber-500/5 rounded-r">
                      <span className="text-amber-500 uppercase mr-3 font-bold text-[10px] tracking-widest">Citation:</span> {change.citation || 'N/A'}
                    </div>
                    <div className="text-xs bg-emerald-950/30 border border-emerald-500/20 p-4 text-emerald-300 rounded flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <CheckSquare size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="uppercase text-emerald-500 mr-2 font-bold text-[10px] tracking-widest block mb-1">Proposed Fix:</span> 
                          <span className="leading-relaxed">{change.proposed_fix || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {expandedJson[idx] && (
                      <div className="mt-4 relative animate-fade-in-up">
                        <div className="absolute top-0 right-0 bg-slate-800 text-slate-400 text-[9px] uppercase px-2 py-1 rounded-bl border-b border-l border-slate-700">AST_PAYLOAD.JSON</div>
                        <pre 
                          className="bg-[#090c10] border border-slate-800 p-5 text-[11px] overflow-x-auto font-mono text-slate-300 rounded shadow-inner"
                          dangerouslySetInnerHTML={{ __html: syntaxHighlight(change) }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-slate-900/50 rounded border border-slate-800">
                <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Decrypting AST payload...</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
