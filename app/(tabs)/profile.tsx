import React, { useState } from "react";
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
  X
} from "lucide-react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import { useSettingsStore } from "@/store/settingsStore";
import { requestNotificationPermissions, requestCalendarPermissions } from "@/utils/permissions";
import TimeSlotPicker from "@/components/TimeSlotPicker";
import { TimeSlot } from "@/types/timeSlot";

export default function ProfileScreen() {
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  
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
  } = useSettingsStore();
  
  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const { granted } = await requestNotificationPermissions();
      setNotificationsEnabled(granted);
      
      if (!granted) {
        Alert.alert(
          "Notification Permission",
          "Please enable notifications in your device settings to receive reminders."
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
          "Calendar Permission",
          "Please enable calendar access in your device settings to sync your tasks."
        );
      }
    } else {
      setCalendarSyncEnabled(false);
    }
  };
  
  const handleChangeFocusDuration = () => {
    Alert.alert(
      "Focus Duration",
      "Select default focus session duration",
      [
        { text: "15 minutes", onPress: () => setDefaultFocusDuration(15) },
        { text: "25 minutes", onPress: () => setDefaultFocusDuration(25) },
        { text: "30 minutes", onPress: () => setDefaultFocusDuration(30) },
        { text: "45 minutes", onPress: () => setDefaultFocusDuration(45) },
        { text: "60 minutes", onPress: () => setDefaultFocusDuration(60) },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };
  
  const handleChangeBreakDuration = () => {
    Alert.alert(
      "Break Duration",
      "Select default break duration",
      [
        { text: "5 minutes", onPress: () => setDefaultBreakDuration(5) },
        { text: "10 minutes", onPress: () => setDefaultBreakDuration(10) },
        { text: "15 minutes", onPress: () => setDefaultBreakDuration(15) },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };
  
  const handleChangeCompanionType = () => {
    Alert.alert(
      "Companion Type",
      "Select your focus companion",
      [
        { text: "Plant", onPress: () => setCompanionType("plant") },
        { text: "Animal", onPress: () => setCompanionType("animal") },
        { text: "Landscape", onPress: () => setCompanionType("landscape") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };
  
  const handleChangeCompanionTheme = () => {
    Alert.alert(
      "Companion Theme",
      "Select your companion theme",
      [
        { text: "Forest", onPress: () => setCompanionTheme("forest") },
        { text: "Ocean", onPress: () => setCompanionTheme("ocean") },
        { text: "Space", onPress: () => setCompanionTheme("space") },
        { text: "Desert", onPress: () => setCompanionTheme("desert") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };
  
  const handleResetOnboarding = () => {
    Alert.alert(
      "Reset Onboarding",
      "Are you sure you want to reset the onboarding process? You will see the introduction screens again next time you open the app.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
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
      <Stack.Screen options={{ title: "Profile" }} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Bell size={20} color={Colors.light.text} />
              <Text style={styles.settingText}>Enable Notifications</Text>
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
          <Text style={styles.sectionTitle}>Calendar</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Calendar size={20} color={Colors.light.text} />
              <Text style={styles.settingText}>Sync with Calendar</Text>
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
          <Text style={styles.sectionTitle}>Study Schedule</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={() => setShowTimeSlotModal(true)}>
            <View style={styles.settingInfo}>
              <CalendarDays size={20} color={Colors.light.text} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingText}>Available Time Slots</Text>
                <Text style={styles.settingSubtext}>
                  {getTotalWeeklyHours()}h per week configured
                </Text>
              </View>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>Configure</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Settings size={20} color={Colors.light.text} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingText}>Auto-Scheduling</Text>
                <Text style={styles.settingSubtext}>
                  Automatically schedule tasks in available slots
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
          <Text style={styles.sectionTitle}>Focus Timer</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleChangeFocusDuration}>
            <View style={styles.settingInfo}>
              <Clock size={20} color={Colors.light.text} />
              <Text style={styles.settingText}>Default Focus Duration</Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>{defaultFocusDuration} min</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleChangeBreakDuration}>
            <View style={styles.settingInfo}>
              <Clock size={20} color={Colors.light.text} />
              <Text style={styles.settingText}>Default Break Duration</Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>{defaultBreakDuration} min</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Companion</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleChangeCompanionType}>
            <View style={styles.settingInfo}>
              <Leaf size={20} color={Colors.light.text} />
              <Text style={styles.settingText}>Companion Type</Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>
                {companionType.charAt(0).toUpperCase() + companionType.slice(1)}
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleChangeCompanionTheme}>
            <View style={styles.settingInfo}>
              <Settings size={20} color={Colors.light.text} />
              <Text style={styles.settingText}>Companion Theme</Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>
                {companionTheme.charAt(0).toUpperCase() + companionTheme.slice(1)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Moon size={20} color={Colors.light.text} />
              <Text style={styles.settingText}>Dark Mode</Text>
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
          <Text style={styles.sectionTitle}>Sound & Haptics</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Volume2 size={20} color={Colors.light.text} />
              <Text style={styles.settingText}>Sound Effects</Text>
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
              <Text style={styles.settingText}>Vibration</Text>
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
          <Text style={styles.sectionTitle}>App</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleResetOnboarding}>
            <View style={styles.settingInfo}>
              <LogOut size={20} color={Colors.light.error} />
              <Text style={[styles.settingText, { color: Colors.light.error }]}>
                Reset Onboarding
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>FocusFlow v1.0.0</Text>
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
            <Text style={styles.modalTitle}>Study Schedule</Text>
            <TouchableOpacity
              onPress={() => setShowTimeSlotModal(false)}
              style={styles.closeButton}
            >
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Set your available study times for each day of the week. The app will use these slots to automatically schedule your tasks and focus sessions.
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