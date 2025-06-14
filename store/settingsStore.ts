import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DayTimeSlots } from "@/types/timeSlot";

export type CompanionType = "plant" | "animal" | "landscape";
export type CompanionTheme = "forest" | "ocean" | "space" | "desert";

interface SettingsState {
  hasCompletedOnboarding: boolean;
  username: string;
  notificationsEnabled: boolean;
  calendarSyncEnabled: boolean;
  usageAccessEnabled: boolean;
  defaultFocusDuration: number; // in minutes
  defaultBreakDuration: number; // in minutes
  companionType: CompanionType;
  companionTheme: CompanionTheme;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  darkMode: boolean;
  availableTimeSlots: DayTimeSlots;
  autoSchedulingEnabled: boolean;
  
  setHasCompletedOnboarding: (value: boolean) => void;
  setUsername: (value: string) => void;
  setNotificationsEnabled: (value: boolean) => void;
  setCalendarSyncEnabled: (value: boolean) => void;
  setUsageAccessEnabled: (value: boolean) => void;
  setDefaultFocusDuration: (value: number) => void;
  setDefaultBreakDuration: (value: number) => void;
  setCompanionType: (value: CompanionType) => void;
  setCompanionTheme: (value: CompanionTheme) => void;
  setSoundEnabled: (value: boolean) => void;
  setVibrationEnabled: (value: boolean) => void;
  setDarkMode: (value: boolean) => void;
  setAvailableTimeSlots: (value: DayTimeSlots) => void;
  setAutoSchedulingEnabled: (value: boolean) => void;
}

const defaultTimeSlots: DayTimeSlots = {
  monday: [
    { start: "09:00", end: "12:00" },
    { start: "14:00", end: "17:00" },
    { start: "19:00", end: "21:00" }
  ],
  tuesday: [
    { start: "09:00", end: "12:00" },
    { start: "14:00", end: "17:00" },
    { start: "19:00", end: "21:00" }
  ],
  wednesday: [
    { start: "09:00", end: "12:00" },
    { start: "14:00", end: "17:00" },
    { start: "19:00", end: "21:00" }
  ],
  thursday: [
    { start: "09:00", end: "12:00" },
    { start: "14:00", end: "17:00" },
    { start: "19:00", end: "21:00" }
  ],
  friday: [
    { start: "09:00", end: "12:00" },
    { start: "14:00", end: "17:00" },
    { start: "19:00", end: "21:00" }
  ],
  saturday: [
    { start: "10:00", end: "12:00" },
    { start: "14:00", end: "16:00" }
  ],
  sunday: [
    { start: "10:00", end: "12:00" },
    { start: "14:00", end: "16:00" }
  ]
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      username: "",
      notificationsEnabled: true,
      calendarSyncEnabled: false,
      usageAccessEnabled: false,
      defaultFocusDuration: 25,
      defaultBreakDuration: 5,
      companionType: "plant",
      companionTheme: "forest",
      soundEnabled: true,
      vibrationEnabled: true,
      darkMode: false,
      availableTimeSlots: defaultTimeSlots,
      autoSchedulingEnabled: true,
      
      setHasCompletedOnboarding: (value) => set({ hasCompletedOnboarding: value }),
      setUsername: (value) => set({ username: value }),
      setNotificationsEnabled: (value) => set({ notificationsEnabled: value }),
      setCalendarSyncEnabled: (value) => set({ calendarSyncEnabled: value }),
      setUsageAccessEnabled: (value) => set({ usageAccessEnabled: value }),
      setDefaultFocusDuration: (value) => set({ defaultFocusDuration: value }),
      setDefaultBreakDuration: (value) => set({ defaultBreakDuration: value }),
      setCompanionType: (value) => set({ companionType: value }),
      setCompanionTheme: (value) => set({ companionTheme: value }),
      setSoundEnabled: (value) => set({ soundEnabled: value }),
      setVibrationEnabled: (value) => set({ vibrationEnabled: value }),
      setDarkMode: (value) => set({ darkMode: value }),
      setAvailableTimeSlots: (value) => set({ availableTimeSlots: value }),
      setAutoSchedulingEnabled: (value) => set({ autoSchedulingEnabled: value }),
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);