import { ShieldAlert } from 'lucide-react';

interface OverrideModalProps {
  setShowModal: (show: boolean) => void;
  overrideNote: string;
  setOverrideNote: (note: string) => void;
  handleOverride: () => void;
  isSubmitting: boolean;
}

export function OverrideModal({
  setShowModal,
  overrideNote,
  setOverrideNote,
  handleOverride,
  isSubmitting
}: OverrideModalProps) {
  return (
    <div className="fixed inset-0 bg-[#090c10]/80 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-[#121820] p-8 border border-rose-500/50 w-full max-w-2xl rounded-lg relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl"></div>
        <div className="bg-rose-500/10 text-rose-400 px-5 py-3 mb-6 flex justify-between items-center font-bold uppercase text-xs tracking-widest border border-rose-500/20 rounded relative z-10">
          <h3 className="flex items-center gap-2"><ShieldAlert size={16}/> SYSTEM.OVERRIDE_GOVERNANCE</h3>
          <button onClick={() => setShowModal(false)} className="hover:text-rose-300 text-rose-500 transition-colors p-1">✕</button>
        </div>
        <div className="mb-6 relative z-10">
          <label className="font-bold block mb-3 uppercase text-[10px] tracking-widest text-cyan-500">Enter Justification Log:</label>
          <textarea 
            className="w-full bg-[#090c10] border border-slate-700 p-4 text-slate-300 focus:outline-none focus:border-cyan-500/50 min-h-[120px] resize-none font-mono text-sm rounded transition-all"
            value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-3 relative z-10">
          <button onClick={() => setShowModal(false)} className="bg-transparent text-slate-400 border border-slate-700 px-6 py-2.5 text-xs font-bold uppercase rounded">Abort</button>
          <button onClick={handleOverride} disabled={isSubmitting || !overrideNote} className="px-6 py-2.5 bg-rose-500/10 text-rose-400 font-bold text-xs uppercase border border-rose-500/50 rounded">{isSubmitting ? 'Signing...' : 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}
