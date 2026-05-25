'use client';

import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  
  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary] caught:', error.message, error.stack);
    console.error('[ErrorBoundary] component stack:', info?.componentStack);
  }
  
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', color: '#fff', background: '#1a1a2e' }}>
          <h2 style={{ color: '#ef4e4b' }}>Render Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#89CFF0' }}>
            {this.state.error.message}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#888', marginTop: 16 }}>
            {this.state.error.stack}
          </pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 20, padding: '8px 16px', background: '#89CFF0', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
