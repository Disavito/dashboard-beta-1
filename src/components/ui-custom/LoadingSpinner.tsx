import { Wallet } from 'lucide-react';

const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="relative">
        {/* Glow ring */}
        <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
        {/* Icon */}
        <div className="relative w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-glow-blue animate-pulse">
          <Wallet className="text-white w-7 h-7" />
        </div>
      </div>
      {/* Shimmer bar */}
      <div className="mt-6 w-48 h-1.5 rounded-full overflow-hidden bg-slate-100">
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent rounded-full" 
             style={{ animation: 'shimmer 1.8s ease-in-out infinite' }} />
      </div>
      <p className="mt-4 text-sm font-bold text-slate-400 tracking-wide">Cargando...</p>
    </div>
  );
};

export default LoadingSpinner;
