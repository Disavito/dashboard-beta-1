import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  moduleName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ModuleErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary ${this.props.moduleName || 'Unknown'}]:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                Error en {this.props.moduleName || 'el módulo'}
              </h2>
              <p className="text-muted-foreground text-sm mt-2">
                Ha ocurrido un error inesperado. Puedes intentar recargar el módulo.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-muted/50 rounded-xl p-4 text-left">
                <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest mb-1">Detalle Técnico</p>
                <p className="text-xs font-mono text-red-600 break-all">{this.state.error.message}</p>
              </div>
            )}
            <Button
              onClick={this.handleRetry}
              className="bg-[#4892CC] hover:bg-[#3C8B93] text-white rounded-xl font-bold h-12 px-6 shadow-lg shadow-[#4892CC]/20"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Reintentar
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ModuleErrorBoundary;
