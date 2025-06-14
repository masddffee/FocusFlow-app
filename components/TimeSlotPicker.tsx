import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { Plus, Trash2, Clock, Copy } from "lucide-react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import { TimeSlot, DayTimeSlots, DayOfWeek } from "@/types/timeSlot";

interface TimeSlotPickerProps {
  timeSlots: DayTimeSlots;
  onTimeSlotsChange: (timeSlots: DayTimeSlots) => void;
}

const dayNames: { key: DayOfWeek; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export default function TimeSlotPicker({ timeSlots, onTimeSlotsChange }: TimeSlotPickerProps) {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>("monday");
  const [newSlotStart, setNewSlotStart] = useState("");
  const [newSlotEnd, setNewSlotEnd] = useState("");

  const validateTimeFormat = (time: string) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const addTimeSlot = () => {
    if (!validateTimeFormat(newSlotStart) || !validateTimeFormat(newSlotEnd)) {
      Alert.alert("Invalid Time", "Please enter time in HH:MM format (e.g., 09:00)");
      return;
    }

    const startMinutes = timeToMinutes(newSlotStart);
    const endMinutes = timeToMinutes(newSlotEnd);

    if (startMinutes >= endMinutes) {
      Alert.alert("Invalid Time Range", "End time must be after start time");
      return;
    }

    const newSlot: TimeSlot = {
      start: newSlotStart,
      end: newSlotEnd,
    };

    // Check for overlaps
    const daySlots = timeSlots[selectedDay];
    const hasOverlap = daySlots.some((slot: TimeSlot) => {
      const slotStart = timeToMinutes(slot.start);
      const slotEnd = timeToMinutes(slot.end);
      return (
        (startMinutes >= slotStart && startMinutes < slotEnd) ||
        (endMinutes > slotStart && endMinutes <= slotEnd) ||
        (startMinutes <= slotStart && endMinutes >= slotEnd)
      );
    });

    if (hasOverlap) {
      Alert.alert("Time Conflict", "This time slot overlaps with an existing one");
      return;
    }

    const updatedTimeSlots = {
      ...timeSlots,
      [selectedDay]: [...daySlots, newSlot].sort((a, b) => 
        timeToMinutes(a.start) - timeToMinutes(b.start)
      ),
    };

    onTimeSlotsChange(updatedTimeSlots);
    setNewSlotStart("");
    setNewSlotEnd("");
  };

  const removeTimeSlot = (index: number) => {
    const updatedTimeSlots = {
      ...timeSlots,
      [selectedDay]: timeSlots[selectedDay].filter((_, i) => i !== index),
    };
    onTimeSlotsChange(updatedTimeSlots);
  };

  const copyToAllDays = () => {
    const currentDaySlots = timeSlots[selectedDay];
    const updatedTimeSlots = { ...timeSlots };
    
    dayNames.forEach(({ key }) => {
      updatedTimeSlots[key] = [...currentDaySlots];
    });
    
    onTimeSlotsChange(updatedTimeSlots);
    Alert.alert("Success", "Time slots copied to all days");
  };

  const getTotalHours = () => {
    let totalMinutes = 0;
    Object.values(timeSlots).forEach((daySlots: TimeSlot[]) => {
      daySlots.forEach((slot: TimeSlot) => {
        const start = timeToMinutes(slot.start);
        const end = timeToMinutes(slot.end);
        totalMinutes += (end - start);
      });
    });
    return Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal place
  };

  return (
    <View style={styles.container}>
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          Total weekly availability: {getTotalHours()} hours
        </Text>
      </View>

      {/* Day Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
        {dayNames.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.dayButton,
              selectedDay === key && styles.selectedDayButton,
            ]}
            onPress={() => setSelectedDay(key)}
          >
            <Text
              style={[
                styles.dayButtonText,
                selectedDay === key && styles.selectedDayButtonText,
              ]}
            >
              {label.slice(0, 3)}
            </Text>
            <Text
              style={[
                styles.daySlotCount,
                selectedDay === key && styles.selectedDaySlotCount,
              ]}
            >
              {timeSlots[key].length}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Current Day Time Slots */}
      <View style={styles.timeSlotsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {dayNames.find(d => d.key === selectedDay)?.label}
          </Text>
          <TouchableOpacity onPress={copyToAllDays} style={styles.copyButton}>
            <Copy size={16} color={Colors.light.primary} />
            <Text style={styles.copyButtonText}>Copy to All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.slotsScrollView}>
          {timeSlots[selectedDay].map((slot: TimeSlot, index: number) => (
            <View key={index} style={styles.timeSlotItem}>
              <View style={styles.timeSlotInfo}>
                <Clock size={16} color={Colors.light.primary} />
                <Text style={styles.timeSlotText}>
                  {slot.start} - {slot.end}
                </Text>
                <Text style={styles.timeSlotDuration}>
                  ({Math.round((timeToMinutes(slot.end) - timeToMinutes(slot.start)) / 60 * 10) / 10}h)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => removeTimeSlot(index)}
                style={styles.removeButton}
              >
                <Trash2 size={16} color={Colors.light.error} />
              </TouchableOpacity>
            </View>
          ))}

          {timeSlots[selectedDay].length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No time slots set for {dayNames.find(d => d.key === selectedDay)?.label}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Add your available study times below
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Add New Time Slot */}
        <View style={styles.addSlotContainer}>
          <View style={styles.timeInputContainer}>
            <TextInput
              style={styles.timeInput}
              value={newSlotStart}
              onChangeText={setNewSlotStart}
              placeholder="09:00"
              placeholderTextColor={Colors.light.subtext}
            />
            <Text style={styles.timeSeparator}>-</Text>
            <TextInput
              style={styles.timeInput}
              value={newSlotEnd}
              onChangeText={setNewSlotEnd}
              placeholder="12:00"
              placeholderTextColor={Colors.light.subtext}
            />
          </View>
          <TouchableOpacity onPress={addTimeSlot} style={styles.addButton}>
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryContainer: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    alignItems: "center",
  },
  summaryText: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.primary,
  },
  daySelector: {
    marginBottom: Theme.spacing.lg,
  },
  dayButton: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    marginHorizontal: 4,
    borderRadius: Theme.radius.md,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center",
    minWidth: 60,
  },
  selectedDayButton: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  dayButtonText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    fontWeight: "500",
  },
  selectedDayButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  daySlotCount: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.subtext,
    marginTop: 2,
  },
  selectedDaySlotCount: {
    color: "#FFFFFF",
  },
  timeSlotsContainer: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: Theme.spacing.sm,
    borderRadius: Theme.radius.sm,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  copyButtonText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.primary,
    fontWeight: "500",
    marginLeft: 4,
  },
  slotsScrollView: {
    flex: 1,
    maxHeight: 200,
  },
  timeSlotItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  timeSlotInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  timeSlotText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    marginLeft: Theme.spacing.sm,
    fontWeight: "500",
  },
  timeSlotDuration: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    marginLeft: Theme.spacing.sm,
  },
  removeButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    padding: Theme.spacing.xl,
  },
  emptyStateText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    textAlign: "center",
    marginTop: 4,
  },
  addSlotContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Theme.spacing.md,
  },
  timeInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
  },
  timeInput: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    textAlign: "center",
  },
  timeSeparator: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
    marginHorizontal: Theme.spacing.sm,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: Theme.spacing.sm,
  },
});