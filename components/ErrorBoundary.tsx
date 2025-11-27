import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/colors';
import Theme from '@/constants/theme';
import { log } from '@/lib/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log the error to unified logging system
    log.error('ErrorBoundary caught an error', { error, errorInfo }, 'ERROR_BOUNDARY');
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={this.state.error!} 
            retry={this.handleRetry} 
          />
        );
      }

      return <DefaultErrorFallback error={this.state.error!} retry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>
          {t('common.error')}
        </Text>
        <Text style={styles.errorMessage}>
          {t('errors.unknownError')}
        </Text>
        <Text style={styles.errorDetails}>
          {error.message}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={retry}
        >
          <Text style={styles.retryButtonText}>
            {t('messages.retry')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: Theme.spacing.lg,
  },
  errorContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  errorTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  errorDetails: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.md,
    fontWeight: '600',
  },
});

export default ErrorBoundary;