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
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import FocusTimer from "@/components/FocusTimer";
import CompanionView from "@/components/CompanionView";
import { useTimerStore } from "@/store/timerStore";
import { useTaskStore } from "@/store/taskStore";
import { useStatsStore } from "@/store/statsStore";
import { getSubtaskRemainingTime, getSubtaskTotalDuration } from "@/utils/subtaskProgress";

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
  const [taskInfo, setTaskInfo] = useState<any>(null);
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
  
  const { tasks, getSubtaskRemainingTime: getSubtaskRemainingTimeFromStore } = useTaskStore();
  const { addSession } = useStatsStore();
  
  // 🆕 智能獲取任務信息和計算正確的時長
  const calculateTaskInfo = React.useCallback(() => {
    if (!taskId) return null;
    
    
    // 檢查是否為子任務（包含下劃線）
    if (taskId.includes('_')) {
      // 解析子任務 ID
      const parts = taskId.split('_');
      let mainTaskId: string;
      let subtaskId: string;
      let isSegmented = false;
      let segmentIndex: string | null = null;
      
      // 🔧 智能解析子任務 ID 格式
      if (parts.length === 2) {
        // 簡單格式: mainTaskId_subtaskId
        [mainTaskId, subtaskId] = parts;
      } else if (parts.includes('segment')) {
        // 分段格式: mainTaskId_subtaskId_segment_index
        const segmentPos = parts.indexOf('segment');
        mainTaskId = parts[0];
        subtaskId = parts.slice(1, segmentPos).join('_');
        isSegmented = true;
        segmentIndex = parts[segmentPos + 1];
      } else {
        // 複雜格式: 取第一個作為主任務ID，其餘組合為子任務ID
        mainTaskId = parts[0];
        subtaskId = parts.slice(1).join('_');
      }
      
      
      const mainTask = tasks.find(t => t.id === mainTaskId);
      if (!mainTask || !mainTask.subtasks) {
        console.warn(`⚠️ Focus: Main task or subtasks not found for ${mainTaskId}`);
        return null;
      }
      
      const subtask = mainTask.subtasks.find(s => s.id === subtaskId);
      if (!subtask) {
        console.warn(`⚠️ Focus: Subtask not found: ${subtaskId}`);
        console.warn('Available subtasks:', mainTask.subtasks.map(s => s.id));
        return null;
      }
      
      // 🆕 計算準確的剩餘時間和總時長
      const totalDuration = getSubtaskTotalDuration(subtask); // 分鐘
      const remainingTime = getSubtaskRemainingTime(subtask); // 分鐘
      const timeSpent = subtask.timeSpent || 0; // 分鐘
      const progressPercentage = totalDuration > 0 ? Math.min(100, Math.round((timeSpent / totalDuration) * 100)) : 0;
      
      // 🆕 計算本次學習建議時長
      let suggestedDuration = remainingTime;
      
      // 如果有 URL 參數指定時長，使用較小值
      if (params.duration) {
        const urlDuration = parseInt(params.duration, 10);
        if (!isNaN(urlDuration) && urlDuration > 0) {
          suggestedDuration = Math.min(remainingTime, Math.floor(urlDuration / 60)); // 轉換秒到分鐘
        }
      }
      
      // 如果沒有剩餘時間，但允許額外學習
      if (remainingTime <= 0) {
        suggestedDuration = 25; // 預設 25 分鐘額外學習
      } else {
      }
      
      const subtaskTitle = subtask.title || subtask.text?.substring(0, 50) || `子任務 ${subtask.order || ''}`;
      let displayTitle = `${mainTask.title}: ${subtaskTitle}`;
      
      if (isSegmented && segmentIndex) {
        displayTitle += ` (${t('common.part')} ${segmentIndex})`;
      }
      
      return {
        id: taskId,
        title: displayTitle,
        description: subtask.text || subtask.title,
        isSubtask: true,
        isSegmented,
        segmentIndex,
        mainTaskId,
        subtaskId,
        mainTaskTitle: mainTask.title,
        subtaskTitle,
        phase: subtask.phase,
        difficulty: subtask.difficulty,
        totalDuration, // 分鐘
        remainingTime, // 分鐘
        timeSpent, // 分鐘
        progressPercentage,
        suggestedDuration, // 分鐘
        // 用於 timer 的秒數
        suggestedDurationSeconds: suggestedDuration * 60,
        completed: subtask.completed || false,
        lastSessionTime: subtask.lastSessionTime || 0,
        sessionHistory: subtask.sessionHistory || [],
      };
    } else {
      // 一般任務
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.warn(`⚠️ Focus: Task not found: ${taskId}`);
        return null;
      }
      
      // 計算任務建議時長
      let suggestedDuration = task.duration || 25; // 預設分鐘
      
      if (params.duration) {
        const urlDuration = parseInt(params.duration, 10);
        if (!isNaN(urlDuration) && urlDuration > 0) {
          suggestedDuration = Math.floor(urlDuration / 60); // 轉換秒到分鐘
        }
      }
      
      
      return {
        ...task,
        isSubtask: false,
        suggestedDuration, // 分鐘
        suggestedDurationSeconds: suggestedDuration * 60,
        totalDuration: suggestedDuration,
        remainingTime: suggestedDuration,
        timeSpent: 0,
        progressPercentage: 0,
      };
    }
  }, [taskId, tasks, params.duration, t]);

  // 🆕 初始化任務信息
  useEffect(() => {
    const info = calculateTaskInfo();
    setTaskInfo(info);
    
    if (info) {
    }
  }, [calculateTaskInfo]);

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

  // 🆕 Session 完成處理 - 包含子任務進度更新
  const handleSessionComplete = React.useCallback(() => {
    try {
      console.log(`🎉 Focus: Session completed for ${taskInfo?.isSubtask ? 'subtask' : 'task'}: ${taskInfo?.title}`);
      
      // Vibrate on completion (mobile only)
      if (Platform.OS !== 'web' && Haptics) {
        try {
          Haptics.selectionAsync();
        } catch (error) {
              }
      }
      
      // Add session to stats
      addSession(targetTime);
      
      // 🆕 更新子任務進度
      if (taskInfo?.isSubtask && taskInfo.mainTaskId && taskInfo.subtaskId) {
        const { updateSubtaskProgress } = useTaskStore.getState();
        const actualMinutes = Math.floor(targetTime / 60); // 轉換為分鐘
        
        try {
          updateSubtaskProgress(
            taskInfo.mainTaskId,
            taskInfo.subtaskId,
            actualMinutes,
            `Focus session completed: ${actualMinutes}min on ${new Date().toLocaleDateString()}`
          );
          
        } catch (progressError) {
          console.error("❌ Focus: Failed to update subtask progress:", progressError);
        }
      }
      
      // Show completion alert and navigate to feedback
      Alert.alert(
        t('focus.sessionComplete'),
        t('focus.sessionCompleteMessage'),
        [
          {
            text: t('focus.skipFeedback'),
            style: "cancel",
            onPress: () => router.back(),
          },
          {
            text: t('focus.recordLearning'),
            onPress: () => {
              router.push({
                pathname: "/learning-feedback",
                params: { 
                  taskId: taskId,
                  duration: targetTime.toString(),
                  isSubtask: taskInfo?.isSubtask ? 'true' : 'false'
                }
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error("❌ Focus: Session complete error:", error);
      // Still navigate back even if there's an error
      router.back();
    }
  }, [targetTime, addSession, taskInfo, taskId, t]);

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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getPhaseIcon = (phase?: string) => {
    switch (phase) {
      case "knowledge":
        return "📚";
      case "practice":
        return "🛠️";
      case "application":
        return "🎯";
      case "reflection":
        return "🤔";
      case "output":
        return "📝";
      case "review":
        return "🔄";
      default:
        return "⏱️";
    }
  };

  const getPhaseLabel = (phase?: string) => {
    switch (phase) {
      case "knowledge":
        return t('phases.knowledge');
      case "practice":
        return t('phases.practice');
      case "application":
        return t('phases.application');
      case "reflection":
        return t('phases.reflection');
      case "output":
        return t('phases.output');
      case "review":
        return t('phases.review');
      default:
        return t('focus.focusSession');
    }
  };

  // 🆕 進度計算
  const getProgress = () => {
    if (targetTime === 0) return 0;
    return ((targetTime - currentTime) / targetTime) * 100;
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
            {formatTime(currentTime)}
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
              progress={getProgress()}
              currentTask={taskInfo}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Theme.spacing.xl,
  },
  loadingText: {
    fontSize: Theme.typography.sizes.lg,
    color: Colors.light.subtext,
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: Theme.spacing.xl,
  },
  taskInfo: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Theme.spacing.sm,
  },
  phaseIcon: {
    fontSize: 20,
    marginRight: Theme.spacing.sm,
  },
  taskTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.light.text,
    flex: 1,
    lineHeight: 28,
  },
  phaseLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.light.primary,
    marginBottom: Theme.spacing.sm,
  },
  taskDescription: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
    lineHeight: 22,
    marginBottom: Theme.spacing.sm,
  },
  progressInfo: {
    backgroundColor: Colors.light.background,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
  },
  progressValue: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.light.text,
  },
  timerSection: {
    alignItems: "center",
    marginBottom: Theme.spacing.xxl,
  },
  timeDisplay: {
    fontSize: 64,
    fontWeight: "300",
    color: Colors.light.text,
    marginTop: Theme.spacing.lg,
    fontVariant: ["tabular-nums"],
  },
  timeLabel: {
    fontSize: Theme.typography.sizes.lg,
    color: Colors.light.subtext,
    marginTop: Theme.spacing.sm,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
  },
  primaryButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  secondaryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    justifyContent: "center",
    alignItems: "center",
  },
  companionSection: {
    flex: 1,
    justifyContent: "center",
  },
  settingsButton: {
    padding: Theme.spacing.sm,
  },
});