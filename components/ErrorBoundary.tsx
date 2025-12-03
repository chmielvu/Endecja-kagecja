
import React, { ErrorInfo, ReactNode } from 'react';
import { BakeliteCard } from './BakeliteCard';
import { BakeliteButton } from './BakeliteButton';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-deco-navy flex items-center justify-center p-4">
          <BakeliteCard 
            title="System Critical Failure" 
            icon={<AlertTriangle className="text-deco-crimson" />} 
            className="w-full max-w-lg border-deco-crimson/50"
            headerClassName="!bg-deco-crimson/10"
          >
            <div className="p-6 text-center space-y-4">
              <div className="text-6xl font-spectral text-deco-gold opacity-50 select-none">
                ERR
              </div>
              <h2 className="text-xl font-bold text-deco-paper font-spectral">
                The Archive Has Encountered an Anomaly
              </h2>
              <p className="text-sm text-zinc-400 font-mono bg-black/20 p-4 rounded border border-deco-gold/10 overflow-auto max-h-40 text-left">
                {this.state.error?.message || "Unknown error occurred."}
              </p>
              <div className="pt-4 flex justify-center">
                <BakeliteButton 
                  onClick={this.handleReload} 
                  icon={<RefreshCw size={16} />}
                  variant="primary"
                >
                  Reinitialize System
                </BakeliteButton>
              </div>
            </div>
          </BakeliteCard>
        </div>
      );
    }

    return this.props.children;
  }
}
