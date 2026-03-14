import { useStore } from '../../store/useStore';

export function LoadingOverlay() {
  const isLoading = useStore((s) => s.isLoading);
  const loadingMessage = useStore((s) => s.loadingMessage);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-slate-600 border-t-brand-400 rounded-full animate-spin" />
        <p className="text-sm text-slate-300 animate-pulse">{loadingMessage || 'Processing…'}</p>
      </div>
    </div>
  );
}
