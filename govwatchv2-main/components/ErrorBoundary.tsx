import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gw-bg flex items-center justify-center p-4">
                    <div className="bg-gw-card border border-gw-danger/30 rounded-lg p-8 max-w-md w-full shadow-2xl text-center">
                        <div className="w-16 h-16 bg-gw-danger/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-gw-danger" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                        <p className="text-gw-muted mb-6">
                            The application encountered an unexpected error. Please try refreshing the page.
                        </p>
                        {this.state.error && (
                            <div className="bg-black/30 p-4 rounded text-left mb-6 overflow-auto max-h-32">
                                <code className="text-xs text-gw-danger font-mono break-words">
                                    {this.state.error.message}
                                </code>
                            </div>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center justify-center gap-2 bg-gw-success hover:bg-gw-success/90 text-gw-bg font-bold py-3 px-6 rounded-lg w-full transition-colors"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Refresh Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
