import { ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AuthPromptCardProps {
  title?: string;
  description?: string;
}

export function AuthPromptCard({
  title = 'Sign in to Your Car Depot Account',
  description = 'Sign in with Google to submit applications, track Save to Own progress, save vehicles, and receive dealership updates in your dashboard.',
}: AuthPromptCardProps) {
  const { loginWithGoogle, authError } = useApp();

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-lg mx-auto text-center">
      <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-4">
        <ShieldCheck className="w-6 h-6 text-red-500" />
      </div>
      <h2 className="font-display font-bold text-xl text-slate-900 mb-2">{title}</h2>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed">{description}</p>
      {authError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          {authError}
        </p>
      )}
      <button
        type="button"
        onClick={() => loginWithGoogle()}
        className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        Continue with Google
      </button>
    </div>
  );
}
