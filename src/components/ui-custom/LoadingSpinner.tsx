

const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="relative">
        {/* Glow ring */}
        <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="relative w-24 h-24 flex flex-col items-center justify-center animate-pulse drop-shadow-xl z-10">
          <img src="/logo.png" alt="Fimagadi Logo" className="w-16 h-16 object-contain mb-2" />
          <span className="text-xs font-black tracking-widest text-primary uppercase">FIMAGADI</span>
        </div>
      </div>
      {/* Shimmer bar */}
      <div className="mt-6 w-48 h-1.5 rounded-full overflow-hidden bg-muted">
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent rounded-full" 
             style={{ animation: 'shimmer 1.8s ease-in-out infinite' }} />
      </div>
      <p className="mt-4 text-sm font-bold text-muted-foreground/70 tracking-wide">Cargando...</p>
    </div>
  );
};

export default LoadingSpinner;
