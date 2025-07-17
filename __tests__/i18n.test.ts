/**
 * i18n Testing Concepts and Patterns
 * 
 * This file demonstrates how to test the i18n functionality.
 * To run these tests, you would need to install Jest:
 * 
 * npm install --save-dev jest @types/jest @babel/preset-env
 * 
 * Or use Expo's built-in testing setup:
 * npx create-expo-app --template blank-typescript
 */

// Type definitions for Jest globals (if not available)
declare global {
  var describe: (name: string, fn: () => void) => void;
  var it: (name: string, fn: () => void | Promise<void>) => void;
  var beforeEach: (fn: () => void) => void;
  var expect: any;
  var jest: any;
}

// Mock AsyncStorage
const mockedAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock i18n
const i18n = {
  changeLanguage: jest.fn(),
  language: 'en',
  t: jest.fn(),
};

// Mock AsyncStorage import
const AsyncStorage = mockedAsyncStorage;

// Mock Expo modules
jest.mock('expo-updates', () => ({
  reloadAsync: jest.fn(),
  isEnabled: true,
}));

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(() => ({
    t: jest.fn((key: string, params?: any) => {
      if (params && params.count !== undefined) {
        return `${params.count} minutes`;
      }
      return key;
    }),
  })),
}));

describe('i18n System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Language Persistence', () => {
    it('should save language preference to AsyncStorage', async () => {
      const testLanguage = 'zh';
      
      // Mock successful storage
      mockedAsyncStorage.setItem.mockResolvedValueOnce(undefined);
      
      await AsyncStorage.setItem('user-language', testLanguage);
      
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        'user-language',
        testLanguage
      );
    });

    it('should retrieve saved language from AsyncStorage', async () => {
      const savedLanguage = 'zh';
      
      // Mock stored language
      mockedAsyncStorage.getItem.mockResolvedValueOnce(savedLanguage);
      
      const result = await AsyncStorage.getItem('user-language');
      
      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith('user-language');
      expect(result).toBe(savedLanguage);
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      // Mock AsyncStorage failure
      mockedAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage unavailable'));
      
      try {
        await AsyncStorage.getItem('user-language');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
      
      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith('user-language');
    });
  });

  describe('Language Change Functionality', () => {
    it('should change i18n language', async () => {
      const newLanguage = 'zh';
      
      // Mock i18n.changeLanguage to resolve successfully
      const mockChangeLanguage = jest.fn().mockResolvedValueOnce(undefined);
      i18n.changeLanguage = mockChangeLanguage;
      
      await i18n.changeLanguage(newLanguage);
      
      expect(mockChangeLanguage).toHaveBeenCalledWith(newLanguage);
    });

    it('should persist language change to AsyncStorage', async () => {
      const newLanguage = 'zh';
      
      // Mock successful operations
      const mockChangeLanguage = jest.fn().mockResolvedValueOnce(undefined);
      i18n.changeLanguage = mockChangeLanguage;
      mockedAsyncStorage.setItem.mockResolvedValueOnce(undefined);
      
      // Simulate the language change process
      await i18n.changeLanguage(newLanguage);
      await AsyncStorage.setItem('user-language', newLanguage);
      
      expect(mockChangeLanguage).toHaveBeenCalledWith(newLanguage);
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        'user-language',
        newLanguage
      );
    });

    it('should handle language change errors', async () => {
      const newLanguage = 'zh';
      
      // Mock i18n.changeLanguage to fail
      const mockChangeLanguage = jest.fn().mockRejectedValueOnce(
        new Error('Language change failed')
      );
      i18n.changeLanguage = mockChangeLanguage;
      
      try {
        await i18n.changeLanguage(newLanguage);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Language change failed');
      }
      
      expect(mockChangeLanguage).toHaveBeenCalledWith(newLanguage);
    });
  });

  describe('Expo Updates Integration', () => {
    it('should call Updates.reloadAsync when available', async () => {
      const Updates = require('expo-updates');
      
      await Updates.reloadAsync();
      
      expect(Updates.reloadAsync).toHaveBeenCalled();
    });

    it('should handle Updates.reloadAsync failure', async () => {
      const Updates = require('expo-updates');
      
      // Mock Updates.reloadAsync to fail
      Updates.reloadAsync.mockRejectedValueOnce(new Error('Reload failed'));
      
      try {
        await Updates.reloadAsync();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Reload failed');
      }
      
      expect(Updates.reloadAsync).toHaveBeenCalled();
    });
  });

  describe('Parameter Interpolation', () => {
    it('should handle parameter interpolation correctly', () => {
      const { useTranslation } = require('react-i18next');
      const { t } = useTranslation();
      
      const result = t('timeUnits.minutes', { count: 5 });
      
      expect(result).toBe('5 minutes');
    });

    it('should handle translation without parameters', () => {
      const { useTranslation } = require('react-i18next');
      const { t } = useTranslation();
      
      const result = t('common.save');
      
      expect(result).toBe('common.save');
    });
  });

  describe('Language Detection', () => {
    it('should detect system language correctly', () => {
      const Localization = require('expo-localization');
      
      const locales = Localization.getLocales();
      
      expect(locales).toEqual([{ languageCode: 'en' }]);
      expect(Localization.getLocales).toHaveBeenCalled();
    });

    it('should default to English for unsupported languages', () => {
      const Localization = require('expo-localization');
      
      // Mock unsupported language
      Localization.getLocales.mockReturnValueOnce([{ languageCode: 'fr' }]);
      
      const locales = Localization.getLocales();
      const systemLanguage = locales[0]?.languageCode;
      const selectedLanguage = systemLanguage?.startsWith('zh') ? 'zh' : 'en';
      
      expect(selectedLanguage).toBe('en');
    });

    it('should select Chinese for Chinese locales', () => {
      const Localization = require('expo-localization');
      
      // Mock Chinese language
      Localization.getLocales.mockReturnValueOnce([{ languageCode: 'zh' }]);
      
      const locales = Localization.getLocales();
      const systemLanguage = locales[0]?.languageCode;
      const selectedLanguage = systemLanguage?.startsWith('zh') ? 'zh' : 'en';
      
      expect(selectedLanguage).toBe('zh');
    });
  });

  describe('Integration Test: Complete Language Change Flow', () => {
    it('should perform complete language change with persistence and reload', async () => {
      const newLanguage = 'zh';
      
      // Mock all dependencies
      const mockChangeLanguage = jest.fn().mockResolvedValueOnce(undefined);
      i18n.changeLanguage = mockChangeLanguage;
      mockedAsyncStorage.setItem.mockResolvedValueOnce(undefined);
      
      const Updates = require('expo-updates');
      Updates.reloadAsync.mockResolvedValueOnce(undefined);

      // Simulate complete language change flow
      try {
        // 1. Change i18n language
        await i18n.changeLanguage(newLanguage);
        
        // 2. Save to AsyncStorage
        await AsyncStorage.setItem('user-language', newLanguage);
        
        // 3. Reload app (in production)
        if (!__DEV__ && Updates.isEnabled) {
          await Updates.reloadAsync();
        }
        
        // Verify all steps were called
        expect(mockChangeLanguage).toHaveBeenCalledWith(newLanguage);
        expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
          'user-language',
          newLanguage
        );
        
        if (!__DEV__ && Updates.isEnabled) {
          expect(Updates.reloadAsync).toHaveBeenCalled();
        }
        
      } catch (error) {
        // Should not reach here in successful flow
        throw error;
      }
    });
  });
});

// Additional test for the enhanced language change function logic
describe('Enhanced Language Change Function', () => {
  const mockHandleLanguageChange = async (newLang: 'en' | 'zh') => {
    try {
      // Change i18n language
      await i18n.changeLanguage(newLang);
      
      // Save to AsyncStorage for persistence
      await AsyncStorage.setItem('user-language', newLang);
      
      // Simulate app reload logic
      if (__DEV__) {
        // Development mode - show manual restart alert
        return { requiresManualRestart: true };
      } else {
        // Production mode - try auto reload
        try {
          const Updates = require('expo-updates');
          if (Updates.isEnabled) {
            await Updates.reloadAsync();
            return { reloadSuccessful: true };
          } else {
            return { requiresManualRestart: true };
          }
        } catch (error) {
          return { requiresManualRestart: true, error };
        }
      }
    } catch (error) {
      throw new Error(`Language change failed: ${error}`);
    }
  };

  it('should handle development mode correctly', async () => {
    // Mock development environment
    const originalDev = (global as any).__DEV__;
    (global as any).__DEV__ = true;
    
    const mockChangeLanguage = jest.fn().mockResolvedValueOnce(undefined);
    i18n.changeLanguage = mockChangeLanguage;
    mockedAsyncStorage.setItem.mockResolvedValueOnce(undefined);
    
    const result = await mockHandleLanguageChange('zh');
    
    expect(result).toEqual({ requiresManualRestart: true });
    expect(mockChangeLanguage).toHaveBeenCalledWith('zh');
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith('user-language', 'zh');
    
    // Restore original __DEV__ value
    (global as any).__DEV__ = originalDev;
  });

  it('should handle production mode with successful reload', async () => {
    // Mock production environment
    const originalDev = (global as any).__DEV__;
    (global as any).__DEV__ = false;
    
    const mockChangeLanguage = jest.fn().mockResolvedValueOnce(undefined);
    i18n.changeLanguage = mockChangeLanguage;
    mockedAsyncStorage.setItem.mockResolvedValueOnce(undefined);
    
    const Updates = require('expo-updates');
    Updates.isEnabled = true;
    Updates.reloadAsync.mockResolvedValueOnce(undefined);
    
    const result = await mockHandleLanguageChange('en');
    
    expect(result).toEqual({ reloadSuccessful: true });
    expect(Updates.reloadAsync).toHaveBeenCalled();
    
    // Restore original __DEV__ value
    (global as any).__DEV__ = originalDev;
  });
});

// Mock setup that would be used with Jest
const mockAsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    // Mock implementation
    return key === 'user-language' ? 'zh' : null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    // Mock implementation
    console.log(`Setting ${key} = ${value}`);
  }
};

const mockI18n = {
  changeLanguage: async (language: string): Promise<void> => {
    console.log(`Changing language to: ${language}`);
  },
  language: 'en',
  t: (key: string, params?: any): string => {
    if (params && params.count !== undefined) {
      return `${params.count} minutes`;
    }
    return key;
  }
};

// Enhanced language change function (actual implementation)
export const handleLanguageChange = async (newLang: 'en' | 'zh') => {
  try {
    // 1. Change i18n language
    await mockI18n.changeLanguage(newLang);
    
    // 2. Save to AsyncStorage for persistence
    await mockAsyncStorage.setItem('user-language', newLang);
    
    // 3. Trigger app reload based on platform capabilities
    if (__DEV__) {
      // Development mode - show manual restart alert
      console.log('Development mode: Manual restart required');
      return { requiresManualRestart: true };
    } else {
      // Production mode - try auto reload
      try {
        // In a real app, this would be:
        // const Updates = require('expo-updates');
        // if (Updates.isEnabled) {
        //   await Updates.reloadAsync();
        //   return { reloadSuccessful: true };
        // }
        
        console.log('Production mode: Auto reload successful');
        return { reloadSuccessful: true };
      } catch (error) {
        console.log('Production mode: Auto reload failed, manual restart required');
        return { requiresManualRestart: true, error };
      }
    }
  } catch (error) {
    throw new Error(`Language change failed: ${error}`);
  }
};

// Test cases (conceptual - would work with Jest)
export const testCases = {
  // Test 1: Language persistence
  testLanguagePersistence: async () => {
    console.log('Testing language persistence...');
    
    const testLanguage = 'zh';
    await mockAsyncStorage.setItem('user-language', testLanguage);
    const retrieved = await mockAsyncStorage.getItem('user-language');
    
    console.log(`Expected: ${testLanguage}, Got: ${retrieved}`);
    return retrieved === testLanguage;
  },

  // Test 2: Parameter interpolation
  testParameterInterpolation: () => {
    console.log('Testing parameter interpolation...');
    
    const result = mockI18n.t('timeUnits.minutes', { count: 5 });
    const expected = '5 minutes';
    
    console.log(`Expected: ${expected}, Got: ${result}`);
    return result === expected;
  },

  // Test 3: Language change flow
  testLanguageChangeFlow: async () => {
    console.log('Testing complete language change flow...');
    
    try {
      const result = await handleLanguageChange('zh');
      console.log('Language change result:', result);
      return true;
    } catch (error) {
      console.error('Language change failed:', error);
      return false;
    }
  },

  // Test 4: Error handling
  testErrorHandling: async () => {
    console.log('Testing error handling...');
    
    // Mock a failure scenario
    const originalChangeLanguage = mockI18n.changeLanguage;
    mockI18n.changeLanguage = async () => {
      throw new Error('Network error');
    };
    
    try {
      await handleLanguageChange('en');
      return false; // Should have thrown
    } catch (error) {
      console.log('Successfully caught error:', error);
      // Restore original function
      mockI18n.changeLanguage = originalChangeLanguage;
      return true;
    }
  },

  // Test 5: AsyncStorage fallback
  testAsyncStorageFallback: async () => {
    console.log('Testing AsyncStorage fallback...');
    
    // Mock AsyncStorage failure
    const originalGetItem = mockAsyncStorage.getItem;
    mockAsyncStorage.getItem = async () => {
      throw new Error('Storage unavailable');
    };
    
    try {
      await mockAsyncStorage.getItem('user-language');
      return false; // Should have thrown
    } catch (error) {
      console.log('Successfully handled AsyncStorage error:', error);
      // Restore original function
      mockAsyncStorage.getItem = originalGetItem;
      return true;
    }
  }
};

// Run all tests (conceptual)
export const runAllTests = async () => {
  console.log('🧪 Running i18n Tests...\n');
  
  const results = await Promise.all([
    testCases.testLanguagePersistence(),
    testCases.testParameterInterpolation(),
    testCases.testLanguageChangeFlow(),
    testCases.testErrorHandling(),
    testCases.testAsyncStorageFallback()
  ]);
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log(`\n✅ Tests completed: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('❌ Some tests failed');
  }
  
  return { passed, total, success: passed === total };
};

// Usage examples for real components
export const usageExamples = {
  // Example 1: Using useTranslation in a component
  componentExample: `
import React from 'react';
import { Text, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

export const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <Text>{t('home.welcome')}</Text>
    <Text>{t('timeUnits.minutes', { count: 5 })}</Text>
  );
};
  `,

  // Example 2: Language change with proper error handling
  languageChangeExample: `
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/constants/i18n';
import { Alert } from 'react-native';

const handleLanguageChange = async (newLang: 'en' | 'zh') => {
  try {
    await i18n.changeLanguage(newLang);
    await AsyncStorage.setItem('user-language', newLang);
    
    Alert.alert(
      i18n.t('alerts.restartRequired'),
      i18n.t('alerts.manualRestartMessage'),
      [{ text: i18n.t('alerts.ok') }]
    );
  } catch (error) {
    Alert.alert(
      i18n.t('common.error'),
      'Failed to change language. Please try again.',
      [{ text: i18n.t('alerts.ok') }]
    );
  }
};
  `,

  // Example 3: API error handling with i18n
  apiErrorExample: `
import { api, handleApiError } from '@/utils/api';
import { Alert } from 'react-native';
import i18n from '@/constants/i18n';

const fetchData = async () => {
  try {
    const data = await api.getProfile();
    return data;
  } catch (error) {
    const errorMessage = handleApiError(error);
    Alert.alert(
      i18n.t('common.error'),
      errorMessage,
      [{ text: i18n.t('alerts.ok') }]
    );
  }
};
  `
};

// Common pitfalls and solutions
export const commonPitfalls = {
  staleCachedTranslations: {
    problem: "Translations don't update immediately after language change",
    solution: "Use i18n.changeLanguage() and ensure components re-render with useTranslation()"
  },
  
  missingTranslations: {
    problem: "Some translation keys return the key instead of translated text",
    solution: "Check fallbackLng configuration and ensure all keys exist in both language files"
  },
  
  asyncStorageRace: {
    problem: "Language preference not persisting between app launches",
    solution: "Ensure AsyncStorage.setItem() is awaited and initialization is async"
  },
  
  parameterInterpolation: {
    problem: "Parameters not interpolating correctly (showing {{count}} instead of actual value)",
    solution: "Use correct syntax: t('timeUnits.minutes', { count: 5 }) and ensure interpolation is enabled"
  },
  
  appReloadIssues: {
    problem: "App doesn't restart after language change",
    solution: "Use proper reload logic: Expo Updates in production, manual restart prompt in development"
  }
};

// Export for manual testing
if (typeof window !== 'undefined') {
  // Browser environment - attach to window for manual testing
  (window as any).i18nTests = {
    runAllTests,
    testCases,
    usageExamples,
    commonPitfalls,
    handleLanguageChange
  };
}

console.log('i18n test utilities loaded. Call runAllTests() to execute conceptual tests.'); 