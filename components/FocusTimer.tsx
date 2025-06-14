import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";

interface FocusTimerProps {
  remainingTime: number; // in seconds
  totalTime: number; // in seconds
  isRunning: boolean;
  isPaused: boolean;
}

export default function FocusTimer({ 
  remainingTime, 
  totalTime, 
  isRunning, 
  isPaused 
}: FocusTimerProps) {
  const progressAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const progress = totalTime > 0 ? (totalTime - remainingTime) / totalTime : 0;
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false, // Use JS driver for transform properties
    }).start();
  }, [remainingTime, totalTime]);

  const progressInterpolate = progressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.progressBackground}>
        <Animated.View style={[
          styles.progressFill,
          {
            transform: [{ rotate: progressInterpolate }],
          }
        ]} />
        <View style={styles.innerCircle}>
          <View style={styles.statusIndicator}>
            <View style={[
              styles.statusDot,
              {
                backgroundColor: isRunning && !isPaused 
                  ? Colors.light.success 
                  : isPaused 
                    ? Colors.light.warning 
                    : Colors.light.subtext
              }
            ]} />
            <Text style={styles.statusText}>
              {isRunning && !isPaused ? "Focus" : isPaused ? "Paused" : "Ready"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressBackground: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.light.card,
    borderWidth: 8,
    borderColor: Colors.light.border,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  progressFill: {
    position: "absolute",
    width: 100,
    height: 200,
    backgroundColor: Colors.light.primary,
    left: 100,
    top: 0,
    transformOrigin: "left center",
  },
  innerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  statusIndicator: {
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: Theme.spacing.xs,
  },
  statusText: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
  },
});