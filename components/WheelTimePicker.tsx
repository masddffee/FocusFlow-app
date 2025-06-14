import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { Check, X } from "lucide-react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";

interface WheelTimePickerProps {
  visible: boolean;
  initialTime?: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
  title?: string;
}

const { height: screenHeight } = Dimensions.get("window");
const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export default function WheelTimePicker({
  visible,
  initialTime = "09:00",
  onConfirm,
  onCancel,
  title = "Select Time",
}: WheelTimePickerProps) {
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  // Generate arrays for hours (0-23) and minutes (0-59, step 5)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10, ..., 55

  useEffect(() => {
    if (visible && initialTime) {
      const [hour, minute] = initialTime.split(":").map(Number);
      setSelectedHour(hour);
      setSelectedMinute(Math.round(minute / 5) * 5); // Round to nearest 5
      
      // Scroll to initial positions after a short delay
      setTimeout(() => {
        hourScrollRef.current?.scrollTo({
          y: hour * ITEM_HEIGHT,
          animated: false,
        });
        minuteScrollRef.current?.scrollTo({
          y: (minute / 5) * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
    }
  }, [visible, initialTime]);

  const handleHourScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    setSelectedHour(Math.max(0, Math.min(23, index)));
  };

  const handleMinuteScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    setSelectedMinute(Math.max(0, Math.min(55, index * 5)));
  };

  const handleConfirm = () => {
    const formattedTime = `${selectedHour.toString().padStart(2, "0")}:${selectedMinute.toString().padStart(2, "0")}`;
    onConfirm(formattedTime);
  };

  const renderPickerItem = (value: number, isSelected: boolean, type: "hour" | "minute") => {
    const displayValue = type === "hour" 
      ? value.toString().padStart(2, "0")
      : value.toString().padStart(2, "0");
    
    return (
      <View key={value} style={[styles.pickerItem, isSelected && styles.selectedPickerItem]}>
        <Text style={[styles.pickerItemText, isSelected && styles.selectedPickerItemText]}>
          {displayValue}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
              <X size={24} color={Colors.light.subtext} />
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
              <Check size={24} color={Colors.light.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Hour</Text>
              <View style={styles.pickerWrapper}>
                <View style={styles.selectionIndicator} />
                <ScrollView
                  ref={hourScrollRef}
                  style={styles.picker}
                  contentContainerStyle={styles.pickerContent}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onMomentumScrollEnd={handleHourScroll}
                  contentOffset={{ x: 0, y: selectedHour * ITEM_HEIGHT }}
                >
                  {/* Padding items for proper centering */}
                  <View style={{ height: ITEM_HEIGHT * 2 }} />
                  {hours.map((hour) => renderPickerItem(hour, hour === selectedHour, "hour"))}
                  <View style={{ height: ITEM_HEIGHT * 2 }} />
                </ScrollView>
              </View>
            </View>

            <Text style={styles.timeSeparator}>:</Text>

            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Minute</Text>
              <View style={styles.pickerWrapper}>
                <View style={styles.selectionIndicator} />
                <ScrollView
                  ref={minuteScrollRef}
                  style={styles.picker}
                  contentContainerStyle={styles.pickerContent}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onMomentumScrollEnd={handleMinuteScroll}
                  contentOffset={{ x: 0, y: (selectedMinute / 5) * ITEM_HEIGHT }}
                >
                  {/* Padding items for proper centering */}
                  <View style={{ height: ITEM_HEIGHT * 2 }} />
                  {minutes.map((minute) => renderPickerItem(minute, minute === selectedMinute, "minute"))}
                  <View style={{ height: ITEM_HEIGHT * 2 }} />
                </ScrollView>
              </View>
            </View>
          </View>

          <View style={styles.selectedTimeContainer}>
            <Text style={styles.selectedTimeLabel}>Selected Time</Text>
            <Text style={styles.selectedTime}>
              {selectedHour.toString().padStart(2, "0")}:{selectedMinute.toString().padStart(2, "0")}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: Theme.radius.xl,
    width: "85%",
    maxWidth: 320,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  cancelButton: {
    padding: 4,
  },
  title: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
  },
  confirmButton: {
    padding: 4,
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Theme.spacing.lg,
  },
  pickerColumn: {
    alignItems: "center",
  },
  pickerLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "500",
    color: Colors.light.subtext,
    marginBottom: Theme.spacing.sm,
  },
  pickerWrapper: {
    position: "relative",
    height: PICKER_HEIGHT,
    width: 80,
  },
  selectionIndicator: {
    position: "absolute",
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: Colors.light.primary + "15",
    borderRadius: Theme.radius.md,
    borderWidth: 2,
    borderColor: Colors.light.primary + "30",
    zIndex: 1,
  },
  picker: {
    height: PICKER_HEIGHT,
  },
  pickerContent: {
    alignItems: "center",
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
  },
  selectedPickerItem: {
    // Visual feedback is handled by selectionIndicator
  },
  pickerItemText: {
    fontSize: Theme.typography.sizes.lg,
    color: Colors.light.subtext,
    fontWeight: "400",
  },
  selectedPickerItemText: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
  timeSeparator: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: "600",
    color: Colors.light.primary,
    marginHorizontal: Theme.spacing.md,
    marginTop: 20, // Align with picker items
  },
  selectedTimeContainer: {
    alignItems: "center",
    padding: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  selectedTimeLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    marginBottom: 4,
  },
  selectedTime: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: "600",
    color: Colors.light.primary,
  },
});