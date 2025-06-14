import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Play, Pause, Square, RotateCcw, Settings } from "lucide-react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import Button from "@/components/Button";
import FocusTimer from "@/components/FocusTimer";
import CompanionView from "@/components/CompanionView";
import { useTimerStore } from "@/store/timerStore";
import { useTaskStore } from "@/store/taskStore";
import { useStatsStore } from "@/store/statsStore";

// Import Haptics for vibration with web compatibility
let Haptics: any = null;
if (Platform.OS !== 'web') {
  try {
    Haptics = require('expo-haptics');
  } catch (error) {
    console.log('Haptics not available');
  }
}

export default function FocusScreen() {
  const params = useLocalSearchParams<{ taskId?: string; duration?: string }>();
  const taskId = typeof params.taskId === 'string' ? params.taskId : undefined;
  
  // Ensure duration is properly parsed as a number
  let duration = 25 * 60; // Default 25 minutes in seconds
  if (params.duration) {
    const durationParam = typeof params.duration === 'string' ? params.duration : params.duration[0];
    const parsedDuration = parseInt(durationParam, 10);
    if (!isNaN(parsedDuration) && parsedDuration > 0) {
      duration = parsedDuration;
    }
  }
  
  const [showCompanion, setShowCompanion] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    isRunning,
    isPaused,
    currentTime,
    targetTime,
    currentTaskId,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    tick,
    lastSession,
  } = useTimerStore();
  
  const { tasks } = useTaskStore();
  const { addSession } = useStatsStore();
  
  const currentTask = taskId ? tasks.find(t => t.id === taskId) : null;

  useEffect(() => {
    if (taskId && !isRunning && !currentTaskId) {
      // Auto-start timer when entering focus mode with a task
      try {
        startTimer(taskId, duration);
      } catch (error) {
        console.error("Failed to start timer:", error);
        Alert.alert("Error", "Failed to start focus session. Please try again.");
      }
    }
  }, [taskId, duration, isRunning, currentTaskId, startTimer]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        try {
          tick();
        } catch (error) {
          console.error("Timer tick error:", error);
          // Stop the interval if there's an error
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, tick]);

  useEffect(() => {
    // Check if session was just completed
    if (lastSession && currentTime === 0 && !isRunning) {
      handleSessionComplete();
    }
  }, [lastSession, currentTime, isRunning]);

  const handleSessionComplete = () => {
    try {
      // Vibrate on completion (mobile only)
      if (Platform.OS !== 'web' && Haptics) {
        try {
          Haptics.selectionAsync();
        } catch (error) {
          console.log('Haptics not available');
        }
      }
      
      // Add session to stats
      addSession(targetTime);
      
      // Show completion alert and navigate to feedback
      Alert.alert(
        "Session Complete!",
        "Great job! Would you like to record what you learned?",
        [
          {
            text: "Skip",
            style: "cancel",
            onPress: () => router.back(),
          },
          {
            text: "Record Learning",
            onPress: () => router.push("/learning-feedback"),
          },
        ]
      );
    } catch (error) {
      console.error("Session complete error:", error);
      // Still navigate back even if there's an error
      router.back();
    }
  };

  const handleStart = () => {
    try {
      if (!taskId) {
        Alert.alert("No Task Selected", "Please select a task to focus on.");
        return;
      }
      
      if (isPaused) {
        resumeTimer();
      } else {
        startTimer(taskId, duration);
      }
    } catch (error) {
      console.error("Start timer error:", error);
      Alert.alert("Error", "Failed to start focus session. Please try again.");
    }
  };

  const handlePause = () => {
    try {
      pauseTimer();
    } catch (error) {
      console.error("Pause timer error:", error);
      Alert.alert("Error", "Failed to pause timer.");
    }
  };

  const handleStop = () => {
    Alert.alert(
      "Stop Session",
      "Are you sure you want to stop this focus session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop",
          style: "destructive",
          onPress: () => {
            try {
              stopTimer();
              if (currentTime > 60) { // Only show feedback if session was longer than 1 minute
                Alert.alert(
                  "Session Stopped",
                  "Would you like to record what you accomplished?",
                  [
                    {
                      text: "Skip",
                      style: "cancel",
                      onPress: () => router.back(),
                    },
                    {
                      text: "Record Progress",
                      onPress: () => router.push("/learning-feedback"),
                    },
                  ]
                );
              } else {
                router.back();
              }
            } catch (error) {
              console.error("Stop timer error:", error);
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Timer",
      "Are you sure you want to reset the timer?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          onPress: () => {
            try {
              resetTimer();
            } catch (error) {
              console.error("Reset timer error:", error);
              Alert.alert("Error", "Failed to reset timer.");
            }
          }
        },
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = targetTime > 0 ? (targetTime - currentTime) / targetTime : 0;
  const remainingTime = Math.max(0, currentTime);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Focus Session",
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowCompanion(!showCompanion)}>
              <Settings size={20} color={Colors.light.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <View style={styles.content}>
        {/* Task Info */}
        {currentTask && (
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{currentTask.title}</Text>
            {currentTask.description && (
              <Text style={styles.taskDescription} numberOfLines={2}>
                {currentTask.description}
              </Text>
            )}
          </View>
        )}

        {/* Timer Display */}
        <View style={styles.timerContainer}>
          <FocusTimer
            remainingTime={remainingTime}
            totalTime={targetTime}
            isRunning={isRunning}
            isPaused={isPaused}
          />
          
          <Text style={styles.timeText}>
            {formatTime(remainingTime)}
          </Text>
          
          <Text style={styles.progressText}>
            {Math.round(progress * 100)}% Complete
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, styles.secondaryButton]}
            onPress={handleReset}
            disabled={!isRunning && currentTime === 0}
          >
            <RotateCcw size={24} color={Colors.light.subtext} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.primaryButton]}
            onPress={isRunning && !isPaused ? handlePause : handleStart}
          >
            {isRunning && !isPaused ? (
              <Pause size={32} color="#FFFFFF" />
            ) : (
              <Play size={32} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.secondaryButton]}
            onPress={handleStop}
            disabled={!isRunning && currentTime === 0}
          >
            <Square size={24} color={Colors.light.subtext} />
          </TouchableOpacity>
        </View>

        {/* Companion View */}
        {showCompanion && (
          <View style={styles.companionContainer}>
            <CompanionView
              isActive={isRunning}
              isPaused={isPaused}
              progress={progress}
              currentTask={currentTask}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    padding: Theme.spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  taskInfo: {
    alignItems: "center",
    marginBottom: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
  },
  taskTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.light.text,
    textAlign: "center",
    marginBottom: Theme.spacing.xs,
  },
  taskDescription: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
    textAlign: "center",
    lineHeight: 22,
  },
  timerContainer: {
    alignItems: "center",
    marginBottom: Theme.spacing.xl,
  },
  timeText: {
    fontSize: 48,
    fontWeight: "300",
    color: Colors.light.text,
    marginTop: Theme.spacing.lg,
    fontVariant: ["tabular-nums"],
  },
  progressText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
    marginTop: Theme.spacing.sm,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: Colors.light.primary,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  secondaryButton: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  companionContainer: {
    width: "100%",
    maxWidth: 400,
  },
});