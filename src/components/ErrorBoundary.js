import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      hasError: true,
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // You can customize the fallback UI
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong.</h2>
          <details style={{ textAlign: 'left' }}>
            <summary>Click to see details</summary>
            <div style={{ marginTop: '10px' }}>
              <strong>Error message:</strong> {this.state.error?.message || 'Unknown error'}
            </div>
            {this.state.errorInfo && (
              <div style={{ marginTop: '10px' }}>
                <strong>Component stack:</strong> {this.state.errorInfo.componentStack}
              </div>
            )}
          </details>
          <button 
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            style={{ marginTop: '20px', padding: '10px 20px' }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;