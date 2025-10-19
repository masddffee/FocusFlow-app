import { Task, ClarifyingQuestion, EnhancedSubtask, LearningPlan, ProficiencyLevel, LearningPace, DynamicRangeCalculation, TaskDifficulty, ReviewStatus, LearningPhase } from "@/types/task";
import { DayTimeSlots, TimeSlot } from "@/types/timeSlot";
import { initializeSpacedRepetition } from "@/utils/spacedRepetition";

interface QualityEvaluation {
  isSufficient: boolean;
  reasons?: string[];
}

interface TaskAnalysis {
  needsClarification: boolean;
  questions?: ClarifyingQuestion[];
  taskType: "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general";
  currentProficiency?: ProficiencyLevel;
  targetProficiency?: ProficiencyLevel;
  proficiencyGap?: "minimal" | "moderate" | "significant" | "major";
  recommendedPace?: LearningPace;
}

interface CoreMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ⚠️ SECURITY WARNING: Direct API URL exposure
// This constant should be removed in production
const AI_API_URL = "https://toolkit.rork.com/text/llm/";

/**
 * @deprecated SECURITY RISK: Direct LLM API calls expose API keys in frontend
 * Use backend API endpoints from utils/api.ts instead.
 * This function will be removed in the next version.
 */
async function makeAIRequest(messages: CoreMessage[]): Promise<string> {
  console.warn('⚠️ DEPRECATED: makeAIRequest() exposes API keys. Use backend APIs instead.');
  
  try {
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.completion;
  } catch (error) {
    console.error('AI request failed:', error);
    throw new Error('Failed to communicate with AI service');
  }
}

function parseAIResponse(response: string): any {
  try {
    // Clean the response more carefully
    let cleanedResponse = response.trim();
    
    // Remove markdown code blocks
    cleanedResponse = cleanedResponse.replace(/^```(?:json|javascript|js)?\s*/gm, '');
    cleanedResponse = cleanedResponse.replace(/```\s*$/gm, '');
    cleanedResponse = cleanedResponse.replace(/^```/g, '');
    cleanedResponse = cleanedResponse.replace(/```$/g, '');
    
    // Remove any leading/trailing whitespace
    cleanedResponse = cleanedResponse.trim();
    
    // Find the first { or [ and last } or ]
    const firstBrace = cleanedResponse.search(/[{\[]/);
    const lastBraceIndex = Math.max(
      cleanedResponse.lastIndexOf('}'),
      cleanedResponse.lastIndexOf(']')
    );
    
    if (firstBrace !== -1 && lastBraceIndex !== -1) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBraceIndex + 1);
    }
    
    // Try to parse the cleaned response
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Raw response:', response);
    
    // Try regex fallback
    try {
      const jsonMatch = response.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        let extractedJson = jsonMatch[1];
        
        // Find the last complete brace/bracket
        let braceCount = 0;
        let bracketCount = 0;
        let lastValidIndex = -1;
        
        for (let i = 0; i < extractedJson.length; i++) {
          const char = extractedJson[i];
          if (char === '{') braceCount++;
          else if (char === '}') braceCount--;
          else if (char === '[') bracketCount++;
          else if (char === ']') bracketCount--;
          
          if (braceCount === 0 && bracketCount === 0 && (char === '}' || char === ']')) {
            lastValidIndex = i;
            break;
          }
        }
        
        if (lastValidIndex !== -1) {
          extractedJson = extractedJson.substring(0, lastValidIndex + 1);
        }
        
        return JSON.parse(extractedJson);
      }
    } catch (regexError) {
      console.error('Regex fallback also failed:', regexError);
    }
    
    throw new Error('Invalid JSON response from AI');
  }
}

function calculateAdvancedDynamicRange(
  currentProficiency: ProficiencyLevel,
  targetProficiency: ProficiencyLevel,
  availableDays: number,
  taskType: string,
  userGoals?: string,
  userConstraints?: string
): DynamicRangeCalculation {
  // Define proficiency levels numerically for gap calculation
  const proficiencyLevels = {
    complete_beginner: 0,
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    expert: 4
  };

  const currentLevel = proficiencyLevels[currentProficiency] || 1;
  const targetLevel = proficiencyLevels[targetProficiency] || 2;
  const proficiencyGapValue = targetLevel - currentLevel;

  // Enhanced proficiency gap calculation
  let proficiencyGap: "minimal" | "moderate" | "significant" | "major";
  if (proficiencyGapValue <= 0) proficiencyGap = "minimal";
  else if (proficiencyGapValue === 1) proficiencyGap = "moderate";
  else if (proficiencyGapValue === 2) proficiencyGap = "significant";
  else proficiencyGap = "major";

  // Enhanced pace calculation considering both time and proficiency gap
  let recommendedPace: LearningPace;
  const timeUrgency = getTimeUrgencyLevel(availableDays);
  const complexityFactor = getComplexityFactor(proficiencyGap, taskType);
  
  if (availableDays <= 1) recommendedPace = "emergency";
  else if (availableDays <= 3) recommendedPace = "emergency";
  else if (availableDays <= 7) {
    recommendedPace = proficiencyGap === "major" ? "emergency" : "accelerated";
  } else if (availableDays <= 14) {
    recommendedPace = proficiencyGap === "major" ? "accelerated" : "intensive";
  } else if (availableDays <= 30) {
    recommendedPace = proficiencyGap === "major" ? "intensive" : "moderate";
  } else if (availableDays <= 90) {
    recommendedPace = proficiencyGap === "minimal" ? "relaxed" : "moderate";
  } else {
    recommendedPace = "relaxed";
  }

  // Dynamic subtask count calculation
  const baseSubtaskCounts = {
    exam_preparation: { min: 8, optimal: 15, max: 25 },
    skill_learning: { min: 12, optimal: 25, max: 40 },
    project_completion: { min: 10, optimal: 20, max: 35 },
    habit_building: { min: 6, optimal: 12, max: 20 },
    challenge: { min: 8, optimal: 15, max: 25 },
    general: { min: 8, optimal: 15, max: 25 }
  };

  const baseCount = baseSubtaskCounts[taskType as keyof typeof baseSubtaskCounts] || baseSubtaskCounts.general;

  // Adjust based on proficiency gap
  const gapMultipliers = {
    minimal: 0.7,
    moderate: 1.0,
    significant: 1.3,
    major: 1.6
  };

  // Adjust based on time constraint
  const timeMultipliers = {
    emergency: 0.4,
    accelerated: 0.6,
    intensive: 0.8,
    moderate: 1.0,
    relaxed: 1.2
  };

  const gapMultiplier = gapMultipliers[proficiencyGap];
  const timeMultiplier = timeMultipliers[recommendedPace];
  
  const subtaskCount = {
    minimum: Math.max(5, Math.round(baseCount.min * gapMultiplier * timeMultiplier)),
    optimal: Math.max(8, Math.round(baseCount.optimal * gapMultiplier * timeMultiplier)),
    maximum: Math.max(12, Math.round(baseCount.max * gapMultiplier * timeMultiplier))
  };

  // Enhanced difficulty distribution
  let difficultyDistribution = { easy: 30, medium: 50, hard: 20 };
  
  if (recommendedPace === "emergency" || recommendedPace === "accelerated") {
    // Focus on essential, achievable tasks
    difficultyDistribution = { easy: 50, medium: 40, hard: 10 };
  } else if (proficiencyGap === "major" && recommendedPace === "relaxed") {
    // More challenging content for comprehensive learning
    difficultyDistribution = { easy: 20, medium: 45, hard: 35 };
  } else if (proficiencyGap === "minimal") {
    // Balanced approach for small gaps
    difficultyDistribution = { easy: 25, medium: 55, hard: 20 };
  }

  // Enhanced phase adjustments
  let phaseAdjustments = {
    knowledge: 0,
    practice: 0,
    application: 0,
    reflection: 0,
    output: 0,
    review: 0
  };

  if (recommendedPace === "emergency" || recommendedPace === "accelerated") {
    // Emergency: Focus on practice and application, reduce theory and reflection
    phaseAdjustments = {
      knowledge: -10,
      practice: +15,
      application: +10,
      reflection: -10,
      output: -5,
      review: 0
    };
  } else if (proficiencyGap === "major" && (recommendedPace === "moderate" || recommendedPace === "relaxed")) {
    // Major gap with time: Increase knowledge and practice
    phaseAdjustments = {
      knowledge: +10,
      practice: +10,
      application: 0,
      reflection: +5,
      output: -5,
      review: +5
    };
  } else if (proficiencyGap === "minimal") {
    // Small gap: Focus on application and output
    phaseAdjustments = {
      knowledge: -5,
      practice: -5,
      application: +10,
      reflection: 0,
      output: +5,
      review: +10
    };
  }

  // Time allocation calculation
  const baseHoursNeeded = {
    minimal: 20,
    moderate: 60,
    significant: 150,
    major: 300
  }[proficiencyGap];

  const urgencyMultiplier = {
    emergency: 2.0,
    accelerated: 1.5,
    intensive: 1.2,
    moderate: 1.0,
    relaxed: 0.8
  }[recommendedPace];

  const totalHours = baseHoursNeeded * urgencyMultiplier;
  const dailyHours = Math.min(12, Math.max(1, totalHours / Math.max(availableDays, 1)));
  const weeklyHours = dailyHours * 7;

  // Enhanced priority focus and skip topics
  let priorityFocus: string[] = [];
  let skipTopics: string[] = [];

  if (recommendedPace === "emergency" || recommendedPace === "accelerated") {
    priorityFocus = getPriorityFocusForUrgentTimeline(taskType, proficiencyGap);
    skipTopics = getSkipTopicsForUrgentTimeline(taskType, proficiencyGap);
  } else if (proficiencyGap === "major") {
    priorityFocus = getPriorityFocusForMajorGap(taskType);
  } else {
    priorityFocus = getBalancedPriorityFocus(taskType);
  }

  // Review strategy based on task type and proficiency gap
  const reviewStrategy = {
    enabled: taskType === "skill_learning" || taskType === "exam_preparation",
    initialInterval: proficiencyGap === "major" ? 1 : 3, // days
    maxInterval: proficiencyGap === "minimal" ? 30 : 90, // days
    reviewPercentage: proficiencyGap === "major" ? 30 : 20 // percentage of completed tasks
  };

  return {
    currentProficiency,
    targetProficiency,
    availableDays,
    proficiencyGap,
    recommendedPace,
    subtaskCount,
    difficultyDistribution,
    phaseAdjustments,
    timeAllocation: {
      dailyHours,
      weeklyHours,
      totalHours
    },
    priorityFocus,
    skipTopics: skipTopics.length > 0 ? skipTopics : undefined,
    reviewStrategy
  };
}

function getTimeUrgencyLevel(days: number): "low" | "medium" | "high" | "critical" {
  if (days <= 3) return "critical";
  if (days <= 7) return "high";
  if (days <= 30) return "medium";
  return "low";
}

function getComplexityFactor(proficiencyGap: string, taskType: string): number {
  const gapFactors = { minimal: 1, moderate: 1.2, significant: 1.5, major: 2 };
  const typeFactors = {
    exam_preparation: 1.2,
    skill_learning: 1.5,
    project_completion: 1.3,
    habit_building: 0.8,
    challenge: 1.1,
    general: 1.0
  };
  
  return (gapFactors[proficiencyGap as keyof typeof gapFactors] || 1) * 
         (typeFactors[taskType as keyof typeof typeFactors] || 1);
}

function getPriorityFocusForUrgentTimeline(taskType: string, proficiencyGap: string): string[] {
  const urgentFocus = {
    exam_preparation: ["high-yield topics", "practice problems", "test strategies", "time management"],
    skill_learning: ["core concepts", "essential tools", "basic implementation", "immediate application"],
    project_completion: ["MVP features", "core functionality", "essential requirements", "basic testing"],
    habit_building: ["trigger identification", "minimum viable habit", "consistency tracking"],
    challenge: ["core skills", "essential practice", "performance optimization"],
    general: ["critical tasks", "immediate priorities", "essential outcomes"]
  };
  
  return urgentFocus[taskType as keyof typeof urgentFocus] || urgentFocus.general;
}

function getSkipTopicsForUrgentTimeline(taskType: string, proficiencyGap: string): string[] {
  const skipTopics = {
    exam_preparation: ["advanced theory", "optional topics", "deep dives", "supplementary material"],
    skill_learning: ["advanced techniques", "theoretical background", "optional features", "edge cases"],
    project_completion: ["advanced features", "optimization", "nice-to-have features", "extensive documentation"],
    habit_building: ["advanced tracking", "complex systems", "long-term optimization"],
    challenge: ["advanced techniques", "optimization", "theoretical background"],
    general: ["non-essential tasks", "advanced topics", "optional activities"]
  };
  
  return skipTopics[taskType as keyof typeof skipTopics] || skipTopics.general;
}

function getPriorityFocusForMajorGap(taskType: string): string[] {
  const majorGapFocus = {
    exam_preparation: ["fundamental concepts", "basic problem solving", "core knowledge areas", "essential formulas"],
    skill_learning: ["foundational theory", "basic tools", "fundamental concepts", "core practices"],
    project_completion: ["requirements analysis", "basic architecture", "fundamental skills", "core technologies"],
    habit_building: ["habit science", "basic implementation", "simple tracking", "consistency building"],
    challenge: ["fundamental skills", "basic training", "core techniques", "foundational knowledge"],
    general: ["fundamental concepts", "basic skills", "core requirements", "essential knowledge"]
  };
  
  return majorGapFocus[taskType as keyof typeof majorGapFocus] || majorGapFocus.general;
}

function getBalancedPriorityFocus(taskType: string): string[] {
  const balancedFocus = {
    exam_preparation: ["comprehensive review", "practice problems", "test strategies", "knowledge consolidation"],
    skill_learning: ["theory and practice", "real-world application", "skill development", "portfolio building"],
    project_completion: ["full development cycle", "quality assurance", "documentation", "deployment"],
    habit_building: ["sustainable systems", "long-term planning", "optimization", "maintenance"],
    challenge: ["skill development", "performance improvement", "strategy optimization", "goal achievement"],
    general: ["comprehensive approach", "quality execution", "thorough completion", "skill development"]
  };
  
  return balancedFocus[taskType as keyof typeof balancedFocus] || balancedFocus.general;
}

/**
 * @deprecated SECURITY RISK: Direct LLM API calls expose API keys in frontend
 * 
 * 🚨 MIGRATION REQUIRED:
 * Replace with: generateUnifiedLearningPlan() from utils/api.ts
 * 
 * Example:
 * // ❌ Old (unsafe)
 * const quality = await evaluateInputQuality(title, description);
 * 
 * // ✅ New (secure)
 * const result = await generateUnifiedLearningPlan({ title, description });
 * 
 * This function will be removed in the next version.
 */
export async function evaluateInputQuality(
  title: string,
  description: string,
  language: "en" | "zh" = "zh"
): Promise<{
  isSufficient: boolean;
  reasons?: string[];
}> {
  console.error("🚨 安全警告：evaluateInputQuality() 已棄用！請使用 evaluateInputQualitySafely()");
  console.error("💡 遷移指南：import { evaluateInputQualitySafely } from '@/utils/api'");
  
  // Minimal fallback to prevent app crashes
    return {
    isSufficient: title.length > 5 && description.length > 10,
    reasons: title.length <= 5 || description.length <= 10 
      ? ["Please provide more detailed information for better AI assistance"]
      : []
  };
}

/**
 * @deprecated SECURITY RISK: Direct LLM API calls expose API keys in frontend
 * Use getDynamicQuestions() from utils/api.ts instead.
 * This function will be removed in the next version.
 */
export async function analyzeTaskForClarification(title: string, description: string): Promise<TaskAnalysis> {
  console.warn('⚠️ DEPRECATED: analyzeTaskForClarification() exposes API keys. Use getDynamicQuestions() from utils/api.ts instead.');
  console.warn('🔗 Migration guide: Replace with backend API calls for security.');
  
  // Minimal fallback to prevent app crashes
  const detectedType = title.toLowerCase().includes('exam') || title.toLowerCase().includes('test') 
    ? 'exam_preparation' 
    : title.toLowerCase().includes('learn') || title.toLowerCase().includes('study')
    ? 'skill_learning'
    : 'general';
    
    return {
    needsClarification: description.length < 20,
      questions: [],
    taskType: detectedType,
    currentProficiency: 'beginner',
    targetProficiency: 'intermediate'
  };
}

/**
 * Get task-type specific prompting instructions for LLM
 * @param taskType - The type of task being generated
 * @param language - Output language preference
 * @returns Task-specific prompting instructions
 */
function getTaskTypeSpecificPrompt(taskType: string, language: "en" | "zh"): string {
  const prompts = {
    en: {
      exam_preparation: `Focus on exam success strategies:
- Diagnostic assessment and gap analysis
- High-yield topic prioritization  
- Timed practice and test-taking strategies
- Performance analysis and improvement
- Final review and confidence building`,
      skill_learning: `Focus on comprehensive skill development:
- Foundational knowledge building
- Progressive skill practice
- Real-world application projects
- Mastery verification through challenges
- Continuous improvement and refinement`,
      project_completion: `Focus on project delivery:
- Requirements analysis and planning
- Iterative development and testing
- Quality assurance and refinement
- Documentation and presentation
- Deployment and maintenance`,
      habit_building: `Focus on sustainable behavior change:
- Habit loop identification and design
- Progressive difficulty and consistency
- Environmental and social triggers
- Progress tracking and adjustment
- Long-term maintenance strategies`,
      challenge: `Focus on goal achievement:
- Clear milestone definition
- Strategic approach development  
- Skill gap identification and filling
- Performance optimization
- Success measurement and celebration`,
      general: `Focus on comprehensive learning:
- Structured knowledge acquisition
- Practical skill development
- Application and implementation
- Reflection and improvement
- Knowledge consolidation`
    },
    zh: {
      exam_preparation: `專注於考試成功策略：
- 診斷評估和差距分析
- 高產值主題優先排序
- 計時練習和應試策略
- 表現分析和改進
- 最終複習和信心建立`,
      skill_learning: `專注於全面技能發展：
- 基礎知識建構
- 漸進式技能練習
- 真實世界應用項目
- 通過挑戰驗證熟練度
- 持續改進和精煉`,
      project_completion: `專注於項目交付：
- 需求分析和規劃
- 迭代開發和測試
- 質量保證和精煉
- 文檔和演示
- 部署和維護`,
      habit_building: `專注於可持續行為改變：
- 習慣循環識別和設計
- 漸進難度和一致性
- 環境和社會觸發因素
- 進度追蹤和調整
- 長期維護策略`,
      challenge: `專注於目標達成：
- 明確里程碑定義
- 策略方法開發
- 技能差距識別和填補
- 表現優化
- 成功測量和慶祝`,
      general: `專注於全面學習：
- 結構化知識獲取
- 實用技能發展
- 應用和實施
- 反思和改進
- 知識鞏固`
    }
  } as const;
  
  type TaskTypeKey = keyof typeof prompts.en;
  const taskKey = taskType as TaskTypeKey;
  
  return prompts[language][taskKey] || prompts[language].general;
}

/**
 * Generate enhanced subtasks using LLM-powered intelligent analysis
 * @param title - Task title
 * @param description - Task description
 * @param clarificationResponses - User's personalization responses
 * @param dueDate - Task deadline
 * @param taskType - Type of task for specialized prompting
 * @param currentProficiency - User's current skill level
 * @param targetProficiency - Target skill level to achieve
 * @param language - Output language preference
 * @returns Promise<EnhancedSubtask[]> - AI-generated subtasks with realistic durations and phases
 */
export async function generateEnhancedSubtasks(
  title: string, 
  description: string, 
  clarificationResponses?: Record<string, string>,
  dueDate?: string,
  taskType?: "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general",
  currentProficiency?: ProficiencyLevel,
  targetProficiency?: ProficiencyLevel,
  language?: "en" | "zh"
): Promise<EnhancedSubtask[]> {
  console.warn('⚠️ DEPRECATED: generateEnhancedSubtasks() exposes API keys. Use backend APIs instead.');
  
  // Get current language from params or default
  const currentLanguage = language || "en";
  
  // Define language-specific prompts
  const languagePrompts = {
    en: {
      systemPrompt: "You are an expert educational curriculum designer and learning strategist.",
      taskGeneration: "Generate detailed subtasks in English",
      phaseDescriptions: {
        knowledge: "Knowledge Input - Research and foundational learning",
        practice: "Practice - Hands-on exercises and skill building", 
        application: "Application - Real-world implementation",
        reflection: "Reflection - Self-assessment and review",
        output: "Output - Final deliverables and presentation",
        review: "Review - Spaced repetition and mastery verification"
      }
    },
    zh: {
      systemPrompt: "您是一位專業的教育課程設計師和學習策略專家。",
      taskGeneration: "用繁體中文生成詳細的子任務",
      phaseDescriptions: {
        knowledge: "知識輸入 - 研究和基礎學習",
        practice: "實作練習 - 動手練習和技能建構",
        application: "實際應用 - 真實世界的實施",
        reflection: "反思評估 - 自我評估和複習",
        output: "成果產出 - 最終交付物和展示",
        review: "複習鞏固 - 間隔重複和熟練度驗證"
      }
    }
  };

  const prompts = languagePrompts[currentLanguage];

  // Calculate available time if due date is provided
  let timeContext = "";
  let availableDays = 0;
  if (dueDate) {
    const today = new Date();
    const targetDate = new Date(dueDate);
    availableDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (availableDays > 0) {
      timeContext = `Available time: ${availableDays} days until ${dueDate}. Plan with realistic daily commitments.`;
    } else if (availableDays <= 0) {
      timeContext = `URGENT: Due date is today or has passed. Focus on high-impact, time-efficient tasks.`;
    }
  }

  // Auto-detect task type if not explicitly provided
  if (!taskType) {
    taskType = detectTaskType(title, description);
  }

  // Extract proficiency levels from clarification responses if not provided
  if (!currentProficiency || !targetProficiency) {
    const extracted = extractProficiencyFromResponses(clarificationResponses);
    currentProficiency = currentProficiency || extracted.current;
    targetProficiency = targetProficiency || extracted.target;
  }

  // Calculate advanced dynamic range based on proficiency gap and time constraints
  const dynamicRange = calculateAdvancedDynamicRange(
    currentProficiency,
    targetProficiency,
    availableDays,
    taskType,
    clarificationResponses?.goal,
    clarificationResponses?.constraints
  );

  // Construct comprehensive LLM prompt with all context
  const messages: CoreMessage[] = [
    {
      role: 'system',
      content: `${prompts.systemPrompt}

You are creating an intelligent, adaptive learning curriculum. Generate ${prompts.taskGeneration} following modern educational principles and methodologies.

## Task Type: ${taskType.toUpperCase()}
${getTaskTypeSpecificPrompt(taskType, currentLanguage)}

## Proficiency Context:
- Current Level: ${currentProficiency} 
- Target Level: ${targetProficiency}
- Proficiency Gap: ${dynamicRange.proficiencyGap}
- Recommended Pace: ${dynamicRange.recommendedPace}

## Time Context:
${timeContext || 'No specific deadline provided - plan for comprehensive mastery'}

## Learning Phase Distribution (follow this allocation):
${Object.entries(dynamicRange.phaseAdjustments).map(([phase, adjustment]) => 
  `- ${prompts.phaseDescriptions[phase as keyof typeof prompts.phaseDescriptions]}: ${Math.round(adjustment)}%`
).join('\n')}

## Priority Focus Areas:
${dynamicRange.priorityFocus.map(focus => `- ${focus}`).join('\n')}

${dynamicRange.skipTopics?.length ? `## Topics to Skip (due to time constraints):\n${dynamicRange.skipTopics.map(topic => `- ${topic}`).join('\n')}\n` : ''}

## Duration Guidelines:
- Total estimated time: ${dynamicRange.timeAllocation.totalHours} hours
- Daily time commitment: ${dynamicRange.timeAllocation.dailyHours} hours
- Generate ${dynamicRange.subtaskCount.optimal} subtasks (range: ${dynamicRange.subtaskCount.minimum}-${dynamicRange.subtaskCount.maximum})

## Difficulty Distribution:
- Easy tasks: ${dynamicRange.difficultyDistribution.easy}%
- Medium tasks: ${dynamicRange.difficultyDistribution.medium}%  
- Hard tasks: ${dynamicRange.difficultyDistribution.hard}%

${currentLanguage === 'zh' ? `
## 繁體中文輸出要求：
- 所有任務標題都使用繁體中文
- 任務描述要詳細且使用繁體中文
- 推薦資源要包含中文資源（如適用）
- 技能名稱使用繁體中文

範例格式：
{
  "title": "完成數學基礎概念研究和學習",
  "text": "深入研究代數基礎概念，包括方程式求解、函數圖形分析等核心主題。閱讀相關教材章節並完成基礎練習題。",
  "aiEstimatedDuration": 90,
  "difficulty": "medium",
  "phase": "knowledge",
  "skills": ["代數運算", "問題解決", "數學推理"],
  "recommendedResources": ["代數教科書第1-3章", "線上練習平台", "教學影片"]
}
` : `
## English Output Requirements:
- All task titles in English
- Detailed descriptions in English  
- Recommended resources in English
- Skill names in English

Example format:
{
  "title": "Complete Mathematics Fundamentals Research and Learning",
  "text": "Research algebraic fundamentals including equation solving, function analysis, and core mathematical concepts. Read relevant textbook chapters and complete basic practice exercises.",
  "aiEstimatedDuration": 90,
  "difficulty": "medium", 
  "phase": "knowledge",
  "skills": ["algebraic operations", "problem solving", "mathematical reasoning"],
  "recommendedResources": ["Algebra textbook chapters 1-3", "Online practice platform", "Educational videos"]
}
`}

Return ONLY a valid JSON array of subtask objects with these exact fields:
- title: string (specific, actionable title)
- text: string (detailed description with specific learning objectives)
- aiEstimatedDuration: number (realistic minutes based on difficulty and proficiency gap)
- difficulty: "easy" | "medium" | "hard" (follow distribution guidelines)
- phase: "${currentLanguage === 'zh' ? 'knowledge" | "practice" | "application" | "reflection" | "output" | "review' : 'knowledge" | "practice" | "application" | "reflection" | "output" | "review'}"
   - skills: string[] (specific skills developed)
- recommendedResources: string[] (specific, high-quality resources)
- prerequisites?: string[] (other subtask titles that must be completed first)`
    },
    {
      role: 'user',
      content: `Task Title: "${title}"
Description: "${description || 'No description provided'}"
${clarificationResponses && Object.keys(clarificationResponses).length > 0 
  ? `\nPersonalization Context:\n${Object.entries(clarificationResponses)
      .map(([question, answer]) => `${question}: ${answer}`)
      .join('\n')}`
  : ''}

${currentLanguage === 'zh' 
  ? `請根據上述任務用繁體中文生成詳細的學習子任務，遵循6階段學習方法論。確保所有內容都使用繁體中文。`
  : `Generate detailed learning subtasks in English following the 6-phase learning methodology. Ensure all content is in English.`}

Return as JSON array only.`
    }
  ];

  try {
    const response = await makeAIRequest(messages);
    const parsed = parseAIResponse(response);
    
    if (Array.isArray(parsed)) {
      return parsed.map((subtask, index) => ({
        id: `llm_subtask_${Date.now()}_${index}`,
        title: subtask.title || `Task ${index + 1}`,
        text: subtask.text || `Subtask ${index + 1}`,
        recommendedResources: subtask.recommendedResources || [],
        aiEstimatedDuration: subtask.aiEstimatedDuration || 60,
        difficulty: (subtask.difficulty as TaskDifficulty) || 'medium',
        order: index + 1,
        completed: false,
        skills: subtask.skills || [],
        prerequisites: subtask.prerequisites || [],
        phase: (subtask.phase as LearningPhase) || 'practice',
        taskType: taskType as "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general",
        proficiencyLevel: currentProficiency,
        targetProficiency: targetProficiency,
        learningPace: dynamicRange.recommendedPace,
        reviewStatus: "not_started" as ReviewStatus,
        spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
        isReviewTask: subtask.phase === "review",
        // 🔧 Enhanced tracking fields - 使用原始AI預估時長初始化
        timeSpent: 0,
        remainingTime: subtask.aiEstimatedDuration || 60,
        totalDuration: subtask.aiEstimatedDuration || 60,
        progressPercentage: 0,
        sessionHistory: [],
        canBeSplit: (subtask.aiEstimatedDuration || 60) > 60, // Can split if longer than 1 hour
        minSessionDuration: 25,
        maxSessionDuration: 120,
      }));
    }
    
    // Fallback: Generate comprehensive subtasks if AI fails
    console.warn('LLM returned invalid format, falling back to template-based generation');
    return generateComprehensiveSubtasks(title, description, availableDays, taskType, currentProficiency, targetProficiency);
  } catch (error) {
    console.error('Failed to generate enhanced subtasks via LLM:', error);
    // Return comprehensive fallback subtasks instead of basic ones
    return generateComprehensiveSubtasks(title, description, availableDays, taskType, currentProficiency, targetProficiency);
  }
}

/**
 * Auto-detect task type from title and description
 * @param title - Task title
 * @param description - Task description  
 * @returns Detected task type
 */
function detectTaskType(title: string, description: string): "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general" {
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  
  // Exam preparation detection
  const examKeywords = ['exam', 'test', 'quiz', 'certification', 'assessment', 'midterm', 'final', 'sat', 'gre', 'gmat', 'ap', 'ielts', 'toefl', '段考', '考試', '測驗', '期中考', '期末考', '模擬考', '檢定', '會考', '學測', '指考', '統測'];
  if (examKeywords.some(keyword => titleLower.includes(keyword) || descLower.includes(keyword))) {
    return "exam_preparation";
  }
  // Skill learning detection
  else if (titleLower.includes('learn') || titleLower.includes('master') || titleLower.includes('understand') || 
           descLower.includes('learn') || descLower.includes('skill') || descLower.includes('develop')) {
    return "skill_learning";
  }
  // Project completion detection
  else if (titleLower.includes('build') || titleLower.includes('create') || titleLower.includes('develop') ||
           titleLower.includes('design') || titleLower.includes('implement') || titleLower.includes('project')) {
    return "project_completion";
  }
  // Habit building detection
  else if (titleLower.includes('daily') || titleLower.includes('habit') || titleLower.includes('routine') ||
           titleLower.includes('practice') || titleLower.includes('every day')) {
    return "habit_building";
  }
  // Challenge detection
  else if (titleLower.includes('challenge') || titleLower.includes('goal') || titleLower.includes('achieve')) {
    return "challenge";
  }
  else {
    return "general";
  }
}

/**
 * Extract proficiency levels from clarification responses
 * @param clarificationResponses - User's responses to personalization questions
 * @returns Extracted proficiency levels
 */
function extractProficiencyFromResponses(clarificationResponses?: Record<string, string>): {
  current: ProficiencyLevel;
  target: ProficiencyLevel;
} {
  const proficiencyKeywords = {
    complete_beginner: ['never', 'no experience', 'complete beginner', 'starting from scratch'],
    beginner: ['beginner', 'basic', 'just started', 'learning basics'],
    intermediate: ['intermediate', 'some experience', 'comfortable with basics'],
    advanced: ['advanced', 'experienced', 'proficient', 'strong foundation'],
    expert: ['expert', 'professional', 'master', 'teach others']
  };

  let currentProficiency: ProficiencyLevel = "beginner"; // Default
  let targetProficiency: ProficiencyLevel = "intermediate"; // Default
  
  if (clarificationResponses) {
    for (const [level, keywords] of Object.entries(proficiencyKeywords)) {
      if (Object.values(clarificationResponses).some(response => 
        keywords.some(keyword => response.toLowerCase().includes(keyword))
      )) {
        currentProficiency = level as ProficiencyLevel;
        break;
      }
    }
    
    // Target is typically one level higher than current
    const levels: ProficiencyLevel[] = ["complete_beginner", "beginner", "intermediate", "advanced", "expert"];
    const currentIndex = levels.indexOf(currentProficiency);
    targetProficiency = levels[Math.min(currentIndex + 1, levels.length - 1)];
  }
  
  return { current: currentProficiency, target: targetProficiency };
}

/**
 * DEPRECATED: Legacy rule-based subtask generation functions
 * These functions are preserved for fallback purposes but should not be used for new features.
 * They will be removed in a future version once LLM-based generation is fully stable.
 */
function generateComprehensiveSubtasks(
  title: string, 
  description: string, 
  availableDays: number = 0, 
  taskType: "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general" = "general",
  currentProficiency: ProficiencyLevel = "beginner",
  targetProficiency: ProficiencyLevel = "intermediate"
): EnhancedSubtask[] {
  // DEPRECATED: This function uses hard-coded rules and should be replaced by LLM generation
  console.warn('Using deprecated rule-based subtask generation as fallback');
  
  const dynamicRange = calculateAdvancedDynamicRange(currentProficiency, targetProficiency, availableDays, taskType);
  const isUrgent = dynamicRange.recommendedPace === "emergency" || dynamicRange.recommendedPace === "accelerated";
  
  switch (taskType) {
    case "exam_preparation":
      return generateExamPrepSubtasks(title, description, isUrgent, currentProficiency, targetProficiency, dynamicRange);
    case "skill_learning":
      return generateSkillLearningSubtasks(title, description, isUrgent, currentProficiency, targetProficiency, dynamicRange);
    case "project_completion":
      return generateProjectSubtasks(title, description, isUrgent, currentProficiency, targetProficiency, dynamicRange);
    case "habit_building":
      return generateHabitBuildingSubtasks(title, description, isUrgent, currentProficiency, targetProficiency, dynamicRange);
    case "challenge":
      return generateChallengeSubtasks(title, description, isUrgent, currentProficiency, targetProficiency, dynamicRange);
    default:
      return generateGeneralSubtasks(title, description, isUrgent, currentProficiency, targetProficiency, dynamicRange);
  }
}

/**
 * DEPRECATED: Hard-coded exam preparation subtask generation
 * @deprecated Use LLM-powered generateEnhancedSubtasks instead
 */
function generateExamPrepSubtasks(
  title: string, 
  description: string, 
  isUrgent: boolean, 
  currentProficiency: ProficiencyLevel,
  targetProficiency: ProficiencyLevel,
  dynamicRange: DynamicRangeCalculation
): EnhancedSubtask[] {
  const subject = title.replace(/exam|test|preparation|prep/gi, '').trim();
  
  return [
    // PHASE 1: KNOWLEDGE INPUT (20%)
    {
      id: `exam_1_${Date.now()}`,
      title: `Diagnostic Assessment: ${subject} Current Level Evaluation`,
      text: `Complete comprehensive diagnostic test to evaluate current knowledge level in ${subject}. Identify specific learning gaps, weak areas, and topics requiring immediate attention. Document baseline performance and create prioritized study plan.`,
      recommendedResources: ['Official practice tests', 'Diagnostic assessment tools', 'Subject-specific evaluation frameworks', 'Baseline performance tracking sheets'],
      aiEstimatedDuration: isUrgent ? 60 : 90,
      difficulty: 'medium' as TaskDifficulty,
      order: 1,
      completed: false,
      skills: ['self-assessment', 'gap analysis', 'baseline evaluation', 'study planning'],
      prerequisites: [],
      phase: 'knowledge' as LearningPhase,
      taskType: 'exam_preparation' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },
    {
      id: `exam_2_${Date.now()}`,
      title: `${subject} Exam Format and Structure Analysis`,
      text: `Study official exam format, question types, time allocation, and scoring criteria for ${subject}. Analyze past exam papers and identify common question patterns, difficulty distribution, and high-yield topics.`,
      recommendedResources: ['Official exam guides', 'Past exam papers', 'Exam format documentation', 'Scoring rubrics', 'Question pattern analysis'],
      aiEstimatedDuration: isUrgent ? 90 : 120,
      difficulty: 'medium' as TaskDifficulty,
      order: 2,
      completed: false,
      skills: ['exam strategy', 'pattern recognition', 'format analysis', 'strategic planning'],
      prerequisites: ['exam_1'],
      phase: 'knowledge' as LearningPhase,
      taskType: 'exam_preparation' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 2: PRACTICE (40%)
    {
      id: `exam_3_${Date.now()}`,
      title: `High-Yield Topics Intensive Practice: ${subject}`,
      text: `Complete 100+ practice problems focusing on the most frequently tested topics in ${subject}. Practice under timed conditions and track accuracy rates. Focus on speed and precision for high-impact areas.`,
      recommendedResources: ['Official practice problem sets', 'High-yield topic guides', 'Timed practice platforms', 'Accuracy tracking tools'],
      aiEstimatedDuration: isUrgent ? 180 : 240,
      difficulty: 'hard' as TaskDifficulty,
      order: 3,
      completed: false,
      skills: ['problem solving', 'time management', 'accuracy improvement', 'speed optimization'],
      prerequisites: ['exam_2'],
      phase: 'practice' as LearningPhase,
      taskType: 'exam_preparation' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },
    {
      id: `exam_4_${Date.now()}`,
      title: `Weak Area Targeted Remediation and Drilling`,
      text: `Identify and intensively practice weak areas identified in diagnostic assessment. Complete focused drills and exercises to strengthen understanding and improve performance in challenging topics.`,
      aiEstimatedDuration: isUrgent ? 120 : 180,
      difficulty: 'hard' as TaskDifficulty,
      order: 4,
      completed: false,
      skills: ['targeted practice', 'weakness remediation', 'focused improvement', 'skill strengthening'],
      recommendedResources: ['Targeted practice materials', 'Weakness-specific resources', 'Remedial exercises', 'Focused drill sets'],
      prerequisites: ['exam_3'],
      phase: 'practice' as LearningPhase,
      taskType: 'exam_preparation' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 3: APPLICATION (25%)
    {
      id: `exam_5_${Date.now()}`,
      title: `Full-Length Practice Exam Simulation`,
      text: `Complete multiple full-length practice exams under actual exam conditions. Simulate exact timing, environment, and pressure. Analyze performance and identify areas for final improvement.`,
      recommendedResources: ['Official practice exams', 'Exam simulation software', 'Timer applications', 'Performance analysis tools'],
      aiEstimatedDuration: isUrgent ? 240 : 300,
      difficulty: 'hard' as TaskDifficulty,
      order: 5,
      completed: false,
      skills: ['exam simulation', 'time management', 'stress management', 'performance analysis'],
      prerequisites: ['exam_4'],
      phase: 'application' as LearningPhase,
      taskType: 'exam_preparation' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 4: REFLECTION (10%)
    {
      id: `exam_6_${Date.now()}`,
      title: `Performance Analysis and Error Pattern Review`,
      text: `Analyze all practice exam results to identify recurring error patterns, time management issues, and knowledge gaps. Create targeted review plan for final preparation phase.`,
      recommendedResources: ['Performance tracking sheets', 'Error analysis frameworks', 'Review planning templates', 'Progress monitoring tools'],
      aiEstimatedDuration: isUrgent ? 60 : 90,
      difficulty: 'medium' as TaskDifficulty,
      order: 6,
      completed: false,
      skills: ['performance analysis', 'error identification', 'strategic review', 'improvement planning'],
      prerequisites: ['exam_5'],
      phase: 'reflection' as LearningPhase,
      taskType: 'exam_preparation' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 5: OUTPUT (5%)
    {
      id: `exam_7_${Date.now()}`,
      title: `Final Exam Readiness Assessment and Strategy Confirmation`,
      text: `Complete final practice exam to confirm readiness. Review test-taking strategies, time management techniques, and stress management approaches. Prepare mentally and logistically for exam day.`,
      recommendedResources: ['Final practice tests', 'Test-taking strategy guides', 'Stress management techniques', 'Exam day preparation checklists'],
      aiEstimatedDuration: isUrgent ? 120 : 180,
      difficulty: 'medium' as TaskDifficulty,
      order: 7,
      completed: false,
      skills: ['final assessment', 'strategy confirmation', 'mental preparation', 'exam readiness'],
      prerequisites: ['exam_6'],
      phase: 'output' as LearningPhase,
      taskType: 'exam_preparation' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 6: SPACED REPETITION REVIEW (Variable %)
    ...(dynamicRange.reviewStrategy.enabled ? [{
      id: `exam_8_${Date.now()}`,
      title: `Spaced Review: Key Concepts and Formulas`,
      text: `Review and practice key concepts, formulas, and problem-solving techniques using spaced repetition. Focus on long-term retention and quick recall for exam day.`,
      recommendedResources: ['Spaced repetition apps', 'Formula sheets', 'Concept review cards', 'Quick recall exercises'],
      aiEstimatedDuration: 45,
      difficulty: 'easy' as TaskDifficulty,
      order: 8,
      completed: false,
      skills: ['spaced repetition', 'long-term retention', 'quick recall', 'concept mastery'],
      prerequisites: ['exam_7'],
      phase: 'review' as LearningPhase,
      taskType: 'exam_preparation' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: initializeSpacedRepetition(),
      isReviewTask: true,
    }] : []),
  ];
}

function generateSkillLearningSubtasks(
  title: string, 
  description: string, 
  isUrgent: boolean, 
  currentProficiency: ProficiencyLevel,
  targetProficiency: ProficiencyLevel,
  dynamicRange: DynamicRangeCalculation
): EnhancedSubtask[] {
  const skill = title.replace(/learn|master|understand/gi, '').trim();
  
  return [
    // PHASE 1: KNOWLEDGE INPUT (20%)
    {
      id: `skill_1_${Date.now()}`,
      title: `Comprehensive ${skill} Skill Assessment and Learning Path Design`,
      text: `Complete detailed skill assessment evaluating current proficiency level in ${skill}. Research learning resources, identify skill prerequisites, and design personalized learning roadmap with clear milestones.`,
      recommendedResources: ['Skill assessment frameworks', 'Learning path templates', 'Industry skill standards', 'Professional competency models'],
      aiEstimatedDuration: isUrgent ? 90 : 120,
      difficulty: 'medium' as TaskDifficulty,
      order: 1,
      completed: false,
      skills: ['self-assessment', 'learning design', 'goal setting', 'resource planning'],
      prerequisites: [],
      phase: 'knowledge' as LearningPhase,
      taskType: 'skill_learning' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },
    {
      id: `skill_2_${Date.now()}`,
      title: `${skill} Fundamentals and Theoretical Foundation`,
      text: `Study core concepts, principles, and theoretical framework of ${skill}. Complete foundational courses and create comprehensive notes. Master essential terminology and basic concepts before advancing to practice.`,
      recommendedResources: ['University courses', 'Professional textbooks', 'Online learning platforms', 'Expert video lectures', 'Documentation and guides'],
      aiEstimatedDuration: isUrgent ? 180 : 300,
      difficulty: 'hard' as TaskDifficulty,
      order: 2,
      completed: false,
      skills: ['theoretical understanding', 'concept mastery', 'foundation building', 'note-taking'],
      prerequisites: ['skill_1'],
      phase: 'knowledge' as LearningPhase,
      taskType: 'skill_learning' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 2: PRACTICE (40%)
    {
      id: `skill_3_${Date.now()}`,
      title: `Guided ${skill} Practice: Basic to Intermediate Skills`,
      text: `Complete 50+ guided practice exercises in ${skill} with progressive difficulty. Focus on building muscle memory, developing technique, and gaining confidence through structured practice sessions.`,
      recommendedResources: ['Practice platforms', 'Exercise databases', 'Tutorial series', 'Skill-building tools', 'Progress tracking systems'],
      aiEstimatedDuration: isUrgent ? 240 : 360,
      difficulty: 'medium' as TaskDifficulty,
      order: 3,
      completed: false,
      skills: ['practical application', 'technique development', 'skill building', 'progressive learning'],
      prerequisites: ['skill_2'],
      phase: 'practice' as LearningPhase,
      taskType: 'skill_learning' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },
    {
      id: `skill_4_${Date.now()}`,
      title: `Advanced ${skill} Techniques and Complex Problem Solving`,
      text: `Practice advanced techniques and solve complex problems in ${skill}. Work on challenging projects that require integration of multiple concepts and creative problem-solving approaches.`,
      recommendedResources: ['Advanced tutorials', 'Complex project examples', 'Expert case studies', 'Professional tools', 'Community forums'],
      aiEstimatedDuration: isUrgent ? 300 : 480,
      difficulty: 'hard' as TaskDifficulty,
      order: 4,
      completed: false,
      skills: ['advanced techniques', 'complex problem solving', 'creative thinking', 'integration skills'],
      prerequisites: ['skill_3'],
      phase: 'practice' as LearningPhase,
      taskType: 'skill_learning' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 3: APPLICATION (25%)
    {
      id: `skill_5_${Date.now()}`,
      title: `Real-World ${skill} Project Development`,
      text: `Design and execute comprehensive real-world project applying ${skill} to solve authentic problem. Include project planning, implementation, testing, and documentation phases.`,
      recommendedResources: ['Project templates', 'Real-world datasets', 'Professional tools', 'Industry examples', 'Collaboration platforms'],
      aiEstimatedDuration: isUrgent ? 360 : 600,
      difficulty: 'hard' as TaskDifficulty,
      order: 5,
      completed: false,
      skills: ['project management', 'real-world application', 'problem solving', 'professional practice'],
      prerequisites: ['skill_4'],
      phase: 'application' as LearningPhase,
      taskType: 'skill_learning' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 4: REFLECTION (10%)
    {
      id: `skill_6_${Date.now()}`,
      title: `${skill} Mastery Assessment and Knowledge Consolidation`,
      text: `Conduct comprehensive self-assessment of ${skill} mastery. Review learning journey, consolidate knowledge through spaced repetition, and identify areas for continued improvement.`,
      recommendedResources: ['Mastery assessment tools', 'Spaced repetition systems', 'Reflection frameworks', 'Progress analytics'],
      aiEstimatedDuration: isUrgent ? 90 : 150,
      difficulty: 'medium' as TaskDifficulty,
      order: 6,
      completed: false,
      skills: ['self-reflection', 'knowledge consolidation', 'mastery assessment', 'continuous improvement'],
      prerequisites: ['skill_5'],
      phase: 'reflection' as LearningPhase,
      taskType: 'skill_learning' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 5: OUTPUT (5%)
    {
      id: `skill_7_${Date.now()}`,
      title: `Professional ${skill} Portfolio and Knowledge Sharing`,
      text: `Create comprehensive professional portfolio showcasing ${skill} mastery. Prepare presentation or teaching materials to share knowledge with others and demonstrate expertise.`,
      recommendedResources: ['Portfolio platforms', 'Presentation tools', 'Documentation templates', 'Knowledge sharing platforms'],
      aiEstimatedDuration: isUrgent ? 180 : 300,
      difficulty: 'hard' as TaskDifficulty,
      order: 7,
      completed: false,
      skills: ['portfolio development', 'knowledge sharing', 'professional presentation', 'expertise demonstration'],
      prerequisites: ['skill_6'],
      phase: 'output' as LearningPhase,
      taskType: 'skill_learning' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 6: SPACED REPETITION REVIEW (Variable %)
    ...(dynamicRange.reviewStrategy.enabled ? [{
      id: `skill_8_${Date.now()}`,
      title: `Spaced Review: Core ${skill} Concepts and Techniques`,
      text: `Review fundamental concepts and practice key techniques using spaced repetition methodology. Focus on long-term retention and skill maintenance.`,
      recommendedResources: ['Spaced repetition tools', 'Concept review materials', 'Practice exercises', 'Skill maintenance guides'],
      aiEstimatedDuration: 60,
      difficulty: 'medium' as TaskDifficulty,
      order: 8,
      completed: false,
      skills: ['spaced repetition', 'skill maintenance', 'long-term retention', 'concept review'],
      prerequisites: ['skill_7'],
      phase: 'review' as LearningPhase,
      taskType: 'skill_learning' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: initializeSpacedRepetition(),
      isReviewTask: true,
    }] : []),
  ];
}

function generateProjectSubtasks(
  title: string, 
  description: string, 
  isUrgent: boolean, 
  currentProficiency: ProficiencyLevel,
  targetProficiency: ProficiencyLevel,
  dynamicRange: DynamicRangeCalculation
): EnhancedSubtask[] {
  return [
    // PHASE 1: KNOWLEDGE INPUT (20%)
    {
      id: `project_1_${Date.now()}`,
      title: `Project Requirements Analysis and Stakeholder Assessment`,
      text: `Conduct comprehensive analysis of project requirements, stakeholder expectations, and success criteria. Document detailed specifications, constraints, and deliverable requirements.`,
      recommendedResources: ['Requirements gathering templates', 'Stakeholder analysis frameworks', 'Project specification tools', 'Success metrics guides'],
      aiEstimatedDuration: isUrgent ? 90 : 120,
      difficulty: 'medium' as TaskDifficulty,
      order: 1,
      completed: false,
      skills: ['requirements analysis', 'stakeholder management', 'project planning', 'specification documentation'],
      prerequisites: [],
      phase: 'knowledge' as LearningPhase,
      taskType: 'project_completion' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },
    {
      id: `project_2_${Date.now()}`,
      title: `Technical Architecture and Design Planning`,
      text: `Design technical architecture, system components, and implementation approach. Create detailed project plan with timeline, milestones, and resource allocation.`,
      recommendedResources: ['Architecture design tools', 'Project planning software', 'Design patterns', 'Technical documentation templates'],
      aiEstimatedDuration: isUrgent ? 120 : 180,
      difficulty: 'hard' as TaskDifficulty,
      order: 2,
      completed: false,
      skills: ['system design', 'architecture planning', 'technical documentation', 'project planning'],
      prerequisites: ['project_1'],
      phase: 'knowledge' as LearningPhase,
      taskType: 'project_completion' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 2: PRACTICE (40%)
    {
      id: `project_3_${Date.now()}`,
      title: `Core Implementation and Development`,
      text: `Implement core project functionality following design specifications. Focus on building main features and establishing solid foundation for the project.`,
      recommendedResources: ['Development tools', 'Code repositories', 'Implementation guides', 'Best practice documentation'],
      aiEstimatedDuration: isUrgent ? 300 : 480,
      difficulty: 'hard' as TaskDifficulty,
      order: 3,
      completed: false,
      skills: ['implementation', 'development', 'coding', 'feature building'],
      prerequisites: ['project_2'],
      phase: 'practice' as LearningPhase,
      taskType: 'project_completion' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },
    {
      id: `project_4_${Date.now()}`,
      title: `Testing and Quality Assurance`,
      text: `Implement comprehensive testing strategy including unit tests, integration tests, and user acceptance testing. Ensure quality standards and fix identified issues.`,
      recommendedResources: ['Testing frameworks', 'QA methodologies', 'Bug tracking tools', 'Quality standards documentation'],
      aiEstimatedDuration: isUrgent ? 180 : 240,
      difficulty: 'medium' as TaskDifficulty,
      order: 4,
      completed: false,
      skills: ['testing', 'quality assurance', 'debugging', 'validation'],
      prerequisites: ['project_3'],
      phase: 'practice' as LearningPhase,
      taskType: 'project_completion' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 3: APPLICATION (25%)
    {
      id: `project_5_${Date.now()}`,
      title: `Integration and Deployment`,
      text: `Integrate all project components and deploy to production environment. Configure monitoring, security, and performance optimization systems.`,
      recommendedResources: ['Deployment tools', 'Integration platforms', 'Monitoring systems', 'Security guides'],
      aiEstimatedDuration: isUrgent ? 240 : 360,
      difficulty: 'hard' as TaskDifficulty,
      order: 5,
      completed: false,
      skills: ['system integration', 'deployment', 'monitoring', 'optimization'],
      prerequisites: ['project_4'],
      phase: 'application' as LearningPhase,
      taskType: 'project_completion' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 4: REFLECTION (10%)
    {
      id: `project_6_${Date.now()}`,
      title: `Project Review and Performance Analysis`,
      text: `Conduct comprehensive project review, analyze outcomes against objectives, and document lessons learned. Identify best practices and improvement opportunities.`,
      recommendedResources: ['Review frameworks', 'Performance analysis tools', 'Lessons learned templates', 'Improvement methodologies'],
      aiEstimatedDuration: isUrgent ? 60 : 120,
      difficulty: 'medium' as TaskDifficulty,
      order: 6,
      completed: false,
      skills: ['project evaluation', 'performance analysis', 'lessons learned', 'continuous improvement'],
      prerequisites: ['project_5'],
      phase: 'reflection' as LearningPhase,
      taskType: 'project_completion' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 5: OUTPUT (5%)
    {
      id: `project_7_${Date.now()}`,
      title: `Final Deliverables and Stakeholder Handover`,
      text: `Prepare comprehensive final deliverables, documentation, and presentation materials. Conduct formal project closure and knowledge transfer sessions.`,
      recommendedResources: ['Documentation tools', 'Presentation software', 'Handover templates', 'Knowledge transfer guides'],
      aiEstimatedDuration: isUrgent ? 120 : 180,
      difficulty: 'medium' as TaskDifficulty,
      order: 7,
      completed: false,
      skills: ['deliverable preparation', 'stakeholder presentation', 'knowledge transfer', 'project closure'],
      prerequisites: ['project_6'],
      phase: 'output' as LearningPhase,
      taskType: 'project_completion' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },
  ];
}

function generateHabitBuildingSubtasks(
  title: string, 
  description: string, 
  isUrgent: boolean, 
  currentProficiency: ProficiencyLevel,
  targetProficiency: ProficiencyLevel,
  dynamicRange: DynamicRangeCalculation
): EnhancedSubtask[] {
  const habit = title.replace(/habit|daily|routine/gi, '').trim();
  
  return [
    // PHASE 1: KNOWLEDGE INPUT (20%)
    {
      id: `habit_1_${Date.now()}`,
      title: `Habit Design and Trigger Identification`,
      text: `Research habit formation science and design optimal habit structure. Identify specific triggers, rewards, and environmental cues that will support ${habit} habit development.`,
      recommendedResources: ['Habit formation research', 'Behavioral psychology guides', 'Habit stacking frameworks', 'Environmental design principles'],
      aiEstimatedDuration: isUrgent ? 60 : 90,
      difficulty: 'medium' as TaskDifficulty,
      order: 1,
      completed: false,
      skills: ['habit design', 'behavioral science', 'trigger identification', 'environmental planning'],
      prerequisites: [],
      phase: 'knowledge' as LearningPhase,
      taskType: 'habit_building' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },
    {
      id: `habit_2_${Date.now()}`,
      title: `Baseline Measurement and Goal Setting`,
      text: `Establish baseline measurements for ${habit} and set specific, measurable goals. Create tracking system and identify potential obstacles and solutions.`,
      recommendedResources: ['Goal setting frameworks', 'Measurement tools', 'Tracking applications', 'Obstacle identification guides'],
      aiEstimatedDuration: isUrgent ? 45 : 60,
      difficulty: 'easy' as TaskDifficulty,
      order: 2,
      completed: false,
      skills: ['goal setting', 'measurement', 'tracking setup', 'obstacle planning'],
      prerequisites: ['habit_1'],
      phase: 'knowledge' as LearningPhase,
      taskType: 'habit_building' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 2: PRACTICE (40%)
    {
      id: `habit_3_${Date.now()}`,
      title: `Initial Habit Implementation and Consistency Building`,
      text: `Begin daily practice of ${habit} with focus on consistency over perfection. Start with minimum viable habit and gradually increase intensity as routine becomes established.`,
      recommendedResources: ['Habit tracking apps', 'Consistency frameworks', 'Minimum viable habit guides', 'Daily routine templates'],
      aiEstimatedDuration: isUrgent ? 30 : 45,
      difficulty: 'medium' as TaskDifficulty,
      order: 3,
      completed: false,
      skills: ['consistency building', 'routine establishment', 'habit execution', 'progressive development'],
      prerequisites: ['habit_2'],
      phase: 'practice' as LearningPhase,
      taskType: 'habit_building' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },
    {
      id: `habit_4_${Date.now()}`,
      title: `Obstacle Navigation and Habit Optimization`,
      text: `Identify and overcome obstacles that interfere with ${habit} practice. Optimize habit timing, environment, and approach based on real-world experience and challenges.`,
      recommendedResources: ['Problem-solving frameworks', 'Habit optimization guides', 'Environmental modification tools', 'Adaptation strategies'],
      aiEstimatedDuration: isUrgent ? 60 : 90,
      difficulty: 'medium' as TaskDifficulty,
      order: 4,
      completed: false,
      skills: ['problem solving', 'adaptation', 'optimization', 'resilience building'],
      prerequisites: ['habit_3'],
      phase: 'practice' as LearningPhase,
      taskType: 'habit_building' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 3: APPLICATION (25%)
    {
      id: `habit_5_${Date.now()}`,
      title: `Habit Integration and Social Accountability`,
      text: `Integrate ${habit} into broader life routine and establish social accountability systems. Share progress with others and create support networks for long-term success.`,
      recommendedResources: ['Social accountability platforms', 'Community support groups', 'Integration strategies', 'Support network guides'],
      aiEstimatedDuration: isUrgent ? 90 : 120,
      difficulty: 'medium' as TaskDifficulty,
      order: 5,
      completed: false,
      skills: ['social integration', 'accountability', 'community building', 'support systems'],
      prerequisites: ['habit_4'],
      phase: 'application' as LearningPhase,
      taskType: 'habit_building' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 4: REFLECTION (10%)
    {
      id: `habit_6_${Date.now()}`,
      title: `Progress Analysis and Habit Refinement`,
      text: `Analyze habit progress data, identify patterns and trends, and refine approach for optimal long-term sustainability. Document lessons learned and success strategies.`,
      recommendedResources: ['Progress analysis tools', 'Data visualization platforms', 'Reflection frameworks', 'Habit refinement guides'],
      aiEstimatedDuration: isUrgent ? 45 : 60,
      difficulty: 'medium' as TaskDifficulty,
      order: 6,
      completed: false,
      skills: ['data analysis', 'pattern recognition', 'refinement', 'strategic thinking'],
      prerequisites: ['habit_5'],
      phase: 'reflection' as LearningPhase,
      taskType: 'habit_building' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 5: OUTPUT (5%)
    {
      id: `habit_7_${Date.now()}`,
      title: `Long-term Sustainability Plan and Habit Mastery`,
      text: `Create comprehensive long-term sustainability plan for ${habit}. Document habit mastery journey and prepare to help others develop similar habits.`,
      recommendedResources: ['Sustainability planning tools', 'Mastery documentation templates', 'Teaching frameworks', 'Knowledge sharing platforms'],
      aiEstimatedDuration: isUrgent ? 60 : 90,
      difficulty: 'medium' as TaskDifficulty,
      order: 7,
      completed: false,
      skills: ['sustainability planning', 'mastery documentation', 'knowledge sharing', 'teaching'],
      prerequisites: ['habit_6'],
      phase: 'output' as LearningPhase,
      taskType: 'habit_building' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },
  ];
}

function generateChallengeSubtasks(
  title: string, 
  description: string, 
  isUrgent: boolean, 
  currentProficiency: ProficiencyLevel,
  targetProficiency: ProficiencyLevel,
  dynamicRange: DynamicRangeCalculation
): EnhancedSubtask[] {
  const challenge = title.replace(/challenge|goal|achieve/gi, '').trim();
  
  return [
    // PHASE 1: KNOWLEDGE INPUT (20%)
    {
      id: `challenge_1_${Date.now()}`,
      title: `Challenge Analysis and Strategy Development`,
      text: `Analyze ${challenge} challenge requirements, rules, and success criteria. Research optimal strategies, study successful approaches, and develop personalized action plan.`,
      recommendedResources: ['Challenge documentation', 'Strategy guides', 'Success case studies', 'Expert analysis', 'Planning frameworks'],
      aiEstimatedDuration: isUrgent ? 90 : 120,
      difficulty: 'medium' as TaskDifficulty,
      order: 1,
      completed: false,
      skills: ['strategic analysis', 'planning', 'research', 'goal setting'],
      prerequisites: [],
      phase: 'knowledge' as LearningPhase,
      taskType: 'challenge' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },
    {
      id: `challenge_2_${Date.now()}`,
      title: `Baseline Assessment and Performance Metrics`,
      text: `Establish current performance baseline for ${challenge} and define specific metrics for tracking progress. Set up measurement systems and monitoring tools.`,
      recommendedResources: ['Assessment tools', 'Performance metrics', 'Tracking systems', 'Measurement frameworks', 'Progress monitoring apps'],
      aiEstimatedDuration: isUrgent ? 60 : 90,
      difficulty: 'medium' as TaskDifficulty,
      order: 2,
      completed: false,
      skills: ['assessment', 'metrics definition', 'tracking setup', 'baseline establishment'],
      prerequisites: ['challenge_1'],
      phase: 'knowledge' as LearningPhase,
      taskType: 'challenge' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 2: PRACTICE (40%)
    {
      id: `challenge_3_${Date.now()}`,
      title: `Skill Development and Training Regimen`,
      text: `Implement systematic training regimen to develop skills required for ${challenge}. Focus on progressive improvement and consistent practice with regular performance assessments.`,
      recommendedResources: ['Training programs', 'Skill development guides', 'Practice schedules', 'Performance improvement tools'],
      aiEstimatedDuration: isUrgent ? 240 : 360,
      difficulty: 'hard' as TaskDifficulty,
      order: 3,
      completed: false,
      skills: ['skill development', 'training', 'progressive improvement', 'performance optimization'],
      prerequisites: ['challenge_2'],
      phase: 'practice' as LearningPhase,
      taskType: 'challenge' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },
    {
      id: `challenge_4_${Date.now()}`,
      title: `Performance Testing and Optimization`,
      text: `Conduct regular performance tests under challenge conditions. Identify weaknesses, optimize techniques, and refine approach based on test results and feedback.`,
      recommendedResources: ['Testing protocols', 'Performance analysis tools', 'Optimization techniques', 'Feedback systems'],
      aiEstimatedDuration: isUrgent ? 180 : 240,
      difficulty: 'hard' as TaskDifficulty,
      order: 4,
      completed: false,
      skills: ['performance testing', 'optimization', 'analysis', 'technique refinement'],
      prerequisites: ['challenge_3'],
      phase: 'practice' as LearningPhase,
      taskType: 'challenge' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 3: APPLICATION (25%)
    {
      id: `challenge_5_${Date.now()}`,
      title: `Challenge Execution and Performance Monitoring`,
      text: `Execute ${challenge} with full commitment while monitoring performance in real-time. Apply all learned strategies and techniques to achieve optimal results.`,
      recommendedResources: ['Execution strategies', 'Real-time monitoring tools', 'Performance tracking', 'Strategy implementation guides'],
      aiEstimatedDuration: isUrgent ? 180 : 300,
      difficulty: 'hard' as TaskDifficulty,
      order: 5,
      completed: false,
      skills: ['challenge execution', 'real-time monitoring', 'strategy application', 'performance management'],
      prerequisites: ['challenge_4'],
      phase: 'application' as LearningPhase,
      taskType: 'challenge' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 4: REFLECTION (10%)
    {
      id: `challenge_6_${Date.now()}`,
      title: `Results Analysis and Performance Review`,
      text: `Analyze challenge results, compare against goals and baseline, and identify factors that contributed to success or areas for improvement. Document lessons learned.`,
      recommendedResources: ['Results analysis tools', 'Performance comparison frameworks', 'Reflection guides', 'Improvement identification methods'],
      aiEstimatedDuration: isUrgent ? 60 : 90,
      difficulty: 'medium' as TaskDifficulty,
      order: 6,
      completed: false,
      skills: ['results analysis', 'performance review', 'reflection', 'improvement identification'],
      prerequisites: ['challenge_5'],
      phase: 'reflection' as LearningPhase,
      taskType: 'challenge' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 5: OUTPUT (5%)
    {
      id: `challenge_7_${Date.now()}`,
      title: `Achievement Documentation and Future Goal Setting`,
      text: `Document ${challenge} achievement, celebrate success, and share experience with others. Set new challenges and goals based on lessons learned and improved capabilities.`,
      recommendedResources: ['Documentation tools', 'Achievement tracking', 'Goal setting frameworks', 'Sharing platforms', 'Celebration guides'],
      aiEstimatedDuration: isUrgent ? 90 : 120,
      difficulty: 'medium' as TaskDifficulty,
      order: 7,
      completed: false,
      skills: ['achievement documentation', 'goal setting', 'knowledge sharing', 'celebration'],
      prerequisites: ['challenge_6'],
      phase: 'output' as LearningPhase,
      taskType: 'challenge' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },
  ];
}

function generateGeneralSubtasks(
  title: string, 
  description: string, 
  isUrgent: boolean, 
  currentProficiency: ProficiencyLevel,
  targetProficiency: ProficiencyLevel,
  dynamicRange: DynamicRangeCalculation
): EnhancedSubtask[] {
  return [
    // PHASE 1: KNOWLEDGE INPUT (20%)
    {
      id: `general_1_${Date.now()}`,
      title: `Task Analysis and Requirement Gathering`,
      text: `Analyze task requirements, objectives, and success criteria. Gather all necessary information and resources needed to complete the task effectively.`,
      recommendedResources: ['Task analysis frameworks', 'Requirement gathering templates', 'Information sources', 'Resource identification guides'],
      aiEstimatedDuration: isUrgent ? 60 : 90,
      difficulty: 'medium' as TaskDifficulty,
      order: 1,
      completed: false,
      skills: ['analysis', 'requirement gathering', 'planning', 'resource identification'],
      prerequisites: [],
      phase: 'knowledge' as LearningPhase,
      taskType: 'general' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },
    {
      id: `general_2_${Date.now()}`,
      title: `Planning and Preparation`,
      text: `Create detailed plan for task execution including timeline, milestones, and resource allocation. Prepare all necessary tools and materials for implementation.`,
      recommendedResources: ['Planning tools', 'Project templates', 'Resource preparation guides', 'Timeline frameworks'],
      aiEstimatedDuration: isUrgent ? 90 : 120,
      difficulty: 'medium' as TaskDifficulty,
      order: 2,
      completed: false,
      skills: ['planning', 'preparation', 'organization', 'resource management'],
      prerequisites: ['general_1'],
      phase: 'knowledge' as LearningPhase,
      taskType: 'general' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 2: PRACTICE (40%)
    {
      id: `general_3_${Date.now()}`,
      title: `Initial Implementation and Testing`,
      text: `Begin task implementation with focus on establishing solid foundation. Test approaches and methods to ensure they work effectively before full execution.`,
      recommendedResources: ['Implementation guides', 'Testing frameworks', 'Best practices', 'Quality standards'],
      aiEstimatedDuration: isUrgent ? 180 : 240,
      difficulty: 'medium' as TaskDifficulty,
      order: 3,
      completed: false,
      skills: ['implementation', 'testing', 'execution', 'quality control'],
      prerequisites: ['general_2'],
      phase: 'practice' as LearningPhase,
      taskType: 'general' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },
    {
      id: `general_4_${Date.now()}`,
      title: `Iterative Development and Refinement`,
      text: `Continue task development with iterative improvements. Refine approach based on feedback and results, making adjustments as needed for optimal outcomes.`,
      recommendedResources: ['Iterative development guides', 'Feedback systems', 'Improvement methodologies', 'Refinement techniques'],
      aiEstimatedDuration: isUrgent ? 240 : 360,
      difficulty: 'hard' as TaskDifficulty,
      order: 4,
      completed: false,
      skills: ['iterative development', 'refinement', 'improvement', 'adaptation'],
      prerequisites: ['general_3'],
      phase: 'practice' as LearningPhase,
      taskType: 'general' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 3: APPLICATION (25%)
    {
      id: `general_5_${Date.now()}`,
      title: `Full Execution and Quality Assurance`,
      text: `Execute complete task with full attention to quality and detail. Ensure all requirements are met and deliverables meet expected standards.`,
      recommendedResources: ['Execution frameworks', 'Quality assurance tools', 'Standards documentation', 'Validation methods'],
      aiEstimatedDuration: isUrgent ? 300 : 480,
      difficulty: 'hard' as TaskDifficulty,
      order: 5,
      completed: false,
      skills: ['full execution', 'quality assurance', 'standards compliance', 'validation'],
      prerequisites: ['general_4'],
      phase: 'application' as LearningPhase,
      taskType: 'general' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 4: REFLECTION (10%)
    {
      id: `general_6_${Date.now()}`,
      title: `Review and Evaluation`,
      text: `Review completed task against original objectives and requirements. Evaluate success, identify lessons learned, and document best practices for future reference.`,
      recommendedResources: ['Review frameworks', 'Evaluation criteria', 'Lessons learned templates', 'Best practice documentation'],
      aiEstimatedDuration: isUrgent ? 60 : 90,
      difficulty: 'medium' as TaskDifficulty,
      order: 6,
      completed: false,
      skills: ['review', 'evaluation', 'reflection', 'documentation'],
      prerequisites: ['general_5'],
      phase: 'reflection' as LearningPhase,
      taskType: 'general' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },

    // PHASE 5: OUTPUT (5%)
    {
      id: `general_7_${Date.now()}`,
      title: `Final Delivery and Documentation`,
      text: `Prepare final deliverables and comprehensive documentation. Ensure all outputs are properly formatted and ready for delivery or presentation.`,
      recommendedResources: ['Delivery templates', 'Documentation tools', 'Presentation software', 'Final review checklists'],
      aiEstimatedDuration: isUrgent ? 90 : 120,
      difficulty: 'medium' as TaskDifficulty,
      order: 7,
      completed: false,
      skills: ['final delivery', 'documentation', 'presentation', 'completion'],
      prerequisites: ['general_6'],
      phase: 'output' as LearningPhase,
      taskType: 'general' as const,
      proficiencyLevel: currentProficiency,
      targetProficiency: targetProficiency,
      learningPace: dynamicRange.recommendedPace,
      reviewStatus: "not_started" as ReviewStatus,
      spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
    },
  ];
}

/**
 * Generate intelligent, personalized learning plan using LLM-powered analysis
 * Replaces hard-coded action plan logic with adaptive, context-driven planning
 * @param title - Task title
 * @param description - Task description
 * @param clarificationResponses - User's personalization responses
 * @param dueDate - Optional deadline for time-aware planning
 * @param currentProficiency - User's current skill level
 * @param targetProficiency - Target skill level to achieve
 * @param language - Output language preference
 * @returns Promise<LearningPlan | null> - AI-generated personalized action plan
 */
export async function generateLearningPlan(
  title: string, 
  description: string, 
  clarificationResponses?: Record<string, string>,
  dueDate?: string,
  currentProficiency?: ProficiencyLevel,
  targetProficiency?: ProficiencyLevel,
  language: "en" | "zh" = "en"
): Promise<LearningPlan | null> {
  console.warn('⚠️ DEPRECATED: generateLearningPlan() exposes API keys. Use backend APIs instead.');
  
  try {
    // Auto-detect task type using enhanced detection
    const taskType = detectTaskType(title, description);
    
    // Extract proficiency levels if not provided
    let proficiencyContext = { current: currentProficiency, target: targetProficiency };
    if (!currentProficiency || !targetProficiency) {
      const extracted = extractProficiencyFromResponses(clarificationResponses);
      proficiencyContext.current = currentProficiency || extracted.current;
      proficiencyContext.target = targetProficiency || extracted.target;
    }

    // Calculate time context and constraints
    let timeContext = "";
    let availableDays = 0;
    if (dueDate) {
      const today = new Date();
      const targetDate = new Date(dueDate);
      availableDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (availableDays > 0) {
        timeContext = `Time available: ${availableDays} days until ${dueDate}`;
      } else {
        timeContext = `URGENT: Due date is today or has passed`;
      }
    }

    // Calculate dynamic range for intelligent planning
    const dynamicRange = calculateAdvancedDynamicRange(
      proficiencyContext.current!,
      proficiencyContext.target!,
      availableDays,
      taskType,
      clarificationResponses?.goal,
      clarificationResponses?.constraints
    );

    // Construct personalization context
    const personalizationContext = clarificationResponses && Object.keys(clarificationResponses).length > 0
      ? Object.entries(clarificationResponses)
          .map(([question, answer]) => `${question}: ${answer}`)
          .join('\n')
      : 'No specific personalization context provided';

    const systemPrompts = {
      en: {
        role: "You are an expert learning consultant and curriculum designer who creates highly personalized, effective learning experiences.",
        instruction: "Create a comprehensive, intelligent learning plan",
        focus: getTaskTypeSpecificPrompt(taskType, language)
      },
      zh: {
        role: "您是一位專業的學習顧問和課程設計師，專門創建高度個人化、有效的學習體驗。",
        instruction: "創建一個全面、智慧的學習計劃",
        focus: getTaskTypeSpecificPrompt(taskType, language)
      }
    };

    const prompts = systemPrompts[language];

  const messages: CoreMessage[] = [
    {
      role: 'system',
        content: `${prompts.role}

${prompts.instruction} that leverages all available context for maximum personalization and effectiveness.

## Task Analysis:
- Task Type: ${taskType.toUpperCase()}
- ${prompts.focus}

## Proficiency Assessment:
- Current Level: ${proficiencyContext.current}
- Target Level: ${proficiencyContext.target}
- Proficiency Gap: ${dynamicRange.proficiencyGap}
- Recommended Learning Pace: ${dynamicRange.recommendedPace}

## Time & Priority Context:
${timeContext || 'No specific deadline - focus on comprehensive mastery'}

## Intelligent Adaptations:
- Priority Focus Areas: ${dynamicRange.priorityFocus.join(', ')}
- Total Learning Hours: ${dynamicRange.timeAllocation.totalHours}
- Daily Time Commitment: ${dynamicRange.timeAllocation.dailyHours} hours
- Optimal Subtask Count: ${dynamicRange.subtaskCount.optimal}
${dynamicRange.skipTopics?.length ? `- Skip Topics (time constraints): ${dynamicRange.skipTopics.join(', ')}` : ''}

## Phase Distribution (follow precisely):
${Object.entries(dynamicRange.phaseAdjustments).map(([phase, percentage]) => 
  `- ${phase.charAt(0).toUpperCase() + phase.slice(1)}: ${Math.round(percentage)}%`
).join('\n')}

## Difficulty Distribution:
- Easy tasks: ${dynamicRange.difficultyDistribution.easy}%
- Medium tasks: ${dynamicRange.difficultyDistribution.medium}%  
- Hard tasks: ${dynamicRange.difficultyDistribution.hard}%

${language === 'zh' ? `
## 繁體中文輸出格式要求：
返回包含以下欄位的JSON物件：
- achievableGoal: string（可達成的具體目標）
- recommendedTools: string[]（推薦工具和資源）
- checkpoints: string[]（可測量的里程碑）
- skillBreakdown: object[]（技能分解）
- estimatedTimeToCompletion: number（預估完成時間，小時）
- taskType: "${taskType}"
- currentProficiency: "${proficiencyContext.current}"
- targetProficiency: "${proficiencyContext.target}"
- learningPace: "${dynamicRange.recommendedPace}"
- timeConstraint: string
- proficiencyGap: "${dynamicRange.proficiencyGap}"
- reviewSchedule: object（複習排程設定）

確保所有內容都使用繁體中文。
` : `
## English Output Format Requirements:
Return a JSON object with these fields:
- achievableGoal: string (specific, achievable goal)
- recommendedTools: string[] (specific tools and resources)
- checkpoints: string[] (measurable milestones)
- skillBreakdown: object[] (skill breakdown with current/target levels)
- estimatedTimeToCompletion: number (estimated hours to completion)
- taskType: "${taskType}"
- currentProficiency: "${proficiencyContext.current}"
- targetProficiency: "${proficiencyContext.target}"
- learningPace: "${dynamicRange.recommendedPace}"
- timeConstraint: string
- proficiencyGap: "${dynamicRange.proficiencyGap}"
- reviewSchedule: object (review schedule configuration)

Ensure all content is in English.
`}

## Critical Requirements:
1. Create ONE focused, achievable goal (not multiple goals)
2. Recommend 3-5 specific, high-quality tools/resources
3. Define 3-7 measurable checkpoints for progress tracking
4. Include realistic time estimates based on proficiency gap
5. Adapt complexity and approach to the user's current level
6. Integrate spaced repetition strategy for retention
7. Account for available time and constraints

IMPORTANT: Return ONLY the JSON object, no markdown formatting or extra text.`
    },
    {
      role: 'user',
        content: `Task: "${title}"
Description: "${description}"

## Personalization Context:
${personalizationContext}

${language === 'zh' 
  ? `請基於上述背景資訊創建一個高度個人化的學習計劃。重點關注可實現的目標和實際的進度安排。`
  : `Create a highly personalized learning plan based on the above context. Focus on achievable goals and practical progression.`}

Return as JSON object only.`
      }
    ];

    const response = await makeAIRequest(messages);
    const parsed = parseAIResponse(response);
    
    // Enhance the parsed plan with additional intelligent fields
    if (parsed) {
      // Set intelligent defaults based on analysis
      parsed.taskType = taskType;
      parsed.currentProficiency = proficiencyContext.current;
      parsed.targetProficiency = proficiencyContext.target;
      parsed.learningPace = dynamicRange.recommendedPace;
      parsed.proficiencyGap = dynamicRange.proficiencyGap;
      
      // Set time constraint level
      if (availableDays <= 7) {
        parsed.timeConstraint = "urgent";
      } else if (availableDays <= 30) {
        parsed.timeConstraint = "moderate";
      } else if (availableDays <= 90) {
        parsed.timeConstraint = "extended";
    } else {
        parsed.timeConstraint = "none";
    }
    
      // Configure intelligent review schedule
    parsed.reviewSchedule = {
      enabled: taskType === "skill_learning" || taskType === "exam_preparation",
        frequency: dynamicRange.reviewStrategy.enabled ? 
          (availableDays <= 14 ? "daily" : availableDays <= 60 ? "weekly" : "biweekly") : "weekly",
        reviewPercentage: dynamicRange.reviewStrategy.reviewPercentage || 20
      };
      
      // Add phase distribution for reference
      parsed.phaseDistribution = dynamicRange.phaseAdjustments;
      
      // Ensure estimated time is realistic
      parsed.estimatedTimeToCompletion = parsed.estimatedTimeToCompletion || dynamicRange.timeAllocation.totalHours;
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to generate intelligent learning plan:', error);
    return null;
  }
}

export async function estimateTaskDuration(
  title: string, 
  description: string, 
  difficulty?: string, 
  subtasks?: any[]
): Promise<number> {
  if (subtasks && subtasks.length > 0) {
    // Calculate from subtasks
    const totalSubtaskTime = subtasks.reduce((total, subtask) => {
      return total + (subtask.userEstimatedDuration || subtask.aiEstimatedDuration || 60);
    }, 0);
    return Math.round(totalSubtaskTime * 1.1); // Add 10% buffer
  }

  const messages: CoreMessage[] = [
    {
      role: 'system',
      content: `You are a time estimation expert. Estimate realistic duration for tasks in minutes based on complexity and scope.

Consider:
- Task complexity and cognitive load
- Typical time for similar tasks
- Difficulty level and learning curve
- Include time for breaks and transitions
- Account for research, practice, and review time

ESTIMATION GUIDELINES:
- Simple tasks (reading, setup): 15-60 minutes
- Moderate tasks (practice, exercises): 30-180 minutes  
- Complex tasks (creation, projects): 60-480 minutes
- Learning tasks: Add 25% extra time for comprehension

Return only a number (minutes). Be realistic and practical.`
    },
    {
      role: 'user',
      content: `Task: ${title}
Description: ${description}
Difficulty: ${difficulty || 'not specified'}

Estimate duration in minutes:`
    }
  ];

  try {
    const response = await makeAIRequest(messages);
    const duration = parseInt(response.trim());
    return isNaN(duration) ? 120 : Math.max(15, Math.min(480, duration)); // 15 min to 8 hours
  } catch (error) {
    console.error('Failed to estimate task duration:', error);
    return 120; // Default 2 hours
  }
}

export async function estimateSubtaskDuration(subtaskText: string, difficulty?: string): Promise<number> {
  const messages: CoreMessage[] = [
    {
      role: 'system',
      content: `Estimate realistic duration for this specific subtask in minutes. Consider the scope, complexity, and cognitive load required.

GUIDELINES:
- Easy tasks (setup, reading, simple exercises): 15-60 minutes
- Medium tasks (practice, analysis, moderate projects): 30-180 minutes  
- Hard tasks (creation, complex problem-solving, advanced projects): 60-360 minutes

Consider:
- Cognitive complexity and mental effort required
- Time for setup, execution, and review
- Learning curve if new concepts are involved
- Realistic pace for quality work

Return only a number (minutes).`
    },
    {
      role: 'user',
      content: `Subtask: ${subtaskText}
Difficulty: ${difficulty || 'medium'}

Duration in minutes:`
    }
  ];

  try {
    const response = await makeAIRequest(messages);
    const duration = parseInt(response.trim());
    return isNaN(duration) ? 60 : Math.max(15, Math.min(360, duration)); // 15 min to 6 hours
  } catch (error) {
    console.error('Failed to estimate subtask duration:', error);
    return 60; // Default 1 hour
  }
}

export async function generateLearningQuestions(summary: string): Promise<string[]> {
  const messages: CoreMessage[] = [
    {
      role: 'system',
      content: `You are a learning reinforcement expert. Generate thoughtful review questions based on the learning summary.

Create 3-5 questions that:
- Test understanding of key concepts
- Encourage deeper thinking
- Help reinforce learning
- Are specific to the content learned

Return as a JSON array of strings (just the questions).

IMPORTANT: Return ONLY the JSON array, no markdown formatting or extra text.`
    },
    {
      role: 'user',
      content: `Learning Summary: ${summary}

Generate review questions as JSON array:`
    }
  ];

  try {
    const response = await makeAIRequest(messages);
    const parsed = parseAIResponse(response);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to generate learning questions:', error);
    return [];
  }
}

export async function generateProductivityTips(stats: any): Promise<string[]> {
  const messages: CoreMessage[] = [
    {
      role: 'system',
      content: `You are a productivity expert. Generate personalized productivity tips based on user statistics.

Create 3-5 actionable tips that:
- Are specific to the user's current performance
- Address areas for improvement
- Are practical and achievable
- Help optimize focus and productivity

Return as a JSON array of strings (just the tips).

IMPORTANT: Return ONLY the JSON array, no markdown formatting or extra text.`
    },
    {
      role: 'user',
      content: `User Statistics:
Focus Time: ${stats.focusTime} minutes this week
Tasks Completed: ${stats.tasksCompleted}
Average Session Duration: ${stats.averageSessionDuration} minutes
Distractions: ${stats.distractions}

Generate personalized productivity tips as JSON array:`
    }
  ];

  try {
    const response = await makeAIRequest(messages);
    const parsed = parseAIResponse(response);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to generate productivity tips:', error);
    return [];
  }
}

export function compileMarkdownNotes(
  taskTitle: string,
  summary: string,
  qaList: Array<{ question: string; answer: string }>,
  duration: number
): string {
  const date = new Date().toLocaleDateString();
  const durationText = `${Math.floor(duration / 60)}h ${duration % 60}m`;
  
  let markdown = `# Learning Notes: ${taskTitle}

**Date:** ${date}  
**Duration:** ${durationText}

## Summary

${summary}

`;

  if (qaList.length > 0) {
    markdown += `## Review Questions & Answers

`;
    qaList.forEach((qa, index) => {
      markdown += `### ${index + 1}. ${qa.question}

${qa.answer}

`;
    });
  }

  markdown += `## Key Takeaways

- [Add your key insights here]
- [What would you do differently next time?]
- [How will you apply this learning?]

---
*Generated by FocusFlow Learning Assistant*`;

  return markdown;
}

// Add translation functionality for existing tasks
/**
 * @deprecated SECURITY RISK: This function uses makeAIRequest() which exposes API keys in frontend
 * TODO: Create backend API endpoint /translate-tasks for secure translation
 * Use backend API endpoints from utils/api.ts instead.
 */
export async function translateTaskContent(
  tasks: Task[],
  targetLanguage: "en" | "zh"
): Promise<Task[]> {
  console.warn('⚠️ DEPRECATED: translateTaskContent() exposes API keys. Create backend translation API instead.');
  const languagePrompts = {
    en: {
      systemPrompt: "You are a professional translator specializing in educational content translation. Translate the following task content to English while preserving the original meaning, structure, and educational value.",
      instruction: "Translate all task content to English"
    },
    zh: {
      systemPrompt: "您是一位專業的教育內容翻譯專家。請將以下任務內容翻譯成繁體中文，同時保持原文的含義、結構和教育價值。",
      instruction: "將所有任務內容翻譯成繁體中文"
    }
  };

  const prompts = languagePrompts[targetLanguage];

  const translatedTasks: Task[] = [];

  for (const task of tasks) {
    try {
      // Skip translation if no subtasks or already in target language
      if (!task.subtasks || task.subtasks.length === 0) {
        translatedTasks.push(task);
        continue;
      }

      // Prepare content for translation
      const contentToTranslate = {
        title: task.title,
        description: task.description,
        subtasks: task.subtasks.map(subtask => ({
          id: subtask.id,
          title: subtask.title,
          text: subtask.text,
          skills: subtask.skills,
          recommendedResources: subtask.recommendedResources,
          phase: subtask.phase
        }))
      };

      const messages: CoreMessage[] = [
        {
          role: 'system',
          content: `${prompts.systemPrompt}

${prompts.instruction}. Return the translated content as JSON with the exact same structure as the input.

CRITICAL REQUIREMENTS:
- Maintain the exact same JSON structure
- Translate titles, descriptions, and text content
- Translate skill names appropriately
- Translate phase names to: ${targetLanguage === 'zh' ? '"知識", "練習", "應用", "反思", "產出", "複習"' : '"knowledge", "practice", "application", "reflection", "output", "review"'}
- Keep all IDs unchanged
- Preserve educational terminology and accuracy
- Keep recommended resources (translate descriptions if needed)

Return ONLY the JSON object, no markdown formatting.`
        },
        {
          role: 'user',
          content: `${targetLanguage === 'zh' 
            ? `請將以下任務內容翻譯成繁體中文：\n\n${JSON.stringify(contentToTranslate, null, 2)}`
            : `Please translate the following task content to English:\n\n${JSON.stringify(contentToTranslate, null, 2)}`}`
        }
      ];

      const response = await makeAIRequest(messages);
      const translatedContent = parseAIResponse(response);

      // Update the task with translated content
      const translatedTask: Task = {
        ...task,
        title: translatedContent.title || task.title,
        description: translatedContent.description || task.description,
        subtasks: task.subtasks.map((originalSubtask, index) => {
          const translatedSubtask = translatedContent.subtasks?.[index];
          return {
            ...originalSubtask,
            title: translatedSubtask?.title || originalSubtask.title,
            text: translatedSubtask?.text || originalSubtask.text,
            skills: translatedSubtask?.skills || originalSubtask.skills,
            recommendedResources: translatedSubtask?.recommendedResources || originalSubtask.recommendedResources,
            phase: translatedSubtask?.phase || originalSubtask.phase
          };
        })
      };

      translatedTasks.push(translatedTask);
    } catch (error) {
      console.error(`Failed to translate task ${task.id}:`, error);
      // Return original task if translation fails
      translatedTasks.push(task);
    }
  }

  return translatedTasks;
}

// Translate individual subtasks
export async function translateSubtasks(
  subtasks: EnhancedSubtask[],
  targetLanguage: "en" | "zh"
): Promise<EnhancedSubtask[]> {
  const languagePrompts = {
    en: {
      systemPrompt: "Translate the following subtask content to English while preserving educational value and structure.",
      instruction: "Translate to English"
    },
    zh: {
      systemPrompt: "將以下子任務內容翻譯成繁體中文，同時保持教育價值和結構。",
      instruction: "翻譯成繁體中文"
    }
  };

  const prompts = languagePrompts[targetLanguage];

  try {
    const contentToTranslate = subtasks.map(subtask => ({
      id: subtask.id,
      title: subtask.title,
      text: subtask.text,
      skills: subtask.skills,
      recommendedResources: subtask.recommendedResources,
      phase: subtask.phase
    }));

    const messages: CoreMessage[] = [
      {
        role: 'system',
        content: `${prompts.systemPrompt}

${prompts.instruction}. Return as JSON array with same structure.

Translate:
- titles and text content
- skill names
- phase names to: ${targetLanguage === 'zh' ? '"知識", "練習", "應用", "反思", "產出", "複習"' : '"knowledge", "practice", "application", "reflection", "output", "review"'}

Keep IDs unchanged. Return ONLY JSON array.`
      },
      {
        role: 'user',
        content: JSON.stringify(contentToTranslate, null, 2)
      }
    ];

    const response = await makeAIRequest(messages);
    const translatedContent = parseAIResponse(response);

    return subtasks.map((originalSubtask, index) => {
      const translated = translatedContent[index];
      return {
        ...originalSubtask,
        title: translated?.title || originalSubtask.title,
        text: translated?.text || originalSubtask.text,
        skills: translated?.skills || originalSubtask.skills,
        recommendedResources: translated?.recommendedResources || originalSubtask.recommendedResources,
        phase: translated?.phase || originalSubtask.phase
      };
    });
  } catch (error) {
    console.error('Failed to translate subtasks:', error);
    return subtasks;
  }
}

// 商業級任務生成相關接口
export interface CommercialSubtask extends EnhancedSubtask {
  // 階層結構
  level: number; // 1=主要階段, 2=詳細任務, 3=操作步驟
  parentId?: string;
  childrenIds: string[];
  
  // 商業化增強字段
  deliverables: string[]; // 明確的交付物
  acceptanceCriteria: string[]; // 驗收標準
  dependencies: string[]; // 依賴的其他子任務ID
  risks: string[]; // 潛在風險
  mitigation: string[]; // 風險緩解措施
  requiredTools: string[]; // 必需的工具/軟件
  resourceLinks: string[]; // 具體的資源鏈接
  
  // 時間分配建議
  suggestedTimeSlots: string[]; // 建議的時間段類型 (morning/afternoon/evening)
  optimalDuration: number; // 最佳學習時長
  breakFrequency: number; // 建議的休息頻率（分鐘）
  
  // 商業指標
  businessValue: number; // 1-10，業務價值評分
  learningCurve: "steep" | "moderate" | "gentle"; // 學習曲線
  practicalApplication: string; // 實際應用場景
}

export interface TaskHierarchy {
  phases: CommercialSubtask[]; // 第1層：主要階段
  detailedTasks: CommercialSubtask[]; // 第2層：詳細任務
  operationalSteps: CommercialSubtask[]; // 第3層：操作步驟
}

export interface SchedulingSuggestion {
  subtaskId: string;
  recommendedDate: string;
  recommendedTimeSlot: TimeSlot;
  reasoning: string;
  alternativeSlots: Array<{
    date: string;
    timeSlot: TimeSlot;
    preference: "optimal" | "good" | "acceptable";
  }>;
  warnings?: string[];
}

export interface TimeConstraintAnalysis {
  totalAvailableHours: number;
  weeklyAvailableHours: number;
  dailyAverageHours: number;
  availableDays: number;
  urgencyLevel: "critical" | "high" | "moderate" | "relaxed";
  feasibilityScore: number; // 0-1, 可行性評分
  timeDistribution: {
    morning: number;   // 早上可用小時數
    afternoon: number; // 下午可用小時數
    evening: number;   // 晚上可用小時數
  };
  recommendations: string[];
  warnings: string[];
}

export interface CommercialTaskContext {
  title: string;
  description: string;
  dueDate?: string;
  availableTimeSlots: DayTimeSlots;
  userProficiency: ProficiencyLevel;
  targetProficiency: ProficiencyLevel;
  focusAreas?: string[];
  businessContext?: string;
  successMetrics?: string[];
  constraints?: string[];
  language: "en" | "zh";
}

export interface CommercialGenerationResult {
  hierarchy: TaskHierarchy;
  schedulingSuggestions: SchedulingSuggestion[];
  timeAnalysis: TimeConstraintAnalysis;
  totalEstimatedHours: number;
  feasibilityReport: string;
  metadata: {
    totalSubtasks: number;
    estimatedTotalHours: number;
    feasibilityAssessment: string;
    timeConstraintWarnings: string[];
    schedulingRecommendations: string[];
  };
}

/**
 * Generate contextual dynamic personalization questions using LLM analysis
 * This replaces the static question approach with intelligent, task-specific inquiry
 * @param title - Task title for context
 * @param description - Task description for context analysis
 * @param taskType - Detected or specified task type
 * @param language - Output language preference
 * @returns Promise<ClarifyingQuestion[]> - AI-generated personalized questions
 */
/**
 * @deprecated Use backend API getDynamicQuestions() from utils/api.ts instead.
 * This function will be removed in the next version.
 */
export async function generateDynamicPersonalizationQuestions(
  title: string,
  description: string,
  taskType?: "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general",
  language: "en" | "zh" = "en"
): Promise<ClarifyingQuestion[]> {
  try {
    // Auto-detect task type if not provided
    const detectedTaskType = taskType || detectTaskType(title, description);
    
    const systemPrompts = {
      en: {
        role: "You are an expert learning consultant who specializes in creating personalized educational experiences.",
        instruction: "Generate 1 highly targeted personalization question",
        format: "Return as JSON array"
      },
      zh: {
        role: "您是一位專精於創建個人化教育體驗的專業學習顧問。",
        instruction: "生成1個高度針對性的個人化問題",
        format: "以JSON陣列格式返回"
      }
    };

    const taskTypePrompts = {
      en: {
        exam_preparation: "Focus on exam strategy, timeline urgency, weakness identification, and study preferences.",
        skill_learning: "Focus on learning style, current experience level, practical application goals, and time availability.",
        project_completion: "Focus on technical requirements, team collaboration, complexity assessment, and delivery constraints.",
        habit_building: "Focus on motivation, current routines, environmental factors, and consistency challenges.",
        challenge: "Focus on personal motivation, previous attempts, support systems, and success metrics.",
        general: "Focus on learning preferences, time constraints, specific goals, and current knowledge level."
      },
      zh: {
        exam_preparation: "專注於考試策略、時間緊迫性、弱點識別和學習偏好。",
        skill_learning: "專注於學習風格、當前經驗水平、實際應用目標和時間可用性。",
        project_completion: "專注於技術要求、團隊協作、複雜性評估和交付限制。",
        habit_building: "專注於動機、當前例行程序、環境因素和一致性挑戰。",
        challenge: "專注於個人動機、先前嘗試、支持系統和成功指標。",
        general: "專注於學習偏好、時間限制、具體目標和當前知識水平。"
      }
    };

    const prompts = systemPrompts[language];
    const taskPrompts = taskTypePrompts[language];

    const messages: CoreMessage[] = [
      {
        role: 'system',
        content: `${prompts.role}

${prompts.instruction} that will most significantly improve the learning plan for this specific task.

## Task Analysis Context:
- Task Type: ${detectedTaskType.toUpperCase()}
- Focus Areas: ${taskPrompts[detectedTaskType as keyof typeof taskPrompts]}

## Question Generation Guidelines:
1. Generate EXACTLY 1 question that addresses the most critical personalization factor
2. Make the question specific to the task context and type
3. Focus on information that will dramatically change the approach or priorities
4. Avoid generic questions - be highly contextual and insightful

## Question Types Available:
- "choice": Multiple choice with specific options
- "text": Open-ended text response
- "scale": Numeric scale (1-5 or 1-10)

${language === 'zh' ? `
## 繁體中文輸出格式：
返回格式必須是包含以下欄位的JSON陣列：
{
  "id": "question_1",
  "question": "問題文本（繁體中文）",
  "type": "choice|text|scale",
  "options": ["選項1", "選項2", "選項3"], // 僅當type為"choice"時
  "required": true,
  "category": "goal|level|method|timeline|resources|context|proficiency"
}

範例：
[
  {
    "id": "exam_strategy_focus",
    "question": "考慮到您的考試時間緊迫，您最擔心的是以下哪個方面？",
    "type": "choice",
    "options": ["記憶大量內容", "理解複雜概念", "應試技巧和時間管理", "克服考試焦慮"],
    "required": true,
    "category": "method"
  }
]
` : `
## English Output Format:
Return as JSON array with these fields:
{
  "id": "question_1", 
  "question": "Question text in English",
  "type": "choice|text|scale",
  "options": ["Option 1", "Option 2", "Option 3"], // Only if type is "choice"
  "required": true,
  "category": "goal|level|method|timeline|resources|context|proficiency"
}

Example:
[
  {
    "id": "exam_strategy_focus",
    "question": "Given your tight exam timeline, which aspect are you most concerned about?",
    "type": "choice", 
    "options": ["Memorizing large amounts of content", "Understanding complex concepts", "Test-taking skills and time management", "Overcoming exam anxiety"],
    "required": true,
    "category": "method"
  }
]
`}

Generate the single most impactful personalization question for this specific task.`
      },
      {
        role: 'user',
        content: `Task: "${title}"
Description: "${description}"

${language === 'zh' 
  ? '請為這個特定任務生成1個最有影響力的個人化問題。'
  : 'Generate 1 most impactful personalization question for this specific task.'}

Return JSON array only.`
      }
    ];

    const response = await makeAIRequest(messages);
    const parsed = parseAIResponse(response);

    if (Array.isArray(parsed)) {
      return parsed.map((q, index) => ({
        id: q.id || `dynamic_q_${Date.now()}_${index}`,
        question: q.question || `Question ${index + 1}`,
        type: (q.type as "text" | "choice" | "scale") || "text",
        options: q.options || undefined,
        required: q.required !== false, // Default to true
        category: (q.category as "goal" | "level" | "method" | "timeline" | "resources" | "context" | "proficiency") || "context"
      }));
    }

    // Fallback to static question if LLM fails
    console.warn('LLM failed to generate dynamic questions, using static fallback');
    return generateStaticFallbackQuestion(detectedTaskType, language);

  } catch (error) {
    console.error('Failed to generate dynamic personalization questions:', error);
    // Return static fallback question
    return generateStaticFallbackQuestion(taskType || "general", language);
  }
}

/**
 * DEPRECATED: Static fallback question generation
 * @deprecated Use LLM-powered generateDynamicPersonalizationQuestions instead
 */
function generateStaticFallbackQuestion(
  taskType: string, 
  language: "en" | "zh"
): ClarifyingQuestion[] {
  // DEPRECATED: This provides a basic fallback when LLM fails
  console.warn('Using deprecated static question generation as fallback');
  
  const staticQuestions = {
    en: {
      exam_preparation: {
        id: "exam_main_concern",
        question: "What is your biggest concern about this exam?",
        type: "choice" as const,
        options: ["Not enough time to study", "Difficulty understanding concepts", "Test anxiety", "Memorizing information"],
        required: true,
        category: "goal" as const
      },
      skill_learning: {
        id: "learning_experience",
        question: "How would you describe your current experience with this skill?",
        type: "choice" as const,
        options: ["Complete beginner", "Some basic knowledge", "Intermediate level", "Advanced but want to improve"],
        required: true,
        category: "level" as const
      },
      general: {
        id: "main_goal",
        question: "What is your primary goal for this task?",
        type: "text" as const,
        required: true,
        category: "goal" as const
      }
    },
    zh: {
      exam_preparation: {
        id: "exam_main_concern",
        question: "您對這個考試最大的擔憂是什麼？",
        type: "choice" as const,
        options: ["學習時間不足", "理解概念困難", "考試焦慮", "記憶資訊困難"],
        required: true,
        category: "goal" as const
      },
      skill_learning: {
        id: "learning_experience",
        question: "您如何描述您目前對這項技能的經驗？",
        type: "choice" as const,
        options: ["完全初學者", "有一些基礎知識", "中級水平", "進階但想要改進"],
        required: true,
        category: "level" as const
      },
      general: {
        id: "main_goal",
        question: "您對這項任務的主要目標是什麼？",
        type: "text" as const,
        required: true,
        category: "goal" as const
      }
    }
  };

  const questionKey = taskType as keyof typeof staticQuestions.en;
  const fallbackQuestion = staticQuestions[language][questionKey] || staticQuestions[language].general;
  
  return [fallbackQuestion];
}

// Commercial task generation functions removed - features were unused and overly complex for target users

/**
 * 時間約束分析工具函數
 */
export function analyzeTimeConstraints(
  availableTimeSlots: DayTimeSlots,
  dueDate?: string
): TimeConstraintAnalysis {
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  let totalWeeklyMinutes = 0;
  const timeDistribution = { morning: 0, afternoon: 0, evening: 0 };
  
  // 計算總可用時間
  Object.values(availableTimeSlots).forEach(daySlots => {
    daySlots.forEach((slot: TimeSlot) => {
      const duration = timeToMinutes(slot.end) - timeToMinutes(slot.start);
      totalWeeklyMinutes += duration;
      
      // 時段分類
      const startHour = parseInt(slot.start.split(':')[0]);
      if (startHour < 12) {
        timeDistribution.morning += duration / 60;
      } else if (startHour < 18) {
        timeDistribution.afternoon += duration / 60;
      } else {
        timeDistribution.evening += duration / 60;
      }
    });
  });
  
  const weeklyAvailableHours = totalWeeklyMinutes / 60;
  const dailyAverageHours = weeklyAvailableHours / 7;
  
  // 計算到期天數和緊急程度
  let availableDays = 90; // 默認90天
  let urgencyLevel: "critical" | "high" | "moderate" | "relaxed" = "moderate";
  
  if (dueDate) {
    const today = new Date();
    const deadline = new Date(dueDate);
    availableDays = Math.max(0, Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    
    if (availableDays <= 3) urgencyLevel = "critical";
    else if (availableDays <= 7) urgencyLevel = "high";
    else if (availableDays <= 30) urgencyLevel = "moderate";
    else urgencyLevel = "relaxed";
  }
  
  // 計算可行性評分
  const totalAvailableHours = (weeklyAvailableHours / 7) * availableDays;
  const feasibilityScore = Math.min(1, totalAvailableHours / 50); // 假設50小時為基準
  
  // 生成建議和警告
  const recommendations: string[] = [];
  const warnings: string[] = [];
  
  if (dailyAverageHours < 1) {
    warnings.push("每日可用時間不足1小時，建議增加學習時間分配");
    recommendations.push("考慮調整日程安排，每天至少分配1-2小時用於學習");
  }
  
  if (urgencyLevel === "critical") {
    warnings.push("截止日期非常緊迫，建議考慮延期或精簡任務範圍");
    recommendations.push("專注於最核心的20%內容，應用80/20法則");
  }
  
  if (timeDistribution.morning === 0) {
    recommendations.push("考慮安排一些早晨時間學習，這是大腦最清醒的時段");
  }
  
  return {
    totalAvailableHours,
    weeklyAvailableHours,
    dailyAverageHours,
    availableDays,
    urgencyLevel,
    feasibilityScore,
    timeDistribution,
    recommendations,
    warnings
  };
}

/**
 * 商業級後備方案生成
 */
async function generateCommercialFallback(
  context: CommercialTaskContext
): Promise<CommercialGenerationResult> {
  console.log('🔄 Generating commercial fallback...');
  
  const timeAnalysis = analyzeTimeConstraints(context.availableTimeSlots, context.dueDate);
  const fallbackTasks = generateBasicCommercialFallback(
    context.title, 
    context.description, 
    context.language
  );
  
  // 轉換為階層結構
  const hierarchy: TaskHierarchy = {
    phases: fallbackTasks.filter(task => task.level === 1),
    detailedTasks: fallbackTasks.filter(task => task.level === 2),
    operationalSteps: fallbackTasks.filter(task => task.level === 3)
  };
  
  // 生成基本排程建議
  const schedulingSuggestions: SchedulingSuggestion[] = fallbackTasks.map((task, index) => ({
    subtaskId: task.id,
    recommendedDate: getRecommendedDate(index, timeAnalysis.urgencyLevel),
    recommendedTimeSlot: { start: "09:00", end: "11:00" },
    reasoning: "Based on task complexity and urgency level",
    alternativeSlots: []
  }));
  
  const totalEstimatedHours = fallbackTasks.reduce((sum, task) => sum + ((task.aiEstimatedDuration || 0) / 60), 0);
  
  return {
    hierarchy,
    schedulingSuggestions,
    timeAnalysis,
    totalEstimatedHours,
    feasibilityReport: generateFallbackFeasibilityReport(timeAnalysis, totalEstimatedHours, context.language),
    metadata: {
      totalSubtasks: fallbackTasks.length,
      estimatedTotalHours: totalEstimatedHours,
      feasibilityAssessment: timeAnalysis.feasibilityScore > 0.6 ? 'Good' : timeAnalysis.feasibilityScore > 0.3 ? 'Challenging' : 'Critical',
      timeConstraintWarnings: timeAnalysis.warnings,
      schedulingRecommendations: timeAnalysis.recommendations
    }
  };
}

/**
 * 基本商業任務後備生成
 */
function generateBasicCommercialFallback(
  title: string,
  description: string,
  language: "en" | "zh"
): CommercialSubtask[] {
  const isZh = language === 'zh';
  
  const baseTemplate: Partial<CommercialSubtask> = {
    aiEstimatedDuration: 120,
    difficulty: 'medium',
    completed: false,
    order: 1,
    skills: [],
    recommendedResources: [],
    phase: 'knowledge',
    deliverables: [],
    acceptanceCriteria: [],
    dependencies: [],
    risks: [],
    mitigation: [],
    requiredTools: [],
    resourceLinks: [],
    childrenIds: [],
    suggestedTimeSlots: ['morning'],
    optimalDuration: 90,
    breakFrequency: 25,
    businessValue: 5,
    learningCurve: 'moderate',
    practicalApplication: ''
  };
  
  const tasks: CommercialSubtask[] = [
    {
      ...baseTemplate,
      id: 'commercial_phase_1',
      title: isZh ? '需求分析與規劃' : 'Requirements Analysis & Planning',
      text: isZh ? '深入分析任務需求，制定詳細的執行計劃和時間表' : 'Thoroughly analyze task requirements and develop detailed execution plan and timeline',
      level: 1,
      aiEstimatedDuration: 180,
      deliverables: isZh ? ['需求文件', '執行計劃', '風險評估'] : ['Requirements document', 'Execution plan', 'Risk assessment'],
      acceptanceCriteria: isZh ? ['完整的需求清單', '可執行的時間表', '已識別的風險點'] : ['Complete requirements list', 'Executable timeline', 'Identified risk points'],
      requiredTools: isZh ? ['文字處理軟體', '專案管理工具'] : ['Word processor', 'Project management tool'],
      practicalApplication: isZh ? '為後續執行階段提供明確指導' : 'Provide clear guidance for subsequent execution phases'
    } as CommercialSubtask,
    
    {
      ...baseTemplate,
      id: 'commercial_phase_2',
      title: isZh ? '知識基礎建立' : 'Knowledge Foundation Building',
      text: isZh ? '建立核心概念理解和理論基礎，為實際應用做準備' : 'Establish core concept understanding and theoretical foundation for practical application',
      level: 1,
      aiEstimatedDuration: 240,
      deliverables: isZh ? ['核心概念筆記', '理論框架圖', '知識檢測結果'] : ['Core concept notes', 'Theoretical framework diagram', 'Knowledge assessment results'],
      acceptanceCriteria: isZh ? ['能夠解釋主要概念', '通過基礎知識測試', '建立完整的知識架構'] : ['Can explain main concepts', 'Pass basic knowledge test', 'Establish complete knowledge structure'],
      suggestedTimeSlots: ['morning', 'afternoon'],
      businessValue: 8,
      practicalApplication: isZh ? '為高級技能發展奠定堅實基礎' : 'Lay solid foundation for advanced skill development'
    } as CommercialSubtask,
    
    {
      ...baseTemplate,
      id: 'commercial_task_1',
      title: isZh ? '實踐技能發展' : 'Practical Skill Development',
      text: isZh ? '通過具體練習和案例研究發展實際操作能力' : 'Develop practical operational capabilities through specific exercises and case studies',
      level: 2,
      parentId: 'commercial_phase_2',
      aiEstimatedDuration: 300,
      deliverables: isZh ? ['練習成果', '案例分析報告', '技能演示'] : ['Practice results', 'Case analysis report', 'Skill demonstration'],
      acceptanceCriteria: isZh ? ['完成所有練習', '案例分析正確率80%以上', '能夠獨立演示技能'] : ['Complete all exercises', 'Case analysis accuracy above 80%', 'Can independently demonstrate skills'],
      requiredTools: isZh ? ['練習平台', '案例資料庫'] : ['Practice platform', 'Case database'],
      businessValue: 9,
      practicalApplication: isZh ? '直接應用於實際工作場景' : 'Direct application to real work scenarios'
    } as CommercialSubtask
  ];
  
  // 為每個任務設置正確的order
  tasks.forEach((task, index) => {
    task.order = index + 1;
  });
  
  return tasks;
}

/**
 * 輔助函數：獲取建議日期
 */
function getRecommendedDate(index: number, urgencyLevel: string): string {
  const today = new Date();
  const daysToAdd = urgencyLevel === 'critical' ? index : index * 2;
  const recommendedDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return recommendedDate.toISOString().split('T')[0];
}

/**
 * 生成後備可行性報告
 */
function generateFallbackFeasibilityReport(
  timeAnalysis: TimeConstraintAnalysis,
  totalEstimatedHours: number,
  language: "en" | "zh"
): string {
  const feasibilityPercentage = (timeAnalysis.totalAvailableHours / totalEstimatedHours * 100).toFixed(0);
  
  if (language === "zh") {
    return `
**可行性分析報告（後備版本）**

總學習時間需求：${totalEstimatedHours.toFixed(1)} 小時
總可用時間：${timeAnalysis.totalAvailableHours.toFixed(1)} 小時
可行性：${feasibilityPercentage}%

**建議：**
${timeAnalysis.recommendations.join("\n")}

**警告：**
${timeAnalysis.warnings.join("\n")}

**備註：**
這是系統生成的後備方案，建議聯繫支援以獲得完整的商業級分析。
    `;
  } else {
    return `
**Feasibility Analysis Report (Fallback Version)**

Total Learning Time Required: ${totalEstimatedHours.toFixed(1)} hours
Total Available Time: ${timeAnalysis.totalAvailableHours.toFixed(1)} hours
Feasibility: ${feasibilityPercentage}%

**Recommendations:**
${timeAnalysis.recommendations.join("\n")}

**Warnings:**
${timeAnalysis.warnings.join("\n")}

**Note:**
This is a system-generated fallback plan. Contact support for full commercial-grade analysis.
    `;
  }
}

/**
 * 轉換增強子任務為商業子任務
 */
export function convertToCommercialSubtasks(
  subtasks: EnhancedSubtask[],
  language: "en" | "zh" = "zh"
): CommercialSubtask[] {
  return subtasks.map((subtask, index) => ({
    ...subtask,
    level: 2, // 默認為詳細任務層級
    childrenIds: [],
    deliverables: [language === "zh" ? "任務完成確認" : "Task completion confirmation"],
    acceptanceCriteria: [language === "zh" ? "滿足任務要求" : "Meet task requirements"],
    dependencies: [],
    risks: [language === "zh" ? "時間不足" : "Insufficient time"],
    mitigation: [language === "zh" ? "合理安排時間" : "Proper time management"],
    requiredTools: [],
    resourceLinks: [],
    suggestedTimeSlots: ["morning"],
    optimalDuration: subtask.aiEstimatedDuration || 90,
    breakFrequency: 25,
    businessValue: 5,
    learningCurve: "moderate",
    practicalApplication: language === "zh" ? "實際應用場景" : "Practical application scenario"
  }));
}

/**
 * 商業級任務驗證
 */
export function validateCommercialTasks(tasks: CommercialSubtask[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  tasks.forEach((task, index) => {
    if (!task.deliverables || task.deliverables.length === 0) {
      errors.push(`Task ${index + 1}: Missing deliverables`);
    }
    
    if (!task.acceptanceCriteria || task.acceptanceCriteria.length === 0) {
      errors.push(`Task ${index + 1}: Missing acceptance criteria`);
    }
    
    if (!task.businessValue || task.businessValue < 1 || task.businessValue > 10) {
      warnings.push(`Task ${index + 1}: Business value should be between 1-10`);
    }
    
    if (!task.level || task.level < 1 || task.level > 3) {
      errors.push(`Task ${index + 1}: Invalid level (should be 1, 2, or 3)`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}