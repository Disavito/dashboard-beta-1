import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const AuthPage: React.FC = () => {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        navigate('/'); // Redirect to dashboard on successful login
      }
    });

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (isSignIn) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Inicio de sesión exitoso. Redirigiendo...');
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Registro exitoso. Por favor, revisa tu correo para verificar tu cuenta.');
        setIsSignIn(true); // Switch to sign-in after successful sign-up
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-corp-teal/5 rounded-full blur-3xl" />
      
      <Card className="w-full max-w-md border-white/60 shadow-premium-lg rounded-2xl overflow-hidden animate-scale-in backdrop-blur-sm bg-card dark:bg-slate-900/90">
        <CardHeader className="text-center p-8 pb-6">
          {/* Logo */}
          <div className="flex flex-col items-center justify-center mb-6 gap-3">
            <img src="/logo.png" alt="Fimagadi Logo" className="w-20 h-20 object-contain drop-shadow-xl" />
            <span className="text-2xl font-black tracking-widest text-foreground uppercase">
              FIMAGADI
            </span>
          </div>
          <CardTitle className="text-2xl font-black text-foreground tracking-tight">
            {isSignIn ? 'Bienvenido de nuevo' : 'Únete a FIMAGADI'}
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium mt-1">
            {isSignIn ? 'Inicia sesión para acceder a tu dashboard.' : 'Crea una cuenta para empezar a gestionar tus finanzas.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-muted/50/80 border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground/80 font-medium placeholder:text-muted-foreground/70 transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 bg-muted/50/80 border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground/80 font-medium placeholder:text-muted-foreground/70 transition-all duration-200"
              />
            </div>
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 dark:text-red-400 border border-red-100 rounded-xl animate-slide-up-fade">
                <p className="text-red-600 text-sm font-medium text-center">{error}</p>
              </div>
            )}
            {message && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 rounded-xl animate-slide-up-fade">
                <p className="text-emerald-600 text-sm font-medium text-center">{message}</p>
              </div>
            )}
            <Button
              type="submit"
              className={cn(
                "w-full h-12 text-base font-bold rounded-xl transition-all duration-300",
                "bg-gradient-to-r from-primary to-corp-teal text-white hover:shadow-glow-blue",
                loading && "opacity-70 cursor-not-allowed"
              )}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                isSignIn ? 'Iniciar Sesión' : 'Registrarse'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center px-8 pb-8 pt-0">
          <Button
            variant="link"
            onClick={() => setIsSignIn(!isSignIn)}
            className="text-muted-foreground hover:text-primary transition-colors duration-200 font-medium"
          >
            {isSignIn ? '¿No tienes una cuenta? Regístrate' : '¿Ya tienes una cuenta? Inicia Sesión'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthPage;
