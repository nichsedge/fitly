'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from './AppIcon';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  t?: (key: string) => string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  private t(key: string): string {
    const { t: translate } = this.props;
    return translate ? translate(key) : key;
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-8)',
            textAlign: 'center',
            minHeight: '300px',
          }}
          role="alert"
        >
          <div style={{ fontSize: 48, marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'center' }}>
            <AlertTriangle size={48} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 'var(--space-2)' }}>
            {this.t('somethingWentWrong') || 'Something went wrong'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)', maxWidth: 400 }}>
            {this.t('errorBoundaryMessage') || 'We ran into a problem loading this section. Please try again or contact support if the issue persists.'}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleRetry}
              className="btn btn-primary"
              style={{ padding: 'var(--space-3) var(--space-6)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={16} />
              <span>{this.t('retry') || 'Retry'}</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-ghost"
              style={{ padding: 'var(--space-3) var(--space-6)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={16} />
              <span>{this.t('refreshPage') || 'Refresh Page'}</span>
            </button>
          </div>
          {this.state.error && (
            <details style={{ marginTop: 'var(--space-6)', textAlign: 'left', maxWidth: 500, width: '100%' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}>
                {this.t('showDetails') || 'Show Details'}
              </summary>
              <pre
                style={{
                  marginTop: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  background: 'var(--bg-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 11,
                  overflow: 'auto',
                  color: 'var(--text-secondary)',
                }}
              >
                {this.state.error.message}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}