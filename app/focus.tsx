import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Play, Pause, Square, RotateCcw, Settings } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import FocusTimer from "@/components/FocusTimer";
import CompanionView from "@/components/CompanionView";
import { useTimerStore } from "@/store/timerStore";
import { useTaskStore } from "@/store/taskStore";
import { useStatsStore } from "@/store/statsStore";
import { focusStyles as styles } from "@/styles/focus-styles";
import { getPhaseIcon, getPhaseLabel } from "@/utils/phaseUtils";
import { formatTimerDisplay, getTimerProgress } from "@/utils/focusUtils";
import { useTaskInfo } from "@/hooks/useTaskInfo";
import { useFocusSession } from "@/hooks/useFocusSession";

// Import Haptics for vibration with web compatibility
let Haptics: any = null;
if (Platform.OS !== 'web') {
  try {
    Haptics = require('expo-haptics');
  } catch (error) {
  }
}

export default function FocusScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ taskId?: string; duration?: string }>();
  const taskId = typeof params.taskId === 'string' ? params.taskId : undefined;
  
  const [showCompanion, setShowCompanion] = useState(true);
  const intervalRef = useRef<number | null>(null);
  
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

  // 使用 useTaskInfo hook 獲取任務信息
  const taskInfo = useTaskInfo({
    taskId,
    tasks,
    duration: params.duration
  });

  // 使用 useFocusSession hook
  const { handleSessionComplete } = useFocusSession({
    taskInfo,
    currentTime,
    targetTime,
    t
  });

  // 🆕 智能啟動 timer
  useEffect(() => {
    if (taskInfo && !isRunning && !currentTaskId) {
      
      try {
        startTimer(taskId!, taskInfo.suggestedDurationSeconds);
      } catch (error) {
        console.error("❌ Focus: Failed to start timer:", error);
        Alert.alert(
          t('errors.timerStartFailed'),
          t('errors.timerStartFailedMessage'),
          [
            { text: t('alerts.ok'), onPress: () => router.back() }
          ]
        );
      }
    }
  }, [taskInfo, isRunning, currentTaskId, taskId, startTimer]);

  // Timer tick effect
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = window.setInterval(() => {
          tick();
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
        intervalRef.current = null;
      }
    };
  }, [isRunning, isPaused, tick]);

  // 監聽 timer 完成
  useEffect(() => {
    if (isRunning && currentTime <= 0) {
      handleSessionComplete();
    }
  }, [isRunning, currentTime, handleSessionComplete]);

  const handleStart = () => {
    try {
      if (!taskInfo) {
        Alert.alert(t('errors.taskNotFound'), t('errors.taskNotFoundMessage'));
        return;
      }
      
      startTimer(taskId!, taskInfo.suggestedDurationSeconds);
    } catch (error) {
      console.error("❌ Focus: Start error:", error);
      Alert.alert(t('errors.startTimerFailed'), t('errors.startTimerFailedMessage'));
    }
  };

  const handlePause = () => {
    try {
      pauseTimer();
    } catch (error) {
      console.error("❌ Focus: Pause error:", error);
      Alert.alert(t('errors.pauseTimerFailed'), t('errors.pauseTimerFailedMessage'));
    }
  };

  const handleResume = () => {
    try {
      resumeTimer();
    } catch (error) {
      console.error("❌ Focus: Resume error:", error);
      Alert.alert(t('errors.resumeTimerFailed'), t('errors.resumeTimerFailedMessage'));
    }
  };

  const handleStop = () => {
    try {
    Alert.alert(
        t('focus.stopSession'),
        t('focus.stopSessionMessage'),
      [
          { text: t('alerts.cancel'), style: "cancel" },
        {
            text: t('focus.stopAndSave'),
          onPress: () => {
              
              // 🆕 計算實際學習時間並更新進度
              if (taskInfo?.isSubtask && taskInfo.mainTaskId && taskInfo.subtaskId) {
                const { updateSubtaskProgress } = useTaskStore.getState();
                const elapsedTime = targetTime - currentTime; // 秒
                const elapsedMinutes = Math.floor(elapsedTime / 60); // 分鐘
                
                if (elapsedMinutes > 0) {
                  try {
                    updateSubtaskProgress(
                      taskInfo.mainTaskId,
                      taskInfo.subtaskId,
                      elapsedMinutes,
                      `Partial session: ${elapsedMinutes}min on ${new Date().toLocaleDateString()}`
                    );
                    
                  } catch (progressError) {
                    console.error("❌ Focus: Failed to update partial progress:", progressError);
                  }
                }
              }
              
              stopTimer();
              router.back();
          },
        },
      ]
    );
    } catch (error) {
      console.error("❌ Focus: Stop error:", error);
      Alert.alert(t('errors.stopTimerFailed'), t('errors.stopTimerFailedMessage'));
    }
  };

  const handleReset = () => {
    try {
    Alert.alert(
        t('focus.resetTimer'),
        t('focus.resetTimerMessage'),
      [
          { text: t('alerts.cancel'), style: "cancel" },
        { 
            text: t('focus.reset'),
            style: "destructive",
          onPress: () => {
              resetTimer();
            },
        },
      ]
    );
    } catch (error) {
      console.error("❌ Focus: Reset error:", error);
      Alert.alert(t('errors.resetTimerFailed'), t('errors.resetTimerFailedMessage'));
    }
  };


  if (!taskInfo) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: t('focus.title') }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('focus.loadingTask')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: t('focus.title'),
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowCompanion(!showCompanion)} style={styles.settingsButton}>
              <Settings size={20} color={Colors.light.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <View style={styles.content}>
        {/* Task Info Section */}
          <View style={styles.taskInfo}>
          <View style={styles.taskHeader}>
            {taskInfo.phase && (
              <Text style={styles.phaseIcon}>{getPhaseIcon(taskInfo.phase)}</Text>
            )}
            <Text style={styles.taskTitle} numberOfLines={2}>
              {taskInfo.title}
              </Text>
          </View>
          
          {taskInfo.phase && (
            <Text style={styles.phaseLabel}>{getPhaseLabel(taskInfo.phase)}</Text>
          )}
          
          {taskInfo.description && (
            <Text style={styles.taskDescription} numberOfLines={3}>
              {taskInfo.description}
            </Text>
          )}

          {/* 🆕 子任務進度信息 */}
          {taskInfo.isSubtask && (
            <View style={styles.progressInfo}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>{t('focus.progress')}:</Text>
                <Text style={styles.progressValue}>{taskInfo.progressPercentage}%</Text>
              </View>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>{t('focus.timeSpent')}:</Text>
                <Text style={styles.progressValue}>{taskInfo.timeSpent}min</Text>
              </View>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>{t('focus.remaining')}:</Text>
                <Text style={styles.progressValue}>{taskInfo.remainingTime}min</Text>
              </View>
              {taskInfo.isSegmented && (
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>{t('focus.segment')}:</Text>
                  <Text style={styles.progressValue}>{taskInfo.segmentIndex}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Timer Section */}
        <View style={styles.timerSection}>
          <FocusTimer
            remainingTime={currentTime}
            totalTime={targetTime}
            isRunning={isRunning}
            isPaused={isPaused}
          />
          
          <Text style={styles.timeDisplay}>
            {formatTimerDisplay(currentTime)}
          </Text>
          
          <Text style={styles.timeLabel}>
            {isRunning 
              ? (isPaused ? t('focus.paused') : t('focus.focusTime'))
              : t('focus.readyToStart')
            }
          </Text>
        </View>

        {/* Controls Section */}
        <View style={styles.controls}>
          {!isRunning ? (
            <TouchableOpacity style={styles.primaryButton} onPress={handleStart}>
              <Play size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ) : isPaused ? (
            <TouchableOpacity style={styles.primaryButton} onPress={handleResume}>
              <Play size={24} color="#FFFFFF" />
          </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={handlePause}>
              <Pause size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.secondaryButton} onPress={handleStop}>
            <Square size={20} color={Colors.light.subtext} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleReset}>
            <RotateCcw size={20} color={Colors.light.subtext} />
          </TouchableOpacity>
        </View>

        {/* Companion View */}
        {showCompanion && (
          <View style={styles.companionSection}>
            <CompanionView
              isActive={isRunning}
              isPaused={isPaused}
              progress={getTimerProgress(currentTime, targetTime)}
              currentTask={taskInfo}
            />
          </View>
        )}
      </View>
    </View>
  );
}