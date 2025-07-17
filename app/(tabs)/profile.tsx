import React, { useState, useEffect } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  Alert,
  Modal 
} from "react-native";
import { Stack } from "expo-router";
import { 
  Bell, 
  Calendar, 
  Clock, 
  Settings, 
  Moon, 
  Volume2, 
  Vibrate,
  Leaf,
  LogOut,
  CalendarDays,
  X,
  Languages
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import i18n from "@/constants/i18n";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import { useSettingsStore, AppLanguage } from "@/store/settingsStore";
import { useTaskStore } from "@/store/taskStore";
import { requestNotificationPermissions, requestCalendarPermissions } from "@/utils/permissions";
import { restartApp, canAutoRestart } from "@/utils/appRestart";
import TimeSlotPicker from "@/components/TimeSlotPicker";
import { TimeSlot } from "@/types/timeSlot";

export default function ProfileScreen() {
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const { t } = useTranslation();
  
  const {
    notificationsEnabled,
    calendarSyncEnabled,
    defaultFocusDuration,
    defaultBreakDuration,
    companionType,
    companionTheme,
    soundEnabled,
    vibrationEnabled,
    darkMode,
    availableTimeSlots,
    autoSchedulingEnabled,
    language,
    setNotificationsEnabled,
    setCalendarSyncEnabled,
    setDefaultFocusDuration,
    setDefaultBreakDuration,
    setCompanionType,
    setCompanionTheme,
    setSoundEnabled,
    setVibrationEnabled,
    setDarkMode,
    setAvailableTimeSlots,
    setAutoSchedulingEnabled,
    setHasCompletedOnboarding,
    setLanguage,
  } = useSettingsStore();

  // 監聽語言變化，同步到 i18n
  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);
  
  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const { granted } = await requestNotificationPermissions();
      setNotificationsEnabled(granted);
      
      if (!granted) {
        Alert.alert(
          t('alerts.notificationPermission'),
          t('alerts.notificationMessage')
        );
      }
    } else {
      setNotificationsEnabled(false);
    }
  };
  
  const handleToggleCalendarSync = async () => {
    if (!calendarSyncEnabled) {
      const { granted } = await requestCalendarPermissions();
      setCalendarSyncEnabled(granted);
      
      if (!granted) {
        Alert.alert(
          t('alerts.calendarPermission'),
          t('alerts.calendarMessage')
        );
      }
    } else {
      setCalendarSyncEnabled(false);
    }
  };
  
  const handleChangeFocusDuration = () => {
    Alert.alert(
      t('alerts.focusDurationTitle'),
      t('alerts.focusDurationMessage'),
      [
        { text: t('timeUnits.minutes', { count: 15 }), onPress: () => setDefaultFocusDuration(15) },
        { text: t('timeUnits.minutes', { count: 25 }), onPress: () => setDefaultFocusDuration(25) },
        { text: t('timeUnits.minutes', { count: 30 }), onPress: () => setDefaultFocusDuration(30) },
        { text: t('timeUnits.minutes', { count: 45 }), onPress: () => setDefaultFocusDuration(45) },
        { text: t('timeUnits.minutes', { count: 60 }), onPress: () => setDefaultFocusDuration(60) },
        { text: t('alerts.cancel'), style: "cancel" },
      ]
    );
  };
  
  const handleChangeBreakDuration = () => {
    Alert.alert(
      t('alerts.breakDurationTitle'),
      t('alerts.breakDurationMessage'),
      [
        { text: t('timeUnits.minutes', { count: 5 }), onPress: () => setDefaultBreakDuration(5) },
        { text: t('timeUnits.minutes', { count: 10 }), onPress: () => setDefaultBreakDuration(10) },
        { text: t('timeUnits.minutes', { count: 15 }), onPress: () => setDefaultBreakDuration(15) },
        { text: t('alerts.cancel'), style: "cancel" },
      ]
    );
  };
  
  const handleChangeCompanionType = () => {
    Alert.alert(
      t('alerts.companionTypeTitle'),
      t('alerts.companionTypeMessage'),
      [
        { text: t('companionTypes.plant'), onPress: () => setCompanionType("plant") },
        { text: t('companionTypes.animal'), onPress: () => setCompanionType("animal") },
        { text: t('companionTypes.landscape'), onPress: () => setCompanionType("landscape") },
        { text: t('alerts.cancel'), style: "cancel" },
      ]
    );
  };
  
  const handleChangeCompanionTheme = () => {
    Alert.alert(
      t('alerts.companionThemeTitle'),
      t('alerts.companionThemeMessage'),
      [
        { text: t('companionThemes.forest'), onPress: () => setCompanionTheme("forest") },
        { text: t('companionThemes.ocean'), onPress: () => setCompanionTheme("ocean") },
        { text: t('companionThemes.space'), onPress: () => setCompanionTheme("space") },
        { text: t('companionThemes.desert'), onPress: () => setCompanionTheme("desert") },
        { text: t('alerts.cancel'), style: "cancel" },
      ]
    );
  };
  
  // Enhanced language change handler with AsyncStorage and proper reload logic
  const handleLanguageChange = async (newLang: 'en' | 'zh') => {
    try {
      // Change i18n language
      await i18n.changeLanguage(newLang);
      
      // Save to AsyncStorage for persistence
      await AsyncStorage.setItem('user-language', newLang);
      
      // Update app state
      setLanguage(newLang);
      
      // Translate existing tasks
      await useTaskStore.getState().translateAllTasks(newLang);
      
      // Trigger app reload based on platform capabilities
      if (__DEV__) {
        // In development, show manual restart alert
        Alert.alert(
          t('alerts.restartRequired'),
          t('alerts.manualRestartMessage'),
          [{ text: t('alerts.ok') }]
        );
      } else {
        // In production, check if Expo Updates is available
        try {
          const Updates = require('expo-updates');
          if (Updates.isEnabled) {
            Alert.alert(
              t('alerts.restartRequired'),
              t('alerts.autoRestartMessage'),
              [
                { text: t('alerts.cancel'), style: "cancel" },
                { 
                  text: t('alerts.restartNow'), 
                  onPress: async () => {
                    try {
                      await Updates.reloadAsync();
                    } catch (error) {
                      console.error('Failed to reload with Updates:', error);
                      Alert.alert(
                        t('alerts.restartRequired'),
                        t('alerts.manualRestartMessage'),
                        [{ text: t('alerts.ok') }]
                      );
                    }
                  }
                }
              ]
            );
          } else {
            throw new Error('Updates not enabled');
          }
        } catch (error) {
          // Fallback: Use navigation reset or manual restart
          Alert.alert(
            t('alerts.restartRequired'),
            t('alerts.manualRestartMessage'),
            [{ text: t('alerts.ok') }]
          );
        }
      }
      
    } catch (error) {
      console.error('Language change failed:', error);
      Alert.alert(
        t('common.error'),
        'Failed to change language. Please try again.',
        [{ text: t('alerts.ok') }]
      );
    }
  };

  const handleChangeLanguage = () => {
    Alert.alert(
      t('alerts.languageTitle'),
      t('alerts.languageMessage'),
      [
        { 
          text: "English", 
          onPress: () => handleLanguageChange("en")
        },
        { 
          text: "繁體中文", 
          onPress: () => handleLanguageChange("zh")
        },
        { text: t('alerts.cancel'), style: "cancel" },
      ]
    );
  };
  
  const handleResetOnboarding = () => {
    Alert.alert(
      t('alerts.resetOnboardingTitle'),
      t('alerts.resetOnboardingMessage'),
      [
        { text: t('alerts.cancel'), style: "cancel" },
        { 
          text: t('alerts.reset'), 
          onPress: () => setHasCompletedOnboarding(false),
          style: "destructive"
        },
      ]
    );
  };

  const getTotalWeeklyHours = () => {
    let totalMinutes = 0;
    Object.values(availableTimeSlots).forEach((daySlots) => {
      daySlots.forEach((slot: TimeSlot) => {
        const [startHour, startMin] = slot.start.split(':').map(Number);
        const [endHour, endMin] = slot.end.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        totalMinutes += (endMinutes - startMinutes);
      });
    });
    return Math.round(totalMinutes / 60 * 10) / 10;
  };
  
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('profile.title') }} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.notifications')}</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Bell size={20} color={Colors.light.text} />
              <Text style={styles.settingText}>{t('profile.notificationsDesc')}</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: "#E5E7EB", true: Colors.light.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.calendar')}</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Calendar size={20} color={Colors.light.text} />
              <Text style={styles.settingText}>{t('profile.calendarSync')}</Text>
            </View>
            <Switch
              value={calendarSyncEnabled}
              onValueChange={handleToggleCalendarSync}
              trackColor={{ false: "#E5E7EB", true: Colors.light.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.studySchedule')}</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={() => setShowTimeSlotModal(true)}>
            <View style={styles.settingInfo}>
              <CalendarDays size={20} color={Colors.light.text} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingText}>{t('profile.availableTimeSlots')}</Text>
                <Text style={styles.settingSubtext}>
                  {t('profile.timeSlotsDesc', { hours: getTotalWeeklyHours() })}
                </Text>
              </View>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>{t('profile.configure')}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Settings size={20} color={Colors.light.text} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingText}>{t('profile.autoScheduling')}</Text>
                <Text style={styles.settingSubtext}>
                  {t('profile.autoSchedulingDesc')}
                </Text>
              </View>
            </View>
            <Switch
              value={autoSchedulingEnabled}
              onValueChange={setAutoSchedulingEnabled}
              trackColor={{ false: "#E5E7EB", true: Colors.light.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.focusTimer')}</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleChangeFocusDuration}>
            <View style={styles.settingInfo}>
              <Clock size={20} color={Colors.light.text} />
              <Text style={styles.settingText}>{t('profile.defaultFocusDuration')}</Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>{t('timeUnits.minutes', { count: defaultFocusDuration })}</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleChangeBreakDuration}>
            <View style={styles.settingInfo}>
              <Clock size={20} color={Colors.light.text} />
              <Text style={styles.settingText}>{t('profile.defaultBreakDuration')}</Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>{t('timeUnits.minutes', { count: defaultBreakDuration })}</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.companion')}</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleChangeCompanionType}>
            <View style={styles.settingInfo}>
              <Leaf size={20} color={Colors.light.text} />
              <Text style={styles.settingText}>{t('profile.companionType')}</Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>
                {t(`companionTypes.${companionType}`)}
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleChangeCompanionTheme}>
            <View style={styles.settingInfo}>
              <Settings size={20} color={Colors.light.text} />
              <Text style={styles.settingText}>{t('profile.companionTheme')}</Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>
                {t(`companionThemes.${companionTheme}`)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.appearance')}</Text>

          <TouchableOpacity style={styles.settingItem} onPress={handleChangeLanguage}>
            <View style={styles.settingInfo}>
              <Languages size={20} color={Colors.light.text} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingText}>{t('profile.language')}</Text>
                <Text style={styles.settingSubtext}>
                  {t('profile.languageDesc')}
                </Text>
              </View>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>
                {t(`languages.${language === 'zh' ? 'chinese' : 'english'}`)}
              </Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Moon size={20} color={Colors.light.text} />
              <Text style={styles.settingText}>{t('profile.darkMode')}</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#E5E7EB", true: Colors.light.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.soundHaptics')}</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Volume2 size={20} color={Colors.light.text} />
              <Text style={styles.settingText}>{t('profile.soundEffects')}</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: "#E5E7EB", true: Colors.light.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Vibrate size={20} color={Colors.light.text} />
              <Text style={styles.settingText}>{t('profile.vibration')}</Text>
            </View>
            <Switch
              value={vibrationEnabled}
              onValueChange={setVibrationEnabled}
              trackColor={{ false: "#E5E7EB", true: Colors.light.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.app')}</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleResetOnboarding}>
            <View style={styles.settingInfo}>
              <LogOut size={20} color={Colors.light.error} />
              <Text style={[styles.settingText, { color: Colors.light.error }]}>
                {t('profile.resetOnboarding')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>{t('profile.version')}</Text>
        </View>
      </ScrollView>

      {/* Time Slot Configuration Modal */}
      <Modal
        visible={showTimeSlotModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('timeSlotModal.title')}</Text>
            <TouchableOpacity
              onPress={() => setShowTimeSlotModal(false)}
              style={styles.closeButton}
            >
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              {t('timeSlotModal.description')}
            </Text>
            
            <TimeSlotPicker
              timeSlots={availableTimeSlots}
              onTimeSlotsChange={setAvailableTimeSlots}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: Theme.spacing.lg,
  },
  section: {
    marginBottom: Theme.spacing.xl,
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: Theme.spacing.md,
    flex: 1,
  },
  settingText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    marginLeft: Theme.spacing.md,
  },
  settingSubtext: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    marginTop: 2,
  },
  settingValue: {
    backgroundColor: "#F3F4F6",
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    borderRadius: Theme.radius.sm,
  },
  settingValueText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.text,
  },
  versionContainer: {
    alignItems: "center",
    marginVertical: Theme.spacing.xl,
  },
  versionText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingTop: 60, // Account for status bar
  },
  modalTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: "600",
    color: Colors.light.text,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: Theme.spacing.lg,
  },
  modalDescription: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
    lineHeight: 22,
    marginBottom: Theme.spacing.lg,
  },
});