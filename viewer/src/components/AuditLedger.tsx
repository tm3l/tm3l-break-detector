import { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Shield, RefreshCw, Eye, X, UserCheck, Calendar } from 'lucide-react';

export interface DiffRunRecord {
  id: string;
  project_id: string;
  commit_sha?: string;
  status: 'PASSED' | 'FAILED' | 'OVERRIDDEN';
  breaking_count: number;
  dangerous_count: number;
  raw_diff_payload?: any;
  created_at: string;
}

export function AuditLedger() {
  const [runs, setRuns] = useState<DiffRunRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASSED' | 'FAILED' | 'OVERRIDDEN'>('ALL');
  const [selectedRun, setSelectedRun] = useState<DiffRunRecord | null>(null);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/diffs');
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const filteredRuns = runs.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="border border-emerald-500/30 bg-[#121820] p-6 rounded shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-4 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
              <ShieldCheck size={16} /> Immutable Audit Ledger
            </h2>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
              PostgreSQL GIN Indexed
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-[#090c10] border border-slate-700 rounded p-1">
              {(['ALL', 'PASSED', 'FAILED', 'OVERRIDDEN'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-colors ${
                    statusFilter === filter
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              onClick={fetchRuns}
              disabled={loading}
              className="flex items-center gap-2 bg-[#090c10] hover:bg-slate-800 text-slate-300 border border-slate-700 px-3 py-2 text-xs font-bold uppercase rounded transition-all disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin text-emerald-400' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto border border-slate-800 rounded bg-[#090c10]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#121820] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Run ID</th>
                <th className="py-3 px-4">Commit SHA</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Violations</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                    {loading ? 'Querying audit ledger...' : 'No historical diff records found.'}
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-cyan-400 text-[11px]">
                      {run.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-800/80 px-2 py-1 rounded text-[10px] text-slate-300 border border-slate-700">
                        {run.commit_sha ? run.commit_sha.slice(0, 10) : 'n/a'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase border ${
                          run.status === 'PASSED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : run.status === 'FAILED'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {run.status === 'PASSED' && <ShieldCheck size={10} />}
                        {run.status === 'FAILED' && <ShieldAlert size={10} />}
                        {run.status === 'OVERRIDDEN' && <Shield size={10} />}
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-rose-400 font-bold">{run.breaking_count} breaking</span>
                      {run.dangerous_count > 0 && (
                        <span className="text-amber-400 ml-2">({run.dangerous_count} risky)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[10px] flex items-center gap-1.5 pt-3.5">
                      <Calendar size={10} />
                      {new Date(run.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedRun(run)}
                        className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2.5 py-1 bg-cyan-950/40 text-cyan-400 hover:bg-cyan-900/50 border border-cyan-500/30 rounded transition-colors"
                      >
                        <Eye size={10} /> Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Modal */}
      {selectedRun && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="bg-[#121820] border border-cyan-500/50 rounded-lg p-6 max-w-2xl w-full space-y-4 shadow-2xl shadow-cyan-950/50">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Eye size={16} /> AST Diff Run Details
              </h3>
              <button
                onClick={() => setSelectedRun(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-[#090c10] p-3 rounded border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block">Diff ID</span>
                <span className="font-mono text-slate-300">{selectedRun.id}</span>
              </div>
              <div className="bg-[#090c10] p-3 rounded border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block">Commit SHA</span>
                <span className="font-mono text-slate-300">{selectedRun.commit_sha || 'N/A'}</span>
              </div>
            </div>

            {selectedRun.status === 'OVERRIDDEN' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300 flex items-center gap-2">
                <UserCheck size={14} className="text-amber-400 flex-shrink-0" />
                <span>Override Protocol successfully verified and logged to audit table.</span>
              </div>
            )}

            <div>
              <span className="text-[10px] text-slate-400 uppercase block mb-1">
                Raw Diff Payload (JSON)
              </span>
              <pre className="bg-[#090c10] border border-slate-800 rounded p-4 text-[11px] font-mono text-cyan-300/90 overflow-x-auto max-h-64 whitespace-pre-wrap">
                <code>{JSON.stringify(selectedRun.raw_diff_payload || selectedRun, null, 2)}</code>
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRun(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
