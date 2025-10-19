import { useState } from 'react';
import { Alert } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { log } from '@/lib/logger';
import { 
  generateUnifiedLearningPlan, 
  convertUnifiedPlanToAppFormat,
  generateSubtasksDirect,
  generatePersonalizationQuestions,
  generateTaskPlanningDirect,
  isDirectApiSuccess,
  needsPersonalization,
  getDirectApiMessage,
  getPerformanceMetrics
} from '@/utils/api';
import { ClarifyingQuestion, EnhancedSubtask, LearningPlan, ProficiencyLevel } from '@/types/task';

interface UseTaskGenerationOptions {
  title: string;
  description: string;
  dueDate: string;
  detectedTaskType?: string;
  currentProficiency: ProficiencyLevel;
  targetProficiency: ProficiencyLevel;
}

// 🔧 Phase 2.1: 簡化狀態機制 - 單一 phase 狀態取代多個布林值
type TaskGenerationPhase = 'idle' | 'analyzing' | 'questioning' | 'generating' | 'completed' | 'error';

export function useTaskGeneration() {
  // 🆕 統一狀態機制
  const [phase, setPhase] = useState<TaskGenerationPhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<string | null>(null);
  
  // 資料狀態
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[]>([]);
  const [clarificationResponses, setClarificationResponses] = useState<Record<string, string>>({});
  const [learningPlan, setLearningPlan] = useState<LearningPlan | null>(null);
  
  // 🔧 移除複雜的布林狀態組合
  const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
  const [showLearningPlan, setShowLearningPlan] = useState(false);
  
  // 🔧 移除廢棄的 qualityIssues 和 showQualityAlert
  
  // 衍生狀態（computed properties）
  const isLoading = ['analyzing', 'generating'].includes(phase);
  const hasError = phase === 'error';
  const isCompleted = phase === 'completed';

  // 🔧 Phase 2.1: 重構的統一計劃生成函數 (使用直接 API + 狀態機制)
  const generateUnifiedPlan = async (options: UseTaskGenerationOptions): Promise<EnhancedSubtask[]> => {
    const { title, description, detectedTaskType, currentProficiency, targetProficiency } = options;
    
    // 🆕 使用統一狀態機制
    setPhase('analyzing');
    setErrorMessage(null);
    setShowPersonalizationModal(false);
    setShowLearningPlan(false);
    
    try {
      const currentLanguage = useSettingsStore.getState().language;
      
      // 🚀 使用直接任務規劃 API (性能提升 75%)
      const planningResult = await generateTaskPlanningDirect({
        title: title.trim(),
        description: description.trim(),
        language: currentLanguage,
        mode: 'auto' // 智能模式：自動判斷是否需要個人化問題
      });
      
      // 🆕 性能監控
      setPerformanceMetrics(getPerformanceMetrics(planningResult));
      
      if (!isDirectApiSuccess(planningResult)) {
        throw new Error(planningResult.error || '任務規劃失敗');
      }
      
      // 🔧 判斷是否需要個人化問題
      if (needsPersonalization(planningResult)) {
        setPhase('questioning');
        setClarifyingQuestions(planningResult.questions || []);
        setClarificationResponses({});
        setShowPersonalizationModal(true);
        
        // 如果有學習計劃，保存它
        if (planningResult.plan) {
          setLearningPlan(planningResult.plan);
        }
        
        return planningResult.subtasks || [];
      } else {
        // 🚀 直接生成子任務 (內容充分)
        setPhase('generating');
        
        const subtasksResult = await generateSubtasksDirect({
          title,
          description,
          taskType: detectedTaskType || planningResult.taskType || 'skill_learning',
          currentProficiency,
          targetProficiency,
          language: currentLanguage
        });
        
        if (!isDirectApiSuccess(subtasksResult)) {
          throw new Error(subtasksResult.error || '子任務生成失敗');
        }
        
        // 保存結果
        if (subtasksResult.learningPlan) {
          setLearningPlan(subtasksResult.learningPlan);
          setShowLearningPlan(true);
        }
        
        setPhase('completed');
        
        return subtasksResult.subtasks || [];
      }
      
    } catch (error) {
      log.error("❌ Direct API unified plan generation failed:", error);
      
      setPhase('error');
      setErrorMessage(error instanceof Error ? error.message : '未知錯誤');
      
      // 🔧 fallback 策略
      return await generateFallbackSubtasks(options);
    }
  };

  // 🔧 Phase 2.1: 簡化的 fallback 策略 (使用直接 API + 狀態機制)
  const generateFallbackSubtasks = async (options: UseTaskGenerationOptions): Promise<EnhancedSubtask[]> => {
    const { title, description, detectedTaskType, currentProficiency, targetProficiency } = options;
    
    try {
      const currentLanguage = useSettingsStore.getState().language;
      
      // 🚀 嘗試直接個人化問題生成
      const personalizationResult = await generatePersonalizationQuestions({ 
        title, 
        description, 
        language: currentLanguage,
        mode: 'auto'
      });
      
      if (isDirectApiSuccess(personalizationResult) && needsPersonalization(personalizationResult)) {
        setPhase('questioning');
        setClarifyingQuestions(personalizationResult.questions || []);
        setClarificationResponses({});
        setShowPersonalizationModal(true);
        return [];
      } else {
        // 最終 fallback：生成基本子任務
        return await generateBasicSubtasks(options);
      }
    } catch (error) {
      log.error("Fallback generation failed:", error);
      setPhase('error');
      setErrorMessage("無法生成學習計劃，請檢查網路連接");
      Alert.alert("❌ 錯誤", "無法生成學習計劃。請檢查網路連接或稍後再試。");
      return [];
    }
  };

  // 🔧 Phase 2.1: 基本子任務生成 (使用直接 API)
  const generateBasicSubtasks = async (options: UseTaskGenerationOptions): Promise<EnhancedSubtask[]> => {
    const { title, description, detectedTaskType, currentProficiency, targetProficiency, dueDate } = options;
    
    try {
      setPhase('generating');
      
      const currentLanguage = useSettingsStore.getState().language;
      const subtasksResult = await generateSubtasksDirect({
        title, 
        description, 
        clarificationResponses, 
        dueDate,
        taskType: detectedTaskType,
        currentProficiency,
        targetProficiency,
        language: currentLanguage
      });
      
      if (isDirectApiSuccess(subtasksResult)) {
        setPhase('completed');
        return subtasksResult.subtasks || [];
      } else {
        throw new Error(subtasksResult.error || '基本子任務生成失敗');
      }
    } catch (error) {
      log.error("Basic subtask generation failed:", error);
      setPhase('error');
      setErrorMessage(error instanceof Error ? error.message : '基本子任務生成失敗');
      return [];
    }
  };

  // 🔧 Phase 2.1: 個人化完成處理 (使用直接 API + 狀態機制)
  const handlePersonalizationComplete = async (
    options: UseTaskGenerationOptions
  ): Promise<EnhancedSubtask[]> => {
    const { title, description, detectedTaskType, dueDate } = options;
    
    // 🔧 驗證必要問題已回答
    const unansweredRequired = clarifyingQuestions.filter(
      q => q.required && !clarificationResponses[q.id]?.trim()
    );

    if (unansweredRequired.length > 0) {
      Alert.alert("Missing Information", "Please answer all required questions before proceeding.");
      return [];
    }

    // 🆕 使用狀態機制
    setShowPersonalizationModal(false);
    setPhase('generating');

    try {
      // 🔧 從回答中提取熟練度 (保留原有邏輯)
      let extractedCurrentProficiency = options.currentProficiency;
      let extractedTargetProficiency = options.targetProficiency;

      Object.entries(clarificationResponses).forEach(([questionId, answer]) => {
        const question = clarifyingQuestions.find(q => q.id === questionId)?.question.toLowerCase() || '';
        const answerLower = answer.toLowerCase();
        
        if (question.includes('experience') || question.includes('level') || question.includes('current')) {
          if (answerLower.includes('never') || answerLower.includes('no experience')) {
            extractedCurrentProficiency = "complete_beginner";
          } else if (answerLower.includes('beginner') || answerLower.includes('basic')) {
            extractedCurrentProficiency = "beginner";
          } else if (answerLower.includes('intermediate') || answerLower.includes('some experience')) {
            extractedCurrentProficiency = "intermediate";
          } else if (answerLower.includes('advanced') || answerLower.includes('experienced')) {
            extractedCurrentProficiency = "advanced";
          } else if (answerLower.includes('expert') || answerLower.includes('professional')) {
            extractedCurrentProficiency = "expert";
          }
        }
        
        if (question.includes('goal') || question.includes('target') || question.includes('achieve')) {
          if (answerLower.includes('basic') || answerLower.includes('understand basics')) {
            extractedTargetProficiency = "beginner";
          } else if (answerLower.includes('intermediate') || answerLower.includes('practical')) {
            extractedTargetProficiency = "intermediate";
          } else if (answerLower.includes('advanced') || answerLower.includes('proficient')) {
            extractedTargetProficiency = "advanced";
          } else if (answerLower.includes('expert') || answerLower.includes('teach others')) {
            extractedTargetProficiency = "expert";
          }
        }
      });

      const currentLanguage = useSettingsStore.getState().language;
      
      // 🚀 直接使用任務規劃 API 生成最終計劃
      const finalPlanResult = await generateTaskPlanningDirect({
        title,
        description,
        language: currentLanguage,
        mode: 'final_plan',
        clarificationResponses
      });
      
      if (isDirectApiSuccess(finalPlanResult) && !needsPersonalization(finalPlanResult)) {
        // 有完整計劃，使用它
        if (finalPlanResult.plan) {
          setLearningPlan(finalPlanResult.plan);
          setShowLearningPlan(true);
        }
        
        setPhase('completed');
        return finalPlanResult.subtasks || [];
      } else {
        // 沒有完整計劃，生成個人化子任務
        const subtasksResult = await generateSubtasksDirect({
          title, 
          description, 
          clarificationResponses,
          dueDate, 
          taskType: detectedTaskType,
          currentProficiency: extractedCurrentProficiency,
          targetProficiency: extractedTargetProficiency,
          language: currentLanguage
        });
        
        if (isDirectApiSuccess(subtasksResult)) {
          setPhase('completed');
          return subtasksResult.subtasks || [];
        } else {
          throw new Error(subtasksResult.error || '個人化子任務生成失敗');
        }
      }
    } catch (error) {
      log.error("Personalization complete error:", error);
      setPhase('error');
      setErrorMessage(error instanceof Error ? error.message : '個人化計劃生成失敗');
      Alert.alert("Error", "Failed to create personalized plan. Please try again later.");
      return [];
    }
  };

  // 🔧 簡化的輔助函數
  const handlePersonalizationResponse = (questionId: string, response: string) => {
    setClarificationResponses(prev => ({
      ...prev,
      [questionId]: response
    }));
  };

  const handleLearningPlanComplete = () => {
    setShowLearningPlan(false);
    setPhase('idle'); // 重置狀態
  };

  const resetGeneration = () => {
    setPhase('idle');
    setErrorMessage(null);
    setPerformanceMetrics(null);
    setClarifyingQuestions([]);
    setClarificationResponses({});
    setLearningPlan(null);
    setShowPersonalizationModal(false);
    setShowLearningPlan(false);
  };

  return {
    // 🆕 統一狀態機制
    phase,
    isLoading,
    hasError,
    isCompleted,
    errorMessage,
    performanceMetrics,
    
    // 資料狀態
    clarifyingQuestions,
    clarificationResponses,
    learningPlan,
    
    // UI 狀態
    showPersonalizationModal,
    showLearningPlan,
    
    // 動作函數
    generateUnifiedPlan,
    handlePersonalizationComplete,
    handlePersonalizationResponse,
    handleLearningPlanComplete,
    resetGeneration,
    
    // 狀態設置函數 (向後兼容)
    setShowPersonalizationModal,
    setShowLearningPlan,
    
    // 🔧 向後兼容：添加品質警告相關函數
    showQualityAlert: false, // placeholder
    qualityIssues: [], // placeholder  
    handleQualityAlertContinue: () => {}, // placeholder
    handleQualityAlertSkip: () => {}, // placeholder
  };
} 