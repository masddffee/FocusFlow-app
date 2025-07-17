import { useState } from 'react';
import { Alert } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { 
  generateUnifiedLearningPlan, 
  convertUnifiedPlanToAppFormat,
  generateEnhancedSubtasks as backendGenerateSubtasks,
  generatePlan,
  getDynamicQuestions
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

export function useTaskGeneration() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[]>([]);
  const [clarificationResponses, setClarificationResponses] = useState<Record<string, string>>({});
  const [learningPlan, setLearningPlan] = useState<LearningPlan | null>(null);
  const [qualityIssues, setQualityIssues] = useState<string[]>([]);
  const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
  const [showQualityAlert, setShowQualityAlert] = useState(false);
  const [showLearningPlan, setShowLearningPlan] = useState(false);

  const generateUnifiedPlan = async (options: UseTaskGenerationOptions): Promise<EnhancedSubtask[]> => {
    const { title, description, detectedTaskType, currentProficiency, targetProficiency } = options;
    setIsAnalyzing(true);
    setIsGeneratingSubtasks(true);
    setShowQualityAlert(false);
    setShowPersonalizationModal(false);
    
    try {
      console.log("🚀 Using unified learning plan generation...");
      
      const currentLanguage = useSettingsStore.getState().language;
      
      const unifiedResponse = await generateUnifiedLearningPlan({
        title: title.trim(),
        description: description.trim(),
        language: currentLanguage,
        taskType: detectedTaskType || 'skill_learning',
        currentProficiency,
        targetProficiency
      });

      if (unifiedResponse.success && unifiedResponse.data) {
        console.log("✅ Unified learning plan generated successfully");
        
        const { questions, learningPlan: plan, subtasks: generatedSubtasks } = 
          convertUnifiedPlanToAppFormat(unifiedResponse.data);
        
        if (questions && questions.length > 0) {
          console.log(`📋 Found ${questions.length} personalization questions`);
          setClarifyingQuestions(questions);
          setClarificationResponses({});
          setShowPersonalizationModal(true);
          
          if (plan) setLearningPlan(plan);
          return generatedSubtasks || [];
        } else {
          if (plan) {
            setLearningPlan(plan);
            setShowLearningPlan(true);
          }
          
          if (generatedSubtasks && generatedSubtasks.length > 0) {
            return generatedSubtasks;
          } else {
            Alert.alert("⚠️ 警告", "未能生成子任務，將使用備用方案。");
            return await generateFallbackSubtasks(options);
          }
        }
      } else if (unifiedResponse.fallback) {
        console.log("📋 Using fallback response due to AI generation issues");
        
        const { questions, subtasks: fallbackSubtasks } = 
          convertUnifiedPlanToAppFormat(unifiedResponse.fallback);
        
        if (questions && questions.length > 0) {
          setClarifyingQuestions(questions);
          setShowPersonalizationModal(true);
        }
        
        return fallbackSubtasks || [];
      } else {
        throw new Error("統一學習計劃生成失敗");
      }
      
    } catch (error) {
      console.error("❌ Unified learning plan generation failed:", error);
      return await generateFallbackSubtasks(options);
    } finally {
      setIsAnalyzing(false);
      setIsGeneratingSubtasks(false);
    }
  };

  const generateFallbackSubtasks = async (options: UseTaskGenerationOptions): Promise<EnhancedSubtask[]> => {
    const { title, description, detectedTaskType, currentProficiency, targetProficiency } = options;
    
    try {
      console.log("🔄 Using fallback generation method...");
      
      const currentLanguage = useSettingsStore.getState().language;
      const response = await getDynamicQuestions(title, description, currentLanguage);
      const dynamicQuestions = response.questions || [];
      
      if (dynamicQuestions.length > 0) {
        setClarifyingQuestions(dynamicQuestions);
        setClarificationResponses({});
        setQualityIssues(["需要更多信息以生成個人化學習計劃"]);
        setShowQualityAlert(true);
        return [];
      } else {
        return await generateBasicSubtasks(options);
      }
    } catch (error) {
      console.error("Fallback generation failed:", error);
      Alert.alert("❌ 錯誤", "無法生成學習計劃。請檢查網路連接或稍後再試。");
      return [];
    }
  };

  const generateBasicSubtasks = async (options: UseTaskGenerationOptions): Promise<EnhancedSubtask[]> => {
    const { title, description, detectedTaskType, currentProficiency, targetProficiency, dueDate } = options;
    
    try {
      const currentLanguage = useSettingsStore.getState().language;
      const subtasksResponse = await backendGenerateSubtasks({
        title, 
        description, 
        clarificationResponses, 
        dueDate,
        taskType: detectedTaskType,
        currentProficiency,
        targetProficiency,
        language: currentLanguage
      });
      
      return subtasksResponse.subtasks || [];
    } catch (error) {
      console.error("Basic subtask generation failed:", error);
      return [];
    }
  };

  const handlePersonalizationComplete = async (
    options: UseTaskGenerationOptions
  ): Promise<EnhancedSubtask[]> => {
    const { title, description, detectedTaskType, dueDate } = options;
    
    // Check if all required questions are answered
    const unansweredRequired = clarifyingQuestions.filter(
      q => q.required && !clarificationResponses[q.id]?.trim()
    );

    if (unansweredRequired.length > 0) {
      Alert.alert("Missing Information", "Please answer all required questions before proceeding.");
      return [];
    }

    setShowPersonalizationModal(false);
    setIsGeneratingSubtasks(true);

    try {
      // Extract proficiency from responses
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

      // Check if this is an educational task that would benefit from enhanced planning
      const isEducational = detectedTaskType === "skill_learning" || detectedTaskType === "exam_preparation";

      if (isEducational) {
        const currentLanguage = useSettingsStore.getState().language;
        const planResponse = await generatePlan({
          title, 
          description, 
          clarificationResponses,
          dueDate,
          currentProficiency: extractedCurrentProficiency,
          targetProficiency: extractedTargetProficiency,
          language: currentLanguage
        });
        const plan = planResponse.learningPlan;
        
        if (plan && plan.subtasks && plan.subtasks.length > 0) {
          setLearningPlan(plan);
          setShowLearningPlan(true);
          return plan.subtasks;
        }
      }

      // Generate enhanced subtasks with comprehensive personalization
      const currentLanguage = useSettingsStore.getState().language;
      const subtasksResponse = await backendGenerateSubtasks({
        title, 
        description, 
        clarificationResponses,
        dueDate, 
        taskType: detectedTaskType,
        currentProficiency: extractedCurrentProficiency,
        targetProficiency: extractedTargetProficiency,
        language: currentLanguage
      });

      return subtasksResponse.subtasks || [];
    } catch (error) {
      console.error("Personalization complete error:", error);
      Alert.alert("Error", "Failed to create personalized plan. Please try again later.");
      return [];
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const handlePersonalizationResponse = (questionId: string, response: string) => {
    setClarificationResponses(prev => ({
      ...prev,
      [questionId]: response
    }));
  };

  const handleQualityAlertContinue = () => {
    setShowQualityAlert(false);
    if (clarifyingQuestions.length > 0) {
      setShowPersonalizationModal(true);
    }
  };

  const handleQualityAlertSkip = () => {
    setShowQualityAlert(false);
  };

  const handleLearningPlanComplete = () => {
    setShowLearningPlan(false);
  };

  return {
    // States
    isAnalyzing,
    isGeneratingSubtasks,
    clarifyingQuestions,
    clarificationResponses,
    learningPlan,
    qualityIssues,
    showPersonalizationModal,
    showQualityAlert,
    showLearningPlan,
    
    // Actions
    generateUnifiedPlan,
    handlePersonalizationComplete,
    handlePersonalizationResponse,
    handleQualityAlertContinue,
    handleQualityAlertSkip,
    handleLearningPlanComplete,
    
    // Setters
    setShowPersonalizationModal,
    setShowQualityAlert,
    setShowLearningPlan
  };
} 