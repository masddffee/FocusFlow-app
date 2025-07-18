import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/colors';
import Theme from '@/constants/theme';

interface LoadingScreenProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  showMessage?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message,
  size = 'large',
  color = Colors.light.primary,
  showMessage = true
}) => {
  const { t } = useTranslation();
  
  const displayMessage = message || t('common.loading');

  return (
    <View style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator 
          size={size} 
          color={color} 
          style={styles.indicator}
        />
        {showMessage && (
          <Text style={styles.loadingText}>
            {displayMessage}
          </Text>
        )}
      </View>
    </View>
  );
};

// Full screen loading overlay
export const LoadingOverlay: React.FC<LoadingScreenProps> = (props) => {
  return (
    <View style={styles.overlay}>
      <LoadingScreen {...props} />
    </View>
  );
};

// Inline loading component
export const InlineLoading: React.FC<LoadingScreenProps> = ({ 
  message,
  size = 'small',
  color = Colors.light.primary,
  showMessage = true
}) => {
  const { t } = useTranslation();
  const displayMessage = message || t('common.loading');

  return (
    <View style={styles.inlineContainer}>
      <ActivityIndicator 
        size={size} 
        color={color} 
        style={styles.inlineIndicator}
      />
      {showMessage && (
        <Text style={styles.inlineText}>
          {displayMessage}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.xl,
  },
  indicator: {
    marginBottom: Theme.spacing.md,
  },
  loadingText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    textAlign: 'center',
    marginTop: Theme.spacing.sm,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.md,
  },
  inlineIndicator: {
    marginRight: Theme.spacing.sm,
  },
  inlineText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
  },
});

export default LoadingScreen;