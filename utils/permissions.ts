import { Platform } from "react-native";

// Import notifications conditionally to avoid Expo Go issues
let Notifications: any = null;
let Calendar: any = null;

if (Platform.OS !== "web") {
  try {
    // Only import if not in Expo Go environment
    if (!__DEV__ || process.env.EXPO_PUBLIC_USE_DEV_BUILD === "true") {
      Notifications = require("expo-notifications");
    }
    Calendar = require("expo-calendar");
  } catch (error) {
    console.log("Expo modules not available in this environment");
  }
}

interface CalendarItem {
  id: string;
  isPrimary?: boolean;
  title?: string;
  source?: {
    name: string;
  };
}

export async function requestNotificationPermissions() {
  if (Platform.OS === "web" || !Notifications) {
    return { granted: false };
  }
  
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return { granted: finalStatus === "granted" };
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    return { granted: false };
  }
}

export async function requestCalendarPermissions() {
  if (Platform.OS === "web" || !Calendar) {
    return { granted: false };
  }
  
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return { granted: status === "granted" };
  } catch (error) {
    console.error("Error requesting calendar permissions:", error);
    return { granted: false };
  }
}

export async function getCalendars(): Promise<CalendarItem[]> {
  if (Platform.OS === "web" || !Calendar) {
    return [];
  }
  
  try {
    const { granted } = await requestCalendarPermissions();
    if (!granted) {
      return [];
    }
    
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    return calendars;
  } catch (error) {
    console.error("Error getting calendars:", error);
    return [];
  }
}

export async function createCalendarEvent(
  title: string,
  startDate: Date,
  endDate: Date,
  calendarId?: string
) {
  if (Platform.OS === "web" || !Calendar) {
    return null;
  }
  
  try {
    const { granted } = await requestCalendarPermissions();
    if (!granted) {
      return null;
    }
    
    // If no calendar ID is provided, get the default calendar
    if (!calendarId) {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find((cal: CalendarItem) => cal.isPrimary) || calendars[0];
      if (!defaultCalendar) {
        return null;
      }
      calendarId = defaultCalendar.id;
    }
    
    const eventId = await Calendar.createEventAsync(calendarId, {
      title,
      startDate,
      endDate,
      alarms: [{ relativeOffset: -15 }], // 15 minutes before
    });
    
    return eventId;
  } catch (error) {
    console.error("Error creating calendar event:", error);
    return null;
  }
}