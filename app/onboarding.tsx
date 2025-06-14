import React, { useState, useRef } from "react";
import { 
  StyleSheet, 
  View, 
  FlatList, 
  useWindowDimensions, 
  Platform,
  TextInput,
  Text,
  Alert
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import OnboardingStep from "@/components/OnboardingStep";
import TimeSlotPicker from "@/components/TimeSlotPicker";
import { useSettingsStore } from "@/store/settingsStore";
import { requestNotificationPermissions, requestCalendarPermissions } from "@/utils/permissions";
import { DayTimeSlots } from "@/types/timeSlot";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import Button from "@/components/Button";

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const { 
    setHasCompletedOnboarding, 
    setUsername: setStoredUsername,
    setNotificationsEnabled, 
    setCalendarSyncEnabled,
    setUsageAccessEnabled,
    availableTimeSlots,
    setAvailableTimeSlots,
    setAutoSchedulingEnabled 
  } = useSettingsStore();
  
  const onboardingSteps = [
    {
      title: "Welcome to FocusFlow",
      description: "Your AI-powered productivity assistant that transforms vague tasks into clear, actionable subtasks. Get personalized time estimates, smart scheduling, and comprehensive learning plans tailored to your goals.",
      imageUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=600&auto=format&fit=crop",
      primaryButtonText: "Get Started",
      secondaryButtonText: "Skip Tour",
    },
    {
      title: "Create Your Account",
      description: "Set up your account to personalize your experience and sync your data across devices securely. Your learning preferences and progress will be saved.",
      imageUrl: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?q=80&w=600&auto=format&fit=crop",
      primaryButtonText: "Continue",
      secondaryButtonText: "Skip",
      isRegistration: true,
    },
    {
      title: "Set Your Weekly Schedule",
      description: "Configure your available time slots for each day. Our AI will use this to automatically schedule your tasks at optimal times, considering your energy levels and task complexity.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=600&auto=format&fit=crop",
      primaryButtonText: "Continue",
      secondaryButtonText: "Use Default Schedule",
      isTimeSlotPicker: true,
    },
    {
      title: "Enable Smart Notifications",
      description: "Get intelligent reminders for upcoming tasks, focus sessions, and break times. We'll send you notifications at the right moments to keep you on track with your learning goals.",
      imageUrl: "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?q=80&w=600&auto=format&fit=crop",
      primaryButtonText: "Enable Notifications",
      secondaryButtonText: "Skip for Now",
    },
    {
      title: "Calendar Integration",
      description: "Connect your calendar to analyze your free time and avoid scheduling conflicts. This helps our AI find the perfect time slots for your tasks and learning sessions.",
      imageUrl: "https://images.unsplash.com/photo-1506784365847-bbad939e9335?q=80&w=600&auto=format&fit=crop",
      primaryButtonText: "Connect Calendar",
      secondaryButtonText: "Skip for Now",
    },
    {
      title: "Focus Time Tracking",
      description: Platform.OS === "android" 
        ? "Enable usage access to automatically track your focus time and identify distractions. Your data stays private and secure on your device. This helps improve time estimates."
        : "Set up focus tracking to monitor your productivity and improve time estimates. Due to iOS limitations, we'll guide you through manual tracking or Shortcuts integration.",
      imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop",
      primaryButtonText: Platform.OS === "android" ? "Enable Usage Access" : "Set Up Tracking",
      secondaryButtonText: "Skip for Now",
    },
    {
      title: "You're All Set!",
      description: "Your personalized productivity workspace is ready. Start by creating your first task and let our AI break it down into clear, actionable subtasks with accurate time estimates.",
      imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop",
      primaryButtonText: "Start Using FocusFlow",
      secondaryButtonText: "",
    },
  ];
  
  const handleNext = () => {
    if (currentIndex < onboardingSteps.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  };
  
  const handleSkip = () => {
    if (currentIndex === 1) {
      // Skip registration
      handleNext();
    } else if (currentIndex === 2) {
      // Use default time slots
      handleNext();
    } else {
      completeOnboarding();
    }
  };
  
  const handleRegistration = () => {
    if (!username.trim()) {
      Alert.alert("Error", "Please enter a username");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Error", "Please enter a password");
      return;
    }
    
    setStoredUsername(username.trim());
    handleNext();
  };
  
  const handleNotificationPermission = async () => {
    const { granted } = await requestNotificationPermissions();
    setNotificationsEnabled(granted);
    
    if (granted) {
      Alert.alert(
        "Notifications Enabled",
        "Great! You'll receive smart reminders for your tasks, focus sessions, and learning milestones.",
        [{ text: "Continue", onPress: handleNext }]
      );
    } else {
      Alert.alert(
        "Notifications Disabled",
        "You can enable notifications later in settings to get task reminders and learning progress updates.",
        [{ text: "Continue", onPress: handleNext }]
      );
    }
  };
  
  const handleCalendarPermission = async () => {
    const { granted } = await requestCalendarPermissions();
    setCalendarSyncEnabled(granted);
    
    if (granted) {
      Alert.alert(
        "Calendar Connected",
        "Perfect! We can now analyze your calendar to find the best times for your tasks and avoid conflicts with existing events.",
        [{ text: "Continue", onPress: handleNext }]
      );
    } else {
      Alert.alert(
        "Calendar Not Connected",
        "You can connect your calendar later in settings for better scheduling and conflict detection.",
        [{ text: "Continue", onPress: handleNext }]
      );
    }
  };
  
  const handleUsageAccess = () => {
    if (Platform.OS === "android") {
      Alert.alert(
        "Enable Usage Access",
        "To automatically track your focus time and improve our time estimates, please enable Usage Access:\n\n1. Go to Settings > Apps > Special app access > Usage access\n2. Find FocusFlow and toggle it on\n3. Return to the app\n\nYour data is kept private and secure on your device.",
        [
          { text: "Skip for Now", onPress: handleNext },
          { text: "Open Settings", onPress: () => {
            setUsageAccessEnabled(true);
            handleNext();
          }}
        ]
      );
    } else {
      Alert.alert(
        "Set Up Focus Tracking",
        "Due to iOS limitations, we'll help you set up focus tracking:\n\n• Use Shortcuts app for automatic logging\n• Enable manual focus session tracking\n• Integrate with Screen Time (limited)\n\nWe'll guide you through the setup in the app.",
        [
          { text: "Skip for Now", onPress: handleNext },
          { text: "Continue", onPress: handleNext }
        ]
      );
    }
  };
  
  const handleTimeSlotsChange = (newTimeSlots: DayTimeSlots) => {
    setAvailableTimeSlots(newTimeSlots);
  };
  
  const completeOnboarding = () => {
    // Enable auto-scheduling by default after onboarding
    setAutoSchedulingEnabled(true);
    setHasCompletedOnboarding(true);
    router.replace("/(tabs)");
  };
  
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (item.isRegistration) {
      return (
        <View style={[styles.registrationContainer, { width }]}>
          <OnboardingStep
            title={item.title}
            description={item.description}
            imageUrl={item.imageUrl}
            primaryButtonText=""
            secondaryButtonText=""
            onPrimaryButtonPress={() => {}}
            onSecondaryButtonPress={() => {}}
            hideButtons={true}
          />
          
          <View style={styles.registrationForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                placeholderTextColor={Colors.light.subtext}
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={Colors.light.subtext}
                secureTextEntry
              />
            </View>
            
            <View style={styles.buttonRow}>
              <Button
                title="Skip"
                onPress={handleSkip}
                variant="outline"
                size="medium"
                style={styles.skipButton}
              />
              <Button
                title="Continue"
                onPress={handleRegistration}
                variant="primary"
                size="medium"
                style={styles.continueButton}
              />
            </View>
          </View>
        </View>
      );
    }
    
    if (item.isTimeSlotPicker) {
      return (
        <View style={[styles.timeSlotPickerContainer, { width }]}>
          <View style={styles.timeSlotHeader}>
            <Text style={styles.timeSlotTitle}>{item.title}</Text>
            <Text style={styles.timeSlotDescription}>{item.description}</Text>
          </View>
          
          <TimeSlotPicker
            timeSlots={availableTimeSlots}
            onTimeSlotsChange={handleTimeSlotsChange}
          />
          
          <View style={styles.timeSlotButtons}>
            <View style={styles.buttonRow}>
              <Button
                title={item.secondaryButtonText}
                onPress={handleSkip}
                variant="outline"
                size="medium"
                style={styles.skipButton}
              />
              <Button
                title={item.primaryButtonText}
                onPress={handleNext}
                variant="primary"
                size="medium"
                style={styles.continueButton}
              />
            </View>
          </View>
        </View>
      );
    }
    
    let primaryAction = handleNext;
    
    if (index === 3) {
      primaryAction = handleNotificationPermission;
    } else if (index === 4) {
      primaryAction = handleCalendarPermission;
    } else if (index === 5) {
      primaryAction = handleUsageAccess;
    } else if (index === onboardingSteps.length - 1) {
      primaryAction = completeOnboarding;
    }
    
    return (
      <OnboardingStep
        title={item.title}
        description={item.description}
        imageUrl={item.imageUrl}
        primaryButtonText={item.primaryButtonText}
        secondaryButtonText={item.secondaryButtonText}
        onPrimaryButtonPress={primaryAction}
        onSecondaryButtonPress={handleSkip}
      />
    );
  };
  
  const onScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / width);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };
  
  return (
    <View style={styles.container}>
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
      
      <FlatList
        ref={flatListRef}
        data={onboardingSteps}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, index) => index.toString()}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />
      
      <View style={styles.paginationContainer}>
        {onboardingSteps.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  registrationContainer: {
    flex: 1,
    paddingBottom: 100,
  },
  registrationForm: {
    padding: Theme.spacing.lg,
    paddingTop: 0,
  },
  inputGroup: {
    marginBottom: Theme.spacing.md,
  },
  inputLabel: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.lg,
  },
  skipButton: {
    flex: 1,
  },
  continueButton: {
    flex: 1,
  },
  timeSlotPickerContainer: {
    flex: 1,
    padding: 20,
    paddingBottom: 120,
  },
  timeSlotHeader: {
    marginBottom: Theme.spacing.xl,
  },
  timeSlotTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.light.text,
    textAlign: "center",
    marginBottom: Theme.spacing.sm,
  },
  timeSlotDescription: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: Theme.spacing.md,
  },
  timeSlotButtons: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "#FFFFFF",
    paddingTop: 20,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 40,
    width: "100%",
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: "#5B7FFF",
    width: 16,
  },
});