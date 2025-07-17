import { EnhancedSubtask, SubtaskSegment } from "@/types/task";

/**
 * 計算子任務的總時長（分鐘）
 */
export function getSubtaskTotalDuration(subtask: EnhancedSubtask): number {
  // 🔧 修復：嚴格保護AI預估時長，確保原始時長不被改變
  return subtask.userEstimatedDuration || subtask.aiEstimatedDuration || 60;
}

/**
 * 🔧 獲取子任務的原始預估時長 - 永遠不應被修改
 */
export function getSubtaskOriginalDuration(subtask: EnhancedSubtask): number {
  return subtask.aiEstimatedDuration || subtask.userEstimatedDuration || 60;
}

/**
 * 計算子任務的剩餘時間（分鐘）
 */
export function getSubtaskRemainingTime(subtask: EnhancedSubtask): number {
  // 🔧 修復：使用原始時長計算剩餘時間，而非可能被壓縮的總時長
  const originalDuration = getSubtaskOriginalDuration(subtask);
  const timeSpent = subtask.timeSpent || 0;
  
  // 🔧 優先使用明確設定的剩餘時間，但要與原始時長保持一致性
  if (subtask.remainingTime !== undefined) {
    const calculatedRemaining = Math.max(0, originalDuration - timeSpent);
    // 🚨 檢測時長不匹配問題
    if (Math.abs(subtask.remainingTime - calculatedRemaining) > 5) {
      console.warn(`⚠️ Duration mismatch detected for subtask ${subtask.id}: remainingTime=${subtask.remainingTime}min, calculated=${calculatedRemaining}min (original=${originalDuration}min, spent=${timeSpent}min)`);
      return calculatedRemaining; // 使用計算值而非可能不準確的剩餘時間
    }
    return Math.max(0, subtask.remainingTime);
  }
  
  return Math.max(0, originalDuration - timeSpent);
}

/**
 * 計算子任務的完成百分比
 */
export function getSubtaskProgressPercentage(subtask: EnhancedSubtask): number {
  const totalDuration = getSubtaskTotalDuration(subtask);
  const timeSpent = subtask.timeSpent || 0;
  
  if (subtask.progressPercentage !== undefined) {
    return Math.min(100, Math.max(0, subtask.progressPercentage));
  }
  
  if (totalDuration === 0) return 0;
  return Math.min(100, Math.round((timeSpent / totalDuration) * 100));
}

/**
 * 更新子任務進度
 */
export function updateSubtaskProgress(
  subtask: EnhancedSubtask,
  sessionDuration: number, // 本次學習時長（分鐘）
  notes?: string
): EnhancedSubtask {
  // 🔧 修復：使用原始時長，確保AI預估時長永遠不被修改
  const originalDuration = getSubtaskOriginalDuration(subtask);
  const previousTimeSpent = subtask.timeSpent || 0;
  const newTimeSpent = previousTimeSpent + sessionDuration;
  const newRemainingTime = Math.max(0, originalDuration - newTimeSpent);
  const newProgressPercentage = Math.min(100, Math.round((newTimeSpent / originalDuration) * 100));
  
  const sessionRecord = {
    date: new Date().toISOString().split('T')[0],
    duration: sessionDuration,
    notes: notes
  };
  
  const sessionHistory = subtask.sessionHistory || [];
  sessionHistory.push(sessionRecord);
  
  return {
    ...subtask,
    timeSpent: newTimeSpent,
    remainingTime: newRemainingTime,
    // 🔧 關鍵修復：確保totalDuration始終等於原始預估時長
    totalDuration: originalDuration,
    progressPercentage: newProgressPercentage,
    lastSessionTime: sessionDuration,
    sessionHistory: sessionHistory,
    completed: newProgressPercentage >= 100 ? true : subtask.completed,
    completedAt: newProgressPercentage >= 100 && !subtask.completedAt 
      ? new Date().toISOString() 
      : subtask.completedAt
  };
}

/**
 * 檢查子任務是否需要時間切割
 */
export function shouldSplitSubtask(
  subtask: EnhancedSubtask,
  maxAvailableSlotDuration: number // 最大可用時段長度（分鐘）
): boolean {
  const remainingTime = getSubtaskRemainingTime(subtask);
  const minSessionDuration = subtask.minSessionDuration || 25; // 預設最小 25 分鐘
  
  // 如果子任務明確設定不可切割
  if (subtask.canBeSplit === false) {
    return false;
  }
  
  // 如果剩餘時間大於可用時段，且可用時段足夠進行一次有意義的學習
  return remainingTime > maxAvailableSlotDuration && maxAvailableSlotDuration >= minSessionDuration;
}

/**
 * 計算子任務時間切割方案
 */
export function calculateSubtaskSegments(
  subtask: EnhancedSubtask,
  availableSlots: Array<{ duration: number; date: string; timeSlot: { start: string; end: string } }>
): SubtaskSegment[] {
  const remainingTime = getSubtaskRemainingTime(subtask);
  const minSessionDuration = subtask.minSessionDuration || 25;
  const maxSessionDuration = subtask.maxSessionDuration || 120;
  
  if (remainingTime <= 0) {
    return [];
  }
  
  const segments: SubtaskSegment[] = [];
  let totalAllocatedTime = 0;
  let segmentIndex = 1;
  
  // 過濾可用的時段（至少要有最小學習時長）
  const usableSlots = availableSlots.filter(slot => slot.duration >= minSessionDuration);
  
  for (const slot of usableSlots) {
    if (totalAllocatedTime >= remainingTime) {
      break; // 已分配完所有時間
    }
    
    const remainingToAllocate = remainingTime - totalAllocatedTime;
    const slotDuration = Math.min(slot.duration, maxSessionDuration);
    const segmentDuration = Math.min(remainingToAllocate, slotDuration);
    
    // 確保這個片段至少有最小學習時長，除非是最後一個片段
    if (segmentDuration >= minSessionDuration || remainingToAllocate <= minSessionDuration) {
      const segment: SubtaskSegment = {
        id: `${subtask.id}_segment_${segmentIndex}`,
        subtaskId: subtask.id,
        segmentIndex: segmentIndex,
        totalSegments: 0, // 稍後計算
        duration: segmentDuration,
        scheduledDate: slot.date,
        timeSlot: {
          start: slot.timeSlot.start,
          end: slot.timeSlot.end
        },
        completed: false
      };
      
      segments.push(segment);
      totalAllocatedTime += segmentDuration;
      segmentIndex++;
    }
  }
  
  // 更新總片段數
  segments.forEach(segment => {
    segment.totalSegments = segments.length;
  });
  
  return segments;
}

/**
 * 獲取子任務的下一個學習時長
 */
export function getNextSessionDuration(subtask: EnhancedSubtask, availableTime: number): number {
  const remainingTime = getSubtaskRemainingTime(subtask);
  const minSessionDuration = Math.max(5, subtask.minSessionDuration || 25); // 🆕 降低最小時長到5分鐘
  const maxSessionDuration = subtask.maxSessionDuration || 120;
  
  if (remainingTime <= 0) {
    return 0;
  }
  
  // 🆕 更靈活的可用時間處理
  const effectiveAvailableTime = Math.floor(availableTime); // 向下取整到分鐘
  
  // 🆕 動態最小時長調整 - 根據剩餘時間靈活調整
  let dynamicMinSession = minSessionDuration;
  if (remainingTime <= 20) {
    dynamicMinSession = Math.max(5, Math.min(minSessionDuration, remainingTime));
  } else if (remainingTime <= 60) {
    dynamicMinSession = Math.max(10, Math.min(minSessionDuration, remainingTime / 2));
  }
  
  // 如果可用時間小於動態最小時長，但仍然有學習價值
  if (effectiveAvailableTime < dynamicMinSession) {
    // 如果剩餘時間很少（小於等於動態最小時長），允許完成它
    if (remainingTime <= dynamicMinSession && effectiveAvailableTime >= 5) {
      return Math.min(remainingTime, effectiveAvailableTime);
    }
    // 🆕 對於短時間窗口，如果至少有5分鐘，允許短會話
    if (effectiveAvailableTime >= 5 && (remainingTime >= 60 || effectiveAvailableTime >= remainingTime * 0.2)) {
      return Math.min(remainingTime, effectiveAvailableTime);
    }
    return 0; // 可用時間太短，無法進行有效學習
  }
  
  // 🆕 智能時長分配邏輯
  const clampedAvailableTime = Math.min(effectiveAvailableTime, maxSessionDuration);
  
  // 如果剩餘時間很少，直接分配完
  if (remainingTime <= clampedAvailableTime) {
    return remainingTime;
  }
  
  // 🆕 避免產生過小的剩餘片段 - 更智能的分割策略
  const wouldRemain = remainingTime - clampedAvailableTime;
  
  // 如果使用全部可用時間後，剩餘時間會很少（小於動態最小時長）
  if (wouldRemain > 0 && wouldRemain < dynamicMinSession) {
    // 🆕 智能調整策略
    if (clampedAvailableTime > dynamicMinSession * 1.5) {
      // 如果可用時間充足，適當減少這次的分配
      const adjustedDuration = remainingTime - dynamicMinSession;
      return Math.max(dynamicMinSession, Math.min(adjustedDuration, clampedAvailableTime));
    } else if (wouldRemain < 10) {
      // 如果剩餘時間很少（小於10分鐘），直接完成所有
      return remainingTime;
    }
  }
  
  // 🆕 考慮學習效率的時長分配
  // 對於長任務，優先分配較長的會話以提高效率
  if (remainingTime > 180) { // 3小時以上
    const optimalDuration = Math.min(90, clampedAvailableTime); // 偏好90分鐘會話
    return Math.max(dynamicMinSession, Math.min(optimalDuration, remainingTime));
  } else if (remainingTime > 60) { // 1-3小時
    const optimalDuration = Math.min(60, clampedAvailableTime); // 偏好60分鐘會話
    return Math.max(dynamicMinSession, Math.min(optimalDuration, remainingTime));
  }
  
  // 返回可用時間和剩餘時間的較小值
  return Math.min(remainingTime, clampedAvailableTime);
}

/**
 * 檢查子任務是否已完成
 */
export function isSubtaskCompleted(subtask: EnhancedSubtask): boolean {
  if (subtask.completed) {
    return true;
  }
  
  const progressPercentage = getSubtaskProgressPercentage(subtask);
  return progressPercentage >= 100;
}

/**
 * 獲取子任務的學習統計
 */
export function getSubtaskStats(subtask: EnhancedSubtask) {
  const totalDuration = getSubtaskTotalDuration(subtask);
  const timeSpent = subtask.timeSpent || 0;
  const remainingTime = getSubtaskRemainingTime(subtask);
  const progressPercentage = getSubtaskProgressPercentage(subtask);
  const sessionHistory = subtask.sessionHistory || [];
  
  return {
    totalDuration,
    timeSpent,
    remainingTime,
    progressPercentage,
    sessionCount: sessionHistory.length,
    lastSessionDate: sessionHistory.length > 0 ? sessionHistory[sessionHistory.length - 1].date : null,
    averageSessionDuration: sessionHistory.length > 0 
      ? Math.round(sessionHistory.reduce((sum, session) => sum + session.duration, 0) / sessionHistory.length)
      : 0,
    isCompleted: isSubtaskCompleted(subtask)
  };
}

/**
 * 初始化子任務進度追蹤
 */
export function initializeSubtaskProgress(subtask: EnhancedSubtask): EnhancedSubtask {
  // 🔧 修復：使用原始預估時長，確保AI預估時長永遠不被修改
  const originalDuration = getSubtaskOriginalDuration(subtask);
  
  return {
    ...subtask,
    timeSpent: subtask.timeSpent || 0,
    // 🔧 關鍵修復：remainingTime應該基於原始時長計算
    remainingTime: subtask.remainingTime || originalDuration,
    // 🔧 關鍵修復：totalDuration必須等於原始預估時長
    totalDuration: originalDuration,
    progressPercentage: subtask.progressPercentage || 0,
    sessionHistory: subtask.sessionHistory || [],
    canBeSplit: subtask.canBeSplit !== false, // 預設可以切割
    minSessionDuration: subtask.minSessionDuration || 5, // 🆕 降低到5分鐘以支援更靈活的排程
    maxSessionDuration: subtask.maxSessionDuration || 180, // 🆕 增加到3小時以充分利用大時間窗口
    scheduledSegments: subtask.scheduledSegments || []
  };
}

/**
 * 🆕 智能時間切割策略 - 根據任務特性和可用時間進行最佳切割
 */
export function optimizeSubtaskSplitting(
  subtask: EnhancedSubtask,
  availableWindows: Array<{ duration: number; date: string; timeSlot: { start: string; end: string } }>
): {
  canSplit: boolean;
  recommendedSplitting: boolean;
  segments: Array<{ duration: number; efficiency: number }>;
  splitReason: string;
} {
  const remainingTime = getSubtaskRemainingTime(subtask);
  const minSessionDuration = Math.max(5, subtask.minSessionDuration || 25);
  const maxSessionDuration = subtask.maxSessionDuration || 120;
  
  if (remainingTime <= 0) {
    return {
      canSplit: false,
      recommendedSplitting: false,
      segments: [],
      splitReason: "任務已完成"
    };
  }
  
  // 檢查是否需要切割
  const maxWindow = Math.max(...availableWindows.map(w => w.duration), 0);
  const canSplit = subtask.canBeSplit !== false;
  
  if (!canSplit) {
    return {
      canSplit: false,
      recommendedSplitting: false,
      segments: [],
      splitReason: "任務設定為不可切割"
    };
  }
  
  if (remainingTime <= maxWindow) {
    return {
      canSplit: true,
      recommendedSplitting: false,
      segments: [{ duration: remainingTime, efficiency: 1.0 }],
      splitReason: "任務可以在單個時間窗口內完成"
    };
  }
  
  // 🆕 計算最佳切割方案
  const usableWindows = availableWindows
    .filter(w => w.duration >= minSessionDuration)
    .sort((a, b) => b.duration - a.duration); // 大窗口優先
  
  if (usableWindows.length === 0) {
    return {
      canSplit: false,
      recommendedSplitting: false,
      segments: [],
      splitReason: "沒有足夠大的時間窗口"
    };
  }
  
  // 🆕 智能分割算法
  const segments: Array<{ duration: number; efficiency: number }> = [];
  let totalAllocated = 0;
  
  for (const window of usableWindows) {
    if (totalAllocated >= remainingTime) break;
    
    const remainingToAllocate = remainingTime - totalAllocated;
    const sessionDuration = getNextSessionDuration(
      { ...subtask, remainingTime: remainingToAllocate }, 
      window.duration
    );
    
    if (sessionDuration > 0) {
      // 🆕 計算學習效率評分
      let efficiency = 1.0;
      
      // 時長效率：中等時長（30-90分鐘）效率最高
      if (sessionDuration >= 30 && sessionDuration <= 90) {
        efficiency *= 1.0;
      } else if (sessionDuration >= 15 && sessionDuration < 30) {
        efficiency *= 0.85; // 短時間效率略低
      } else if (sessionDuration > 90) {
        efficiency *= 0.9; // 過長時間效率略低
      } else {
        efficiency *= 0.7; // 很短時間效率較低
      }
      
      // 窗口利用率：充分利用窗口的效率更高
      const utilizationRate = sessionDuration / window.duration;
      if (utilizationRate >= 0.8) {
        efficiency *= 1.1; // 高利用率獎勵
      } else if (utilizationRate < 0.5) {
        efficiency *= 0.9; // 低利用率懲罰
      }
      
      segments.push({
        duration: sessionDuration,
        efficiency: Math.min(1.2, efficiency) // 效率上限1.2
      });
      
      totalAllocated += sessionDuration;
    }
  }
  
  const canScheduleAll = totalAllocated >= remainingTime;
  const averageEfficiency = segments.length > 0 
    ? segments.reduce((sum, s) => sum + s.efficiency, 0) / segments.length 
    : 0;
  
  let splitReason = "";
  if (canScheduleAll) {
    if (segments.length === 1) {
      splitReason = "無需切割，可在單個時間窗口完成";
    } else {
      splitReason = `建議切割為 ${segments.length} 個片段，平均效率 ${Math.round(averageEfficiency * 100)}%`;
    }
  } else {
    const scheduledPercentage = Math.round((totalAllocated / remainingTime) * 100);
    splitReason = `只能排程 ${scheduledPercentage}% 的時間，需要增加可用時間窗口`;
  }
  
  return {
    canSplit: true,
    recommendedSplitting: segments.length > 1,
    segments,
    splitReason
  };
}

/**
 * 🆕 智能進度記錄和狀態同步
 */
export function updateSubtaskProgressWithSync(
  subtask: EnhancedSubtask,
  sessionDuration: number, // 本次學習時長（分鐘）
  notes?: string,
  segmentIndex?: number,
  totalSegments?: number
): EnhancedSubtask {
  const totalDuration = getSubtaskTotalDuration(subtask);
  const previousTimeSpent = subtask.timeSpent || 0;
  const newTimeSpent = previousTimeSpent + sessionDuration;
  const newRemainingTime = Math.max(0, totalDuration - newTimeSpent);
  const newProgressPercentage = Math.min(100, Math.round((newTimeSpent / totalDuration) * 100));
  
  // 🆕 片段進度記錄
  const segmentHistory = subtask.segmentHistory || [];
  if (segmentIndex && totalSegments) {
    segmentHistory.push({
      segmentIndex,
      totalSegments,
      duration: sessionDuration,
      completedAt: new Date().toISOString(),
      notes: notes || ""
    });
  }
  
  // 🆕 學習會話歷史記錄
  const sessionHistory = subtask.sessionHistory || [];
  sessionHistory.push({
    duration: sessionDuration,
    date: new Date().toISOString(),
    notes: notes || "",
    segmentInfo: segmentIndex && totalSegments ? {
      segmentIndex,
      totalSegments,
      isSegmented: true
    } : undefined
  });
  
  // 🆕 自動狀態更新
  const isCompleted = newProgressPercentage >= 100;
  const shouldMarkCompleted = isCompleted && !subtask.completed;
  
  // 🆕 學習效率計算
  const totalSessions = sessionHistory.length;
  const averageSessionDuration = totalSessions > 0 
    ? Math.round(sessionHistory.reduce((sum, s) => sum + s.duration, 0) / totalSessions)
    : 0;
  
  const learningEfficiency = calculateLearningEfficiency(sessionHistory, totalDuration);
  
  return {
    ...subtask,
    timeSpent: newTimeSpent,
    remainingTime: newRemainingTime,
    totalDuration: totalDuration,
    progressPercentage: newProgressPercentage,
    lastSessionTime: sessionDuration,
    sessionHistory: sessionHistory,
    segmentHistory: segmentHistory,
    completed: shouldMarkCompleted ? true : subtask.completed,
    completedAt: shouldMarkCompleted ? new Date().toISOString() : subtask.completedAt,
    // 🆕 學習統計
    learningStats: {
      totalSessions,
      averageSessionDuration,
      learningEfficiency,
      lastUpdated: new Date().toISOString()
    }
  };
}

/**
 * 🆕 計算學習效率
 */
function calculateLearningEfficiency(
  sessionHistory: Array<{ duration: number; date: string }>,
  totalDuration: number
): number {
  if (sessionHistory.length === 0) return 0;
  
  const totalSessionTime = sessionHistory.reduce((sum, s) => sum + s.duration, 0);
  const baseEfficiency = Math.min(1.0, totalSessionTime / totalDuration);
  
  // 🆕 會話分佈效率
  const sessionLengths = sessionHistory.map(s => s.duration);
  const avgSessionLength = sessionLengths.reduce((sum, l) => sum + l, 0) / sessionLengths.length;
  
  let distributionBonus = 1.0;
  if (avgSessionLength >= 25 && avgSessionLength <= 90) {
    distributionBonus = 1.1; // 適中時長獎勵
  } else if (avgSessionLength < 15) {
    distributionBonus = 0.9; // 過短時長懲罰
  } else if (avgSessionLength > 120) {
    distributionBonus = 0.95; // 過長時長輕微懲罰
  }
  
  // 🆕 一致性獎勵
  const sessionVariance = calculateVariance(sessionLengths);
  const consistencyBonus = sessionVariance < 400 ? 1.05 : 1.0; // 時長一致性獎勵
  
  const finalEfficiency = baseEfficiency * distributionBonus * consistencyBonus;
  return Math.min(1.2, Math.max(0.5, finalEfficiency)); // 效率範圍 0.5-1.2
}

/**
 * 🆕 計算方差
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return variance;
}

/**
 * 🆕 獲取子任務的詳細學習報告
 */
export function getSubtaskLearningReport(subtask: EnhancedSubtask): {
  overview: {
    completed: boolean;
    progressPercentage: number;
    timeSpent: number;
    remainingTime: number;
    efficiency: number;
  };
  sessions: {
    total: number;
    average: number;
    longest: number;
    shortest: number;
    recent: Array<{ date: string; duration: number; notes?: string }>;
  };
  segmentation: {
    isSegmented: boolean;
    totalSegments: number;
    completedSegments: number;
    segmentDetails?: Array<{
      index: number;
      duration: number;
      completed: boolean;
      date?: string;
    }>;
  };
  recommendations: string[];
} {
  const stats = getSubtaskStats(subtask);
  const sessionHistory = subtask.sessionHistory || [];
  const segmentHistory = subtask.segmentHistory || [];
  
  // 會話統計
  const sessionDurations = sessionHistory.map(s => s.duration);
  const longestSession = sessionDurations.length > 0 ? Math.max(...sessionDurations) : 0;
  const shortestSession = sessionDurations.length > 0 ? Math.min(...sessionDurations) : 0;
  const recentSessions = sessionHistory.slice(-5).map(s => ({
    date: new Date(s.date).toLocaleDateString(),
    duration: s.duration,
    notes: s.notes
  }));
  
  // 分片統計
  const isSegmented = segmentHistory.length > 0;
  const totalSegments = isSegmented 
    ? Math.max(...segmentHistory.map(s => s.totalSegments || 1))
    : 1;
  const completedSegments = segmentHistory.length;
  
  const segmentDetails = isSegmented 
    ? Array.from({ length: totalSegments }, (_, i) => {
        const segment = segmentHistory.find(s => s.segmentIndex === i + 1);
        return {
          index: i + 1,
          duration: segment?.duration || 0,
          completed: !!segment,
          date: segment ? new Date(segment.completedAt).toLocaleDateString() : undefined
        };
      })
    : undefined;
  
  // 🆕 智能建議生成
  const recommendations: string[] = [];
  
  if (stats.progressPercentage < 100) {
    if (stats.averageSessionDuration < 20) {
      recommendations.push("建議延長學習時段到25-45分鐘以提高學習效率");
    } else if (stats.averageSessionDuration > 90) {
      recommendations.push("建議縮短學習時段到60-90分鐘以保持專注力");
    }
    
    if (sessionHistory.length > 0) {
      const daysSinceLastSession = Math.floor(
        (Date.now() - new Date(sessionHistory[sessionHistory.length - 1].date).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastSession > 3) {
        recommendations.push("距離上次學習已超過3天，建議盡快繼續以保持學習連續性");
      } else if (daysSinceLastSession === 0) {
        recommendations.push("今天已有學習記錄，可考慮安排間隔休息以鞏固記憶");
      }
    }
    
    const efficiency = subtask.learningStats?.learningEfficiency || 0;
    if (efficiency < 0.8) {
      recommendations.push("學習效率偏低，建議調整學習方法或減少干擾因素");
    }
  } else {
    recommendations.push("🎉 子任務已完成！建議進行複習以鞏固學習成果");
  }
  
  return {
    overview: {
      completed: stats.isCompleted,
      progressPercentage: stats.progressPercentage,
      timeSpent: stats.timeSpent,
      remainingTime: stats.remainingTime,
      efficiency: subtask.learningStats?.learningEfficiency || 0
    },
    sessions: {
      total: stats.sessionCount,
      average: stats.averageSessionDuration,
      longest: longestSession,
      shortest: shortestSession,
      recent: recentSessions
    },
    segmentation: {
      isSegmented,
      totalSegments,
      completedSegments,
      segmentDetails
    },
    recommendations
  };
} 

/**
 * 🔧 增強的時長驗證和保護機制
 */
export function validateAndProtectSubtaskDuration(subtask: EnhancedSubtask): {
  isValid: boolean;
  correctedSubtask: EnhancedSubtask;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  let isValid = true;
  
  // 獲取原始AI預估時長
  const originalDuration = getSubtaskOriginalDuration(subtask);
  
  // 檢查totalDuration是否與原始預估時長一致
  if (subtask.totalDuration && Math.abs(subtask.totalDuration - originalDuration) > 1) {
    issues.push(`⚠️ Total duration mismatch: totalDuration=${subtask.totalDuration}min, original=${originalDuration}min`);
    isValid = false;
  }
  
  // 檢查remainingTime是否合理
  const timeSpent = subtask.timeSpent || 0;
  const expectedRemainingTime = Math.max(0, originalDuration - timeSpent);
  
  if (subtask.remainingTime && Math.abs(subtask.remainingTime - expectedRemainingTime) > 5) {
    warnings.push(`⚠️ Remaining time inconsistency: remainingTime=${subtask.remainingTime}min, expected=${expectedRemainingTime}min`);
  }
  
  // 創建修正後的子任務
  const correctedSubtask: EnhancedSubtask = {
    ...subtask,
    // 🔧 強制修正：確保totalDuration始終等於原始預估時長
    totalDuration: originalDuration,
    // 🔧 強制修正：重新計算剩餘時間
    remainingTime: expectedRemainingTime,
    // 🔧 確保進度百分比正確
    progressPercentage: originalDuration > 0 ? Math.min(100, Math.round((timeSpent / originalDuration) * 100)) : 0
  };
  
  return {
    isValid,
    correctedSubtask,
    issues,
    warnings
  };
}

/**
 * 🔧 安全的子任務時長獲取函數，帶有自動修正功能
 */
export function getSubtaskDurationSafely(subtask: EnhancedSubtask): {
  originalDuration: number;
  remainingTime: number;
  timeSpent: number;
  progressPercentage: number;
  needsCorrection: boolean;
} {
  const validation = validateAndProtectSubtaskDuration(subtask);
  
  if (!validation.isValid) {
    console.warn(`🔧 Auto-correcting duration issues for subtask ${subtask.id}:`, validation.issues);
  }
  
  if (validation.warnings.length > 0) {
    console.warn(`⚠️ Duration warnings for subtask ${subtask.id}:`, validation.warnings);
  }
  
  return {
    originalDuration: getSubtaskOriginalDuration(subtask),
    remainingTime: validation.correctedSubtask.remainingTime || 0,
    timeSpent: subtask.timeSpent || 0,
    progressPercentage: validation.correctedSubtask.progressPercentage || 0,
    needsCorrection: !validation.isValid || validation.warnings.length > 0
  };
} 