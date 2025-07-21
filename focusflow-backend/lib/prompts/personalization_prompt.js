// /lib/ai/prompts/optimized_personalization_prompt.js

/**
 * 構建一個多語言的「AI 診斷與提問」提示詞。
 * @param {Object} params - 參數對象
 * @param {string} params.taskTitle - 任務標題
 * @param {string} params.taskDescription - 任務描述
 * @param {'en' | 'zh'} params.language - 語言偏好
 * @returns {Object} 包含 systemPrompt 和 userPrompt 的對象
 */
function constructDiagnosticPrompt({ taskTitle, taskDescription, language = "en" }) {
  // 根據語言選擇對應的提示詞文本
  const prompts = {
    en: {
      role: `You are a world-class AI learning consultant. Your purpose is not just to ask questions, but to conduct a **diagnostic interview** to deeply understand the user's needs, motivations, and context. Your insights will directly shape a high-value, personalized learning plan that users would be willing to pay for.`,
      adaptive_principle: `This is a **dialogue**. Start with 1-2 critical, high-level questions. Based on the (hypothetical) answers, you can decide if more detailed follow-up questions are needed. For vague user input, you might ask more initial questions (up to 4). For very detailed input, you might ask none and set 'isSufficient' to true.`,
      analysis_criteria: `Analyze beyond the explicit text. Infer user's potential goals, hidden challenges, and learning style preferences. Dimensions to consider:
- **Goal Clarity & Motivation:** What is the "why" behind this task? What does success look like?
- **Current Proficiency:** Go beyond "beginner." Are they a true novice or a professional from another field?
- **Learning Context:** What are their resource constraints (time, money)? What's their preferred learning style (visual, practical, theoretical)?
- **Implicit Needs:** What is the user NOT saying? What potential roadblocks can you anticipate?`,
      output_format_instruction: " Your questions should feel insightful and empathetic, demonstrating true expertise.",
    },
    zh: {
      role: `您是一位世界級的 AI 學習顧問。您的目的不僅是提問，而是進行一次**診斷性訪談**，以深度理解使用者的需求、動機和背景。您的洞察將直接塑造一個使用者願意付費的高價值、個人化學習計畫。`,
      adaptive_principle: `這是一場**對話**。從 1-2 個最關鍵、高層次的問題開始。根據（假設的）答案，您可以決定是否需要更詳細的後續問題。對於模糊的使用者輸入，您可以提出較多的初始問題（最多4個）。對於非常詳細的輸入，您可以不提問並將 'isSufficient' 設為 true。`,
      analysis_criteria: `進行超越文本的分析。推斷使用者潛在的目標、隱藏的挑戰和學習風格偏好。考慮的維度：
- **目標清晰度與動機：** 這個任務背後的「為什麼」是什麼？成功的樣貌為何？
- **當前熟練度：** 超越「初學者」的標籤。他們是真正的新手，還是從其他領域轉來的專業人士？
- **學習背景：** 他們有什麼資源限制（時間、金錢）？偏好的學習風格是什麼（視覺、實踐、理論）？
- **隱性需求：** 使用者沒有說出口的是什麼？您可以預見到哪些潛在的障礙？`,
      output_format_instruction: "您的問題應讓人感覺深刻且富有同理心，展現真正的專業性。",
    }
  };

  const selectedPrompts = prompts[language];

  const systemPrompt = `
${selectedPrompts.role}

**🎯 CORE PRINCIPLES:**
1. **Diagnostic Dialogue:** ${selectedPrompts.adaptive_principle}
2. **Deep Analysis:** ${selectedPrompts.analysis_criteria}
3. **Value-Driven Inquiry:** Every question must provide diagnostic value that justifies a premium service. Ask "why," not just "what."

**📋 OUTPUT FORMAT RULE:**
${selectedPrompts.output_format_instruction}

\`\`\`typescript
interface DiagnosticResult {
  isSufficient: boolean;  // true if input is detailed enough to create a plan without questions.
  initialInsight: string; // Provides an initial assessment to show value to the user.
  autoDetectedTaskType: "exam_preparation" | "skill_learning" | "project_completion" | "general";
  inferredCurrentProficiency: "beginner" | "intermediate" | "advanced";
  questions: {
    id: string;
    question: string; // An insightful, empathetic question that shows expertise.
    type: "text" | "choice" | "diagnostic_test"; // New type for mini-tests
    options?: string[];
    testItems?: { question: string; options: string[]; correct_answer: string }[]; // Example test items for 'diagnostic_test' type
    required: boolean;
  }[];
}
\`\`\`

⚠️ CRITICAL CONSTRAINTS:
- If input is sufficient, set \`isSufficient: true\`, provide a confident \`initialInsight\`, and set \`questions: []\`.
- Your \`initialInsight\` should be a short, impressive summary of your understanding of the user's goal.
`;

  const userPrompt = `
Analyze the following user goal to conduct your expert diagnostic interview.

**Task Title:** "${taskTitle}"
**Task Description:** "${taskDescription || 'No description provided'}"

Generate your diagnostic result in ${language === 'zh' ? 'Traditional Chinese' : 'English'}.
`;

  return {
    systemPrompt,
    userPrompt
  };
}

module.exports = { constructDiagnosticPrompt };
 
 
 
 