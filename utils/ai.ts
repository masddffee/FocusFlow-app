import { ClarifyingQuestion, EnhancedSubtask, LearningPlan, ProficiencyLevel, LearningPace, DynamicRangeCalculation, TaskDifficulty, ReviewStatus, LearningPhase } from "@/types/task";
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

const AI_API_URL = "https://toolkit.rork.com/text/llm/";

async function makeAIRequest(messages: CoreMessage[]): Promise<string> {
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

export async function evaluateInputQuality(title: string, description: string): Promise<QualityEvaluation> {
  const messages: CoreMessage[] = [
    {
      role: 'system',
      content: `You are an expert task analysis assistant. Evaluate if the given task title and description provide enough information to generate specific, actionable subtasks with appropriate proficiency-aware progression.

Return a JSON object with:
- isSufficient: boolean (true if the input is detailed enough for smart subtask generation)
- reasons: string[] (list of specific issues if insufficient)

Consider insufficient if:
- Title is too vague (e.g., "Learn English", "Study math", "Work on project")
- Missing specific goals, outcomes, or target proficiency level
- No context about current level, experience, or starting point
- Too short or generic without actionable direction
- Missing deadlines or timeframes for learning/skill development tasks
- No mention of specific skills, topics, or areas to focus on
- Lacks clarity on what "completion" or "success" looks like

Consider sufficient if:
- Clear, specific goal with measurable outcome
- Adequate context about scope and requirements
- Sufficient detail to understand the task complexity
- Clear enough to generate meaningful subtasks

IMPORTANT: Return ONLY the JSON object, no markdown formatting or extra text.`
    },
    {
      role: 'user',
      content: `Task Title: "${title}"
Description: "${description || 'No description provided'}"

Evaluate this task input and return the assessment as JSON.`
    }
  ];

  try {
    const response = await makeAIRequest(messages);
    const parsed = parseAIResponse(response);
    return {
      isSufficient: parsed.isSufficient || false,
      reasons: parsed.reasons || []
    };
  } catch (error) {
    console.error('Failed to evaluate input quality:', error);
    return {
      isSufficient: true, // Default to sufficient to avoid blocking users
      reasons: []
    };
  }
}

export async function analyzeTaskForClarification(title: string, description: string): Promise<TaskAnalysis> {
  const messages: CoreMessage[] = [
    {
      role: 'system',
      content: `You are an AI task categorization expert that automatically identifies task types and generates personalized clarifying questions with enhanced proficiency assessment. Based on the task title and description, automatically categorize the task and generate specific questions to understand the user's goals, current proficiency level, and target outcomes.

AUTOMATIC TASK TYPE DETECTION:

1. EXAM PREPARATION:
   - Keywords: exam, test, quiz, certification, assessment, midterm, final, SAT, GRE, GMAT, AP, IELTS, TOEFL, board exam, entrance test, licensing exam
   - Phrases: "prepare for", "study for exam", "pass the test", "get certified", "exam prep"
   - Time-bound with specific exam dates
   - Focus on scoring, passing, or achieving specific grades

2. SKILL LEARNING:
   - Keywords: learn, master, understand, develop skills, improve at, get better at
   - Phrases: "learn to code", "master photography", "understand concepts", "develop expertise"
   - Focus on long-term skill development, understanding concepts
   - Building competency in a domain or technology

3. PROJECT COMPLETION:
   - Keywords: build, create, develop, design, implement, complete, finish, deliver
   - Phrases: "build an app", "create a website", "design a system", "complete the project"
   - Focus on delivering specific outputs or products
   - Has clear deliverables and milestones

4. HABIT BUILDING:
   - Keywords: daily, weekly, routine, habit, practice, maintain, consistent, regular
   - Phrases: "exercise daily", "read every day", "practice meditation", "maintain a routine"
   - Focus on consistency and repetition over time
   - Building sustainable behaviors

5. CHALLENGE:
   - Keywords: challenge, competition, contest, achieve, accomplish, goal, target
   - Phrases: "30-day challenge", "fitness challenge", "coding challenge", "personal goal"
   - Time-bound with specific achievement targets
   - Focus on pushing limits or achieving specific metrics

6. GENERAL:
   - Everything else that doesn't fit the above categories
   - Work tasks, meetings, administrative tasks, one-time activities

ENHANCED PROFICIENCY LEVEL DETECTION:
- complete_beginner: Never done this before, no prior knowledge or experience
- beginner: Some basic exposure, limited experience, knows fundamentals
- intermediate: Comfortable with basics, some practical experience, can work independently
- advanced: Strong foundation, can handle complex tasks, teaches others
- expert: Deep expertise, innovates in the field, recognized authority

INTELLIGENT CLARIFICATION STRATEGY:
Generate questions that will enable dynamic range calculation:

1. CURRENT PROFICIENCY ASSESSMENT (Required):
   - Specific experience level with the subject/skill
   - Previous related experience or background
   - Current capabilities and comfort level

2. TARGET PROFICIENCY/GOAL CLARITY (Required):
   - Specific desired outcome or proficiency level
   - Success criteria and measurable goals
   - Intended application or use case

3. TIME AND CONSTRAINT ANALYSIS:
   - Available time per day/week for this task
   - Specific deadlines or time pressures
   - Other commitments or constraints

4. LEARNING PREFERENCES AND CONTEXT:
   - Preferred learning style or approach
   - Available resources and tools
   - Previous successful learning experiences

5. SCOPE AND PRIORITY CLARIFICATION:
   - Most important aspects to focus on
   - Areas that can be skipped if time is limited
   - Specific topics or skills of highest priority

Return a JSON object with:
- needsClarification: boolean (true if questions would significantly improve subtask generation)
- taskType: "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general"
- currentProficiency: "complete_beginner" | "beginner" | "intermediate" | "advanced" | "expert" (best guess based on input)
- targetProficiency: "complete_beginner" | "beginner" | "intermediate" | "advanced" | "expert" (inferred target)
- proficiencyGap: "minimal" | "moderate" | "significant" | "major"
- recommendedPace: "relaxed" | "moderate" | "intensive" | "accelerated" | "emergency"
- questions: array of question objects with:
  - id: string (unique identifier)
  - question: string (the clarifying question)
  - type: "text" | "choice" (input type)
  - options: string[] (for choice type only)
  - category: "goal" | "level" | "timeline" | "resources" | "context" | "proficiency"
  - required: boolean

IMPORTANT: Return ONLY the JSON object, no markdown formatting or extra text.`
    },
    {
      role: 'user',
      content: `Task Title: "${title}"
Description: "${description || 'No description provided'}"

Analyze this task, automatically detect the task type and proficiency levels, and generate appropriate clarifying questions for dynamic range calculation. Return as JSON.`
    }
  ];

  try {
    const response = await makeAIRequest(messages);
    const parsed = parseAIResponse(response);
    return {
      needsClarification: parsed.needsClarification || false,
      questions: parsed.questions || [],
      taskType: parsed.taskType || "general",
      currentProficiency: parsed.currentProficiency || "beginner",
      targetProficiency: parsed.targetProficiency || "intermediate",
      proficiencyGap: parsed.proficiencyGap || "moderate",
      recommendedPace: parsed.recommendedPace || "moderate"
    };
  } catch (error) {
    console.error('Failed to analyze task for clarification:', error);
    return {
      needsClarification: false,
      questions: [],
      taskType: "general",
      currentProficiency: "beginner",
      targetProficiency: "intermediate",
      proficiencyGap: "moderate",
      recommendedPace: "moderate"
    };
  }
}

export async function generateEnhancedSubtasks(
  title: string, 
  description: string, 
  clarificationResponses?: Record<string, string>,
  dueDate?: string,
  taskType?: "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general",
  currentProficiency?: ProficiencyLevel,
  targetProficiency?: ProficiencyLevel
): Promise<EnhancedSubtask[]> {
  let contextualInfo = `Task Goal: ${title}
Description: ${description}`;

  if (clarificationResponses && Object.keys(clarificationResponses).length > 0) {
    const additionalContext = Object.entries(clarificationResponses)
      .map(([question, answer]) => `${question}: ${answer}`)
      .join('\n');
    
    contextualInfo += `\n\nAdditional Context:\n${additionalContext}`;
  }

  // Calculate available time if due date is provided
  let timeContext = "";
  let availableDays = 0;
  if (dueDate) {
    const today = new Date();
    const targetDate = new Date(dueDate);
    availableDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (availableDays > 0) {
      timeContext = `\n\nTime Constraint: ${availableDays} days available until ${dueDate}. Plan accordingly with realistic daily time commitments and appropriate learning pace.`;
    } else if (availableDays <= 0) {
      timeContext = `\n\nURGENT Timeline: Due date is today or has passed. Focus on high-impact, time-efficient tasks that can be completed quickly.`;
    }
  }

  // Auto-detect task type if not explicitly provided
  if (!taskType) {
    const titleLower = title.toLowerCase();
    const descLower = description.toLowerCase();
    
    // Exam preparation detection
    const examKeywords = ['exam', 'test', 'quiz', 'certification', 'assessment', 'midterm', 'final', 'sat', 'gre', 'gmat', 'ap', 'ielts', 'toefl'];
    if (examKeywords.some(keyword => titleLower.includes(keyword) || descLower.includes(keyword))) {
      taskType = "exam_preparation";
    }
    // Skill learning detection
    else if (titleLower.includes('learn') || titleLower.includes('master') || titleLower.includes('understand') || 
             descLower.includes('learn') || descLower.includes('skill') || descLower.includes('develop')) {
      taskType = "skill_learning";
    }
    // Project completion detection
    else if (titleLower.includes('build') || titleLower.includes('create') || titleLower.includes('develop') ||
             titleLower.includes('design') || titleLower.includes('implement') || titleLower.includes('project')) {
      taskType = "project_completion";
    }
    // Habit building detection
    else if (titleLower.includes('daily') || titleLower.includes('habit') || titleLower.includes('routine') ||
             titleLower.includes('practice') || titleLower.includes('every day')) {
      taskType = "habit_building";
    }
    // Challenge detection
    else if (titleLower.includes('challenge') || titleLower.includes('goal') || titleLower.includes('achieve')) {
      taskType = "challenge";
    }
    else {
      taskType = "general";
    }
  }

  // Extract proficiency levels from clarification responses if not provided
  if (!currentProficiency || !targetProficiency) {
    const proficiencyKeywords = {
      complete_beginner: ['never', 'no experience', 'complete beginner', 'starting from scratch'],
      beginner: ['beginner', 'basic', 'just started', 'learning basics'],
      intermediate: ['intermediate', 'some experience', 'comfortable with basics'],
      advanced: ['advanced', 'experienced', 'proficient', 'strong foundation'],
      expert: ['expert', 'professional', 'master', 'teach others']
    };

    if (!currentProficiency) {
      currentProficiency = "beginner"; // Default
      if (clarificationResponses) {
        for (const [level, keywords] of Object.entries(proficiencyKeywords)) {
          if (Object.values(clarificationResponses).some(response => 
            keywords.some(keyword => response.toLowerCase().includes(keyword))
          )) {
            currentProficiency = level as ProficiencyLevel;
            break;
          }
        }
      }
    }

    if (!targetProficiency) {
      targetProficiency = "intermediate"; // Default
      if (clarificationResponses) {
        for (const [level, keywords] of Object.entries(proficiencyKeywords)) {
          if (Object.values(clarificationResponses).some(response => 
            keywords.some(keyword => response.toLowerCase().includes(keyword))
          )) {
            targetProficiency = level as ProficiencyLevel;
            break;
          }
        }
      }
    }
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

  const messages: CoreMessage[] = [
    {
      role: 'system',
      content: `You are an expert task breakdown specialist with deep knowledge of educational psychology, project management, and behavioral science. Generate a comprehensive, detailed action plan with subtasks following proven methodologies and ADVANCED DYNAMIC RANGE CALCULATION with SPACED REPETITION INTEGRATION.

CRITICAL REQUIREMENTS:

1. ADVANCED DYNAMIC RANGE CALCULATION - PROFICIENCY-BASED ADAPTATION:

Current Proficiency: ${currentProficiency}
Target Proficiency: ${targetProficiency}
Proficiency Gap: ${dynamicRange.proficiencyGap}
Recommended Pace: ${dynamicRange.recommendedPace}
Available Days: ${availableDays}

SUBTASK COUNT RANGE (Dynamically Calculated):
- Minimum: ${dynamicRange.subtaskCount.minimum} subtasks
- Optimal: ${dynamicRange.subtaskCount.optimal} subtasks  
- Maximum: ${dynamicRange.subtaskCount.maximum} subtasks

DIFFICULTY DISTRIBUTION (Adaptive):
- Easy: ${dynamicRange.difficultyDistribution.easy}% (${Math.round(dynamicRange.subtaskCount.optimal * dynamicRange.difficultyDistribution.easy / 100)} tasks)
- Medium: ${dynamicRange.difficultyDistribution.medium}% (${Math.round(dynamicRange.subtaskCount.optimal * dynamicRange.difficultyDistribution.medium / 100)} tasks)
- Hard: ${dynamicRange.difficultyDistribution.hard}% (${Math.round(dynamicRange.subtaskCount.optimal * dynamicRange.difficultyDistribution.hard / 100)} tasks)

TIME ALLOCATION (Optimized):
- Daily Hours: ${dynamicRange.timeAllocation.dailyHours}
- Total Hours Needed: ${dynamicRange.timeAllocation.totalHours}

PRIORITY FOCUS: ${dynamicRange.priorityFocus.join(', ')}
${dynamicRange.skipTopics ? `SKIP TOPICS: ${dynamicRange.skipTopics.join(', ')}` : ''}

SPACED REPETITION INTEGRATION:
- Review Strategy Enabled: ${dynamicRange.reviewStrategy.enabled}
- Initial Review Interval: ${dynamicRange.reviewStrategy.initialInterval} days
- Review Percentage: ${dynamicRange.reviewStrategy.reviewPercentage}%

2. TASK TYPE ADAPTATION - Detected Type: ${taskType?.toUpperCase()}:

   ${taskType === "exam_preparation" ? `
   EXAM PREPARATION MODE - Focus on:
   - Diagnostic assessments and baseline evaluation with spaced repetition
   - Intensive practice problems with review scheduling
   - Timed practice sessions and exam simulations
   - Error analysis and weakness remediation with follow-up reviews
   - Test-taking strategies and time management
   - Review and memorization techniques with spaced intervals
   - Mock exams and performance analysis
   - Score improvement strategies with targeted reviews
   ` : taskType === "skill_learning" ? `
   SKILL LEARNING MODE - Focus on:
   - Comprehensive knowledge building with spaced review
   - Hands-on practice with progressive difficulty and review cycles
   - Real-world projects and applications with reflection reviews
   - Portfolio development and creation with iterative reviews
   - Collaborative learning and peer interaction
   - Creative problem-solving with spaced practice
   - Professional skill development with mastery tracking
   - Industry-standard practices with review integration
   ` : taskType === "project_completion" ? `
   PROJECT COMPLETION MODE - Focus on:
   - Project planning and requirement analysis with review checkpoints
   - Design and architecture phases with iterative reviews
   - Implementation and development tasks with code reviews
   - Testing and quality assurance with review cycles
   - Integration and deployment with post-implementation reviews
   - Documentation and handover with knowledge retention
   - Stakeholder communication with feedback reviews
   - Risk management with periodic assessments
   ` : taskType === "habit_building" ? `
   HABIT BUILDING MODE - Focus on:
   - Habit stacking and trigger identification with review tracking
   - Progressive difficulty and consistency with spaced reinforcement
   - Tracking and measurement systems with review analytics
   - Obstacle identification and solutions with review cycles
   - Reward systems and motivation with spaced rewards
   - Environmental design and cues with periodic optimization
   - Accountability and support systems with review check-ins
   - Long-term sustainability planning with spaced evaluations
   ` : taskType === "challenge" ? `
   CHALLENGE MODE - Focus on:
   - Baseline measurement and goal setting with review milestones
   - Progressive milestones and checkpoints with spaced assessments
   - Performance tracking and metrics with review analytics
   - Skill development and improvement with spaced practice
   - Competition strategies and tactics with review optimization
   - Recovery and optimization with spaced recovery reviews
   - Final push and achievement with performance reviews
   - Celebration and reflection with spaced reflection
   ` : `
   GENERAL MODE - Focus on:
   - Task analysis and requirement gathering with review checkpoints
   - Planning and preparation phases with spaced planning reviews
   - Execution and implementation with progress reviews
   - Quality control and review with spaced quality checks
   - Completion and delivery with final reviews
   - Documentation and follow-up with knowledge retention
   `}

3. ENHANCED 6-PHASE METHODOLOGY WITH SPACED REPETITION - Structure subtasks using these phases with dynamic adjustments:

   Phase 1: KNOWLEDGE INPUT (${20 + dynamicRange.phaseAdjustments.knowledge}% of tasks)
   - START WITH PROFICIENCY-APPROPRIATE DIAGNOSTIC ASSESSMENT
   - Research and information gathering from authoritative sources
   - Foundational concept understanding and theoretical framework
   - Resource identification, setup, and environment preparation
   - Core terminology and vocabulary mastery
   - Prerequisite knowledge verification and reinforcement
   
   Phase 2: PRACTICE/HANDS-ON EXERCISES (${40 + dynamicRange.phaseAdjustments.practice}% of tasks)
   ${taskType === "exam_preparation" ? `
   - Diagnostic practice tests and baseline assessment
   - Topic-specific practice problems with progressive difficulty
   - Timed practice sessions for speed and accuracy
   - Error pattern analysis and targeted remediation
   - Weak area intensive drilling and repetition
   - Formula memorization and quick recall practice
   - Problem-solving strategy development and application
   ` : taskType === "habit_building" ? `
   - Initial habit implementation and trigger setup
   - Daily/weekly practice sessions with tracking
   - Progressive difficulty and consistency building
   - Obstacle identification and solution development
   - Environmental modification and cue placement
   - Accountability system establishment
   ` : `
   - Guided practice exercises with progressive difficulty (easy → medium → hard)
   - Skill-building activities, drills, and repetitive practice
   - Interactive learning and hands-on experimentation
   - Problem-solving practice with immediate feedback
   - Technique refinement and muscle memory development
   - Error analysis and correction exercises
   - Timed practice sessions for skill automation
   `}
   
   Phase 3: REAL-WORLD APPLICATION (${25 + dynamicRange.phaseAdjustments.application}% of tasks)
   ${taskType === "exam_preparation" ? `
   - Full-length practice exams under timed conditions
   - Exam strategy development and optimization
   - Time management technique practice
   - Stress management and test anxiety reduction
   - Review of past exam papers and question patterns
   - Final intensive review and cramming strategies
   ` : taskType === "project_completion" ? `
   - Core project implementation and development
   - Integration testing and system validation
   - User testing and feedback incorporation
   - Performance optimization and refinement
   - Documentation and deployment preparation
   ` : taskType === "habit_building" ? `
   - Habit integration into daily routine
   - Real-world application and adaptation
   - Social integration and accountability
   - Long-term sustainability planning
   ` : `
   - Project-based learning with authentic scenarios
   - Practical implementation of learned concepts
   - Creative application and innovation challenges
   - Integration with existing knowledge and skills
   - Collaborative projects and peer learning
   - Industry-standard practice and professional scenarios
   `}
   
   Phase 4: REFLECTION AND REVIEW (${10 + dynamicRange.phaseAdjustments.reflection}% of tasks)
   ${taskType === "exam_preparation" ? `
   - Performance analysis and score improvement strategies
   - Mistake pattern identification and correction
   - Final review using spaced repetition principles
   - Confidence building and mental preparation
   - Last-minute review and summary creation
   ` : `
   - Self-assessment and progress evaluation
   - Knowledge consolidation and synthesis
   - Spaced repetition based on forgetting curve principles
   - Peer feedback, discussion, and knowledge sharing
   - Metacognitive reflection on learning process
   - Weakness identification and targeted improvement
   `}
   
   Phase 5: OUTPUT AND PRESENTATION (${5 + dynamicRange.phaseAdjustments.output}% of tasks)
   ${taskType === "exam_preparation" ? `
   - FINAL EXAM SIMULATION with complete exam conditions
   - Post-exam analysis and performance evaluation
   - Score prediction and readiness assessment
   ` : taskType === "skill_learning" ? `
   - COMPREHENSIVE PROJECT CREATION or PORTFOLIO DEVELOPMENT
   - Professional presentation and knowledge demonstration
   - Teaching others or presenting knowledge to demonstrate mastery
   ` : taskType === "project_completion" ? `
   - FINAL PROJECT DELIVERY and stakeholder presentation
   - Documentation completion and handover
   - Project retrospective and lessons learned
   ` : taskType === "habit_building" ? `
   - HABIT MASTERY DEMONSTRATION and tracking review
   - Long-term maintenance plan creation
   - Success celebration and reflection
   ` : taskType === "challenge" ? `
   - FINAL CHALLENGE ATTEMPT and performance measurement
   - Achievement documentation and celebration
   - Reflection and future goal setting
   ` : `
   - FINAL DELIVERABLE COMPLETION and presentation
   - Knowledge sharing with community or professional network
   - Documentation and process improvement
   `}

   Phase 6: SPACED REPETITION REVIEW (${dynamicRange.phaseAdjustments.review}% of tasks - NEW)
   - Scheduled review sessions for completed subtasks
   - Active recall exercises for key concepts
   - Spaced practice of critical skills
   - Long-term retention verification
   - Mastery level assessment and adjustment

4. PROFICIENCY-AWARE DIFFICULTY AND TIME DISTRIBUTION:
   - Easy tasks (${dynamicRange.difficultyDistribution.easy}%): 15-90 minutes - Setup, basic research, simple exercises, quick reviews
   - Medium tasks (${dynamicRange.difficultyDistribution.medium}%): 30-240 minutes - Practice sessions, analysis, moderate projects, skill application
   - Hard tasks (${dynamicRange.difficultyDistribution.hard}%): 60-480 minutes - Complex creation, advanced problem-solving, comprehensive projects, mastery challenges

5. PROFICIENCY-APPROPRIATE TASK COMPLEXITY:
   Current Level (${currentProficiency}) → Target Level (${targetProficiency}):
   ${currentProficiency === "complete_beginner" ? `
   - Start with absolute basics and foundational concepts
   - Include extensive setup and orientation tasks
   - Focus on building confidence and basic vocabulary
   - Provide step-by-step guidance for every task
   - Include frequent review and reinforcement
   ` : currentProficiency === "beginner" ? `
   - Build on basic knowledge with structured practice
   - Include guided exercises with clear instructions
   - Focus on skill building and confidence development
   - Gradually introduce intermediate concepts
   - Include spaced review of fundamentals
   ` : currentProficiency === "intermediate" ? `
   - Challenge with complex problems and real-world scenarios
   - Include independent research and problem-solving
   - Focus on advanced techniques and optimization
   - Prepare for professional-level work
   - Include mastery-level review cycles
   ` : currentProficiency === "advanced" ? `
   - Focus on mastery and expertise development
   - Include teaching and mentoring opportunities
   - Challenge with cutting-edge techniques and innovation
   - Prepare for leadership and expert-level contributions
   - Include peer review and knowledge sharing
   ` : `
   - Focus on innovation and thought leadership
   - Include research and development opportunities
   - Challenge with unsolved problems and new frontiers
   - Prepare for industry-leading contributions
   - Include expert-level review and validation
   `}

6. ENHANCED SUBTASK STRUCTURE WITH SPACED REPETITION:
   Each subtask must include:
   - title: string (goal-focused, specific title with clear action verb)
   - text: string (detailed task description with specific topics, chapters, problem types, or exact activities)
   - recommendedResources: string[] (specific, high-quality, publicly accessible resources)
   - aiEstimatedDuration: number (realistic minutes based on complexity and proficiency level)
   - difficulty: "easy" | "medium" | "hard" (following the calculated distribution)
   - skills: string[] (specific skills developed)
   - prerequisites: string[] (other subtasks that should be completed first)
   - phase: string ("knowledge", "practice", "application", "reflection", "output", "review")
   - proficiencyLevel: string (required proficiency level for this subtask)
   - targetProficiency: string (proficiency level this subtask helps achieve)
   - learningPace: string (${dynamicRange.recommendedPace})

7. TIME-AWARE AND PACE-AWARE SCHEDULING:
   ${dynamicRange.recommendedPace === "emergency" ? `
   EMERGENCY PACE (${availableDays} days): Ultra-focused, high-impact tasks only:
   - Skip all non-essential topics and advanced concepts
   - Focus exclusively on core requirements and immediate needs
   - Combine related tasks where possible
   - Emphasize rapid skill acquisition over deep understanding
   - Include only critical practice and essential validation
   - Minimal review cycles, focus on immediate application
   ` : dynamicRange.recommendedPace === "accelerated" ? `
   ACCELERATED PACE (${availableDays} days): Fast-track approach:
   - Prioritize high-impact, time-efficient tasks
   - Focus on core concepts and essential skills only
   - Reduce practice time but maintain quality
   - Combine related tasks where possible
   - Emphasize practical application over theoretical depth
   - Include rapid assessment and focused review
   - Limited spaced repetition, focus on immediate retention
   ` : dynamicRange.recommendedPace === "intensive" ? `
   INTENSIVE PACE (${availableDays} days): Focused and efficient approach:
   - Include comprehensive knowledge building
   - Adequate practice time with progressive difficulty
   - Focus on practical application
   - Include some reflection and review
   - Create achievable daily goals (${dynamicRange.timeAllocation.dailyHours} hours per day)
   - Implement basic spaced repetition for key concepts
   ` : dynamicRange.recommendedPace === "moderate" ? `
   MODERATE PACE (${availableDays} days): Balanced approach:
   - Include comprehensive knowledge building
   - Extensive practice time with progressive difficulty
   - Focus on practical application and real-world projects
   - Include thorough reflection and review
   - Create sustainable daily goals (${dynamicRange.timeAllocation.dailyHours} hours per day)
   - Implement full spaced repetition system
   ` : `
   RELAXED PACE (${availableDays} days): Comprehensive mastery approach:
   - Deep theoretical understanding and extensive research
   - Extensive practice and skill development
   - Multiple real-world projects and applications
   - Thorough reflection and spaced repetition
   - Advanced topics and specialization
   - Professional-level depth and expertise development
   - Full spaced repetition with mastery tracking
   `}

Return a JSON array of subtask objects with:
- id: string (unique identifier)
- title: string (specific, goal-focused title with action verb)
- text: string (detailed description specifying exact topics, chapters, problem types, or activities)
- recommendedResources: string[] (specific, high-quality resources)
- aiEstimatedDuration: number (realistic minutes based on complexity, proficiency level, and pace)
- difficulty: "easy" | "medium" | "hard" (following calculated distribution)
- order: number (sequence order within the learning progression)
- completed: boolean (always false)
- skills: string[] (specific skills developed/required)
- prerequisites: string[] (other subtasks that should be completed first)
- phase: string ("knowledge", "practice", "application", "reflection", "output", "review")
- proficiencyLevel: string (required proficiency level for this subtask)
- targetProficiency: string (proficiency level this subtask helps achieve)
- learningPace: string (${dynamicRange.recommendedPace})

CRITICAL GENERATION RULES:
- Generate ${dynamicRange.subtaskCount.optimal} subtasks total with realistic distribution across the 6 phases (including review)
- Each subtask must be HIGHLY SPECIFIC with concrete actions, exact topics, and measurable deliverables
- Include specific textbook chapters, online course modules, YouTube playlists, and practice problem sets
- Ensure LOGICAL PROGRESSION from current proficiency to target proficiency with clear prerequisites
- Create realistic time estimates that reflect true complexity and current proficiency level
- Make tasks challenging but achievable within the estimated timeframe and proficiency level
- Include industry-standard practices and proficiency-appropriate depth
- Vary difficulty levels appropriately across phases following the calculated distribution
- Consider the available timeline and proficiency gap for intelligent task prioritization and pacing
- Focus on priority topics: ${dynamicRange.priorityFocus.join(', ')}
${dynamicRange.skipTopics ? `- Skip these topics due to time constraints: ${dynamicRange.skipTopics.join(', ')}` : ''}
- Include spaced repetition tasks for knowledge retention and mastery verification

IMPORTANT: Return ONLY the JSON array of subtasks, no markdown formatting or extra text.`
    },
    {
      role: 'user',
      content: `${contextualInfo}${timeContext}

Generate a comprehensive, proficiency-aware action plan with detailed subtasks following the advanced dynamic range calculation and enhanced 6-phase methodology with spaced repetition integration for:
- Task type: ${taskType}
- Current proficiency: ${currentProficiency}
- Target proficiency: ${targetProficiency}
- Learning pace: ${dynamicRange.recommendedPace}
- Available time: ${availableDays} days

Each subtask must include specific titles, detailed descriptions, and recommended resources. Focus on creating actionable tasks that will bridge the proficiency gap effectively within the time constraint while incorporating spaced repetition for long-term retention. Return as JSON array.`
    }
  ];

  try {
    const response = await makeAIRequest(messages);
    const parsed = parseAIResponse(response);
    
    if (Array.isArray(parsed)) {
      return parsed.map((subtask, index) => ({
        id: `subtask_${Date.now()}_${index}`,
        title: subtask.title || `Task ${index + 1}`,
        text: subtask.text || `Subtask ${index + 1}`,
        recommendedResources: subtask.recommendedResources || [],
        aiEstimatedDuration: subtask.aiEstimatedDuration || 60,
        difficulty: (subtask.difficulty as TaskDifficulty) || 'medium',
        order: subtask.order || index + 1,
        completed: false,
        skills: subtask.skills || [],
        prerequisites: subtask.prerequisites || [],
        phase: (subtask.phase as LearningPhase) || 'practice',
        taskType: taskType as "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general",
        proficiencyLevel: subtask.proficiencyLevel || currentProficiency,
        targetProficiency: subtask.targetProficiency || targetProficiency,
        learningPace: subtask.learningPace || dynamicRange.recommendedPace,
        reviewStatus: "not_started" as ReviewStatus,
        spacedRepetition: dynamicRange.reviewStrategy.enabled ? initializeSpacedRepetition() : undefined,
        isReviewTask: subtask.phase === "review",
      }));
    }
    
    // Fallback: Generate comprehensive subtasks if AI fails
    return generateComprehensiveSubtasks(title, description, availableDays, taskType, currentProficiency, targetProficiency);
  } catch (error) {
    console.error('Failed to generate enhanced subtasks:', error);
    // Return comprehensive fallback subtasks instead of basic ones
    return generateComprehensiveSubtasks(title, description, availableDays, taskType, currentProficiency, targetProficiency);
  }
}

function generateComprehensiveSubtasks(
  title: string, 
  description: string, 
  availableDays: number = 0, 
  taskType: "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general" = "general",
  currentProficiency: ProficiencyLevel = "beginner",
  targetProficiency: ProficiencyLevel = "intermediate"
): EnhancedSubtask[] {
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

export async function generateLearningPlan(
  title: string, 
  description: string, 
  clarificationResponses?: Record<string, string>
): Promise<LearningPlan | null> {
  let contextualInfo = `Learning Goal: ${title}
Description: ${description}`;

  if (clarificationResponses && Object.keys(clarificationResponses).length > 0) {
    const learnerContext = Object.entries(clarificationResponses)
      .map(([question, answer]) => `${question}: ${answer}`)
      .join('\n');
    
    contextualInfo += `\n\nLearner Context:\n${learnerContext}`;
  }

  // Auto-detect task type
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  
  let taskType: "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general" = "general";
  
  // Exam preparation detection
  const examKeywords = ['exam', 'test', 'quiz', 'certification', 'assessment', 'midterm', 'final', 'sat', 'gre', 'gmat', 'ap', 'ielts', 'toefl'];
  if (examKeywords.some(keyword => titleLower.includes(keyword) || descLower.includes(keyword))) {
    taskType = "exam_preparation";
  }
  // Skill learning detection
  else if (titleLower.includes('learn') || titleLower.includes('master') || titleLower.includes('understand') || 
           descLower.includes('learn') || descLower.includes('skill') || descLower.includes('develop')) {
    taskType = "skill_learning";
  }
  // Project completion detection
  else if (titleLower.includes('build') || titleLower.includes('create') || titleLower.includes('develop') ||
           titleLower.includes('design') || titleLower.includes('implement') || titleLower.includes('project')) {
    taskType = "project_completion";
  }
  // Habit building detection
  else if (titleLower.includes('daily') || titleLower.includes('habit') || titleLower.includes('routine') ||
           titleLower.includes('practice') || titleLower.includes('every day')) {
    taskType = "habit_building";
  }
  // Challenge detection
  else if (titleLower.includes('challenge') || titleLower.includes('goal') || titleLower.includes('achieve')) {
    taskType = "challenge";
  }

  const messages: CoreMessage[] = [
    {
      role: 'system',
      content: `You are an expert learning designer and curriculum specialist. Create a comprehensive, professional-level learning plan with structured subtasks following proven educational methodologies, proficiency-aware design, and spaced repetition integration.

Return a JSON object with:
- achievableGoal: string (single, focused goal achievable within the specified timeframe - focus on depth over breadth)
- recommendedTools: string[] (specific tools, platforms, software, resources)
- checkpoints: string[] (measurable milestones to track progress and maintain motivation)
- skillBreakdown: array of objects with:
  - skill: string (specific skill name)
  - currentLevel: "complete_beginner" | "beginner" | "intermediate" | "advanced" | "expert"
  - targetLevel: "complete_beginner" | "beginner" | "intermediate" | "advanced" | "expert"
- subtasks: array of enhanced subtask objects following the 6-phase learning methodology with spaced repetition
- taskType: "${taskType}" (automatically detected)
- currentProficiency: "complete_beginner" | "beginner" | "intermediate" | "advanced" | "expert"
- targetProficiency: "complete_beginner" | "beginner" | "intermediate" | "advanced" | "expert"
- learningPace: "relaxed" | "moderate" | "intensive" | "accelerated" | "emergency"
- timeConstraint: "urgent" | "moderate" | "extended" | "none"
- proficiencyGap: "minimal" | "moderate" | "significant" | "major"
- reviewSchedule: object with:
  - enabled: boolean (true for educational tasks)
  - frequency: "daily" | "weekly" | "biweekly" | "monthly"
  - reviewPercentage: number (percentage of completed subtasks to review)

FOCUS ON ACHIEVABLE GOALS:
Instead of generic short-term and medium-term goals, identify the MOST ACHIEVABLE and IMPACTFUL goal within the user's timeframe. Focus on depth over breadth and practical mastery.

AUTOMATIC TASK TYPE DETECTION: ${taskType?.toUpperCase()}
${taskType === "exam_preparation" ? `
Focus on:
- Diagnostic assessments and performance tracking with spaced review
- Intensive practice problems and test simulations with review cycles
- Time management and test-taking strategies with spaced practice
- Error analysis and weakness remediation with follow-up reviews
- Score improvement and exam readiness with retention verification
` : taskType === "skill_learning" ? `
Focus on:
- Comprehensive knowledge building with spaced review integration
- Hands-on practice and real-world application with review cycles
- Project-based learning and portfolio development with iterative reviews
- Creative problem-solving with spaced practice sessions
- Professional skill development with mastery tracking and reviews
` : taskType === "project_completion" ? `
Focus on:
- Project planning and requirement analysis with review checkpoints
- Implementation and development phases with code/design reviews
- Testing and quality assurance with review cycles
- Integration and deployment with post-implementation reviews
- Documentation and delivery with knowledge retention reviews
` : taskType === "habit_building" ? `
Focus on:
- Habit design and trigger identification with review tracking
- Consistency building with spaced reinforcement and reviews
- Obstacle navigation with review-based optimization
- Social accountability with review check-ins
- Long-term sustainability with spaced evaluation reviews
` : taskType === "challenge" ? `
Focus on:
- Challenge analysis and strategy with review milestones
- Skill development and training with spaced practice reviews
- Performance testing with review-based optimization
- Challenge execution with performance reviews
- Achievement documentation with spaced reflection reviews
` : `
Focus on:
- Task analysis and planning with review checkpoints
- Implementation and execution with progress reviews
- Quality assurance with spaced quality checks
- Completion and delivery with final reviews
- Documentation with knowledge retention reviews
`}

PROFICIENCY-AWARE SUBTASK GENERATION WITH SPACED REPETITION:
Generate 15-40 detailed subtasks following this enhanced structure:

PHASE 1: KNOWLEDGE INPUT (20% - 3-8 tasks)
- START WITH PROFICIENCY-APPROPRIATE DIAGNOSTIC ASSESSMENT
- Research and resource gathering
- Foundational theory and concepts with spaced review integration
- Tool setup and environment preparation

PHASE 2: PRACTICE/HANDS-ON EXERCISES (40% - 6-16 tasks)
- Guided practice with increasing complexity and review cycles
- Skill-building exercises with spaced repetition
- Interactive learning with feedback loops and reviews
- Problem-solving with spaced practice sessions

PHASE 3: REAL-WORLD APPLICATION (25% - 4-10 tasks)
- Project-based learning with review milestones
- Practical implementation with iterative reviews
- Creative application with spaced practice
- Integration with existing knowledge and review cycles

PHASE 4: REFLECTION AND REVIEW (10% - 2-4 tasks)
- Self-assessment with spaced evaluation
- Knowledge consolidation with systematic review
- Spaced repetition based on forgetting curve principles
- Peer feedback and community engagement with reviews

PHASE 5: OUTPUT AND PRESENTATION (5% - 1-2 tasks)
- Portfolio creation with review cycles
- Teaching others with spaced knowledge sharing
- Professional presentation with review feedback
- Certification with mastery verification

PHASE 6: SPACED REPETITION REVIEW (Variable - 1-5 tasks)
- Scheduled review sessions for completed subtasks
- Active recall exercises for key concepts
- Spaced practice of critical skills
- Long-term retention verification and mastery tracking

Each subtask must have:
- id: string
- title: string (specific, goal-focused title)
- text: string (detailed description with specific topics, chapters, or activities)
- recommendedResources: string[] (specific resources like textbook chapters, online courses, tools)
- aiEstimatedDuration: number (realistic minutes: 30-600 based on complexity and proficiency)
- difficulty: "easy" | "medium" | "hard"
- order: number
- completed: boolean (false)
- skills: string[] (specific skills developed)
- prerequisites: string[] (dependencies on other subtasks)
- phase: string ("knowledge" | "practice" | "application" | "reflection" | "output" | "review")
- proficiencyLevel: string (required proficiency level for this subtask)
- targetProficiency: string (proficiency level this subtask helps achieve)
- learningPace: string (recommended pace for this subtask)

CRITICAL REQUIREMENTS:
- Generate professional-depth subtasks with spaced repetition integration
- Each subtask must be CONCRETE and SPECIFIC with clear deliverables
- Include industry-standard practices and tools
- Create logical progression from current to target proficiency
- Ensure realistic time estimates based on complexity and proficiency level
- Include specific resources, tools, and methodologies
- Adapt difficulty and complexity to proficiency gap
- Integrate spaced repetition for long-term retention

IMPORTANT: Ensure subtasks have VARIED difficulties, realistic durations, follow the 6-phase learning methodology with spaced repetition, and are proficiency-aware. Return ONLY the JSON object, no markdown formatting or extra text.`
    },
    {
      role: 'user',
      content: `${contextualInfo}

Create a comprehensive, professional learning plan with detailed subtasks following the enhanced 6-phase methodology with spaced repetition integration for task type: ${taskType}. Focus on the most achievable goal within the timeframe and include proficiency-aware progression with long-term retention strategies. Return as JSON.`
    }
  ];

  try {
    const response = await makeAIRequest(messages);
    const parsed = parseAIResponse(response);
    
    // Ensure subtasks have proper structure with spaced repetition
    if (parsed.subtasks && Array.isArray(parsed.subtasks)) {
      parsed.subtasks = parsed.subtasks.map((subtask: any, index: number) => ({
        id: `subtask_${Date.now()}_${index}`,
        title: subtask.title || `Learning task ${index + 1}`,
        text: subtask.text || `Learning task ${index + 1}`,
        recommendedResources: subtask.recommendedResources || [],
        aiEstimatedDuration: subtask.aiEstimatedDuration || 60,
        difficulty: (subtask.difficulty as TaskDifficulty) || 'medium',
        order: subtask.order || index + 1,
        completed: false,
        skills: subtask.skills || [],
        prerequisites: subtask.prerequisites || [],
        phase: (subtask.phase as LearningPhase) || 'practice',
        taskType: taskType as "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general",
        proficiencyLevel: subtask.proficiencyLevel || "beginner",
        targetProficiency: subtask.targetProficiency || "intermediate",
        learningPace: subtask.learningPace || "moderate",
        reviewStatus: "not_started" as ReviewStatus,
        spacedRepetition: (taskType === "skill_learning" || taskType === "exam_preparation") ? initializeSpacedRepetition() : undefined,
        isReviewTask: subtask.phase === "review",
      }));
    } else {
      // Generate comprehensive fallback subtasks if AI doesn't provide them
      parsed.subtasks = generateComprehensiveSubtasks(title, description, 0, taskType);
    }
    
    // Set task type and review schedule based on detection
    parsed.taskType = taskType;
    parsed.reviewSchedule = {
      enabled: taskType === "skill_learning" || taskType === "exam_preparation",
      frequency: "weekly",
      reviewPercentage: 20
    };
    
    return parsed;
  } catch (error) {
    console.error('Failed to generate learning plan:', error);
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