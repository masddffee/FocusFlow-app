/**
 * 批量處理服務 - 成本優化系統
 * 智能批量處理多個 AI 請求，大幅減少 API 調用次數和成本
 */

const { callGeminiStructured } = require('./geminiService');
const { get: cacheGet, set: cacheSet } = require('./cacheService');

class BatchProcessingService {
  constructor() {
    this.batchQueue = new Map(); // 按請求類型分組的批量隊列
    this.processingTimers = new Map(); // 處理計時器
    this.batchSizes = {
      'learning-plan': 3,        // 學習計劃批量大小
      'subtasks-generation': 5,  // 子任務生成批量大小
      'productivity-tips': 4,    // 生產力建議批量大小
      'learning-questions': 6,   // 學習問題批量大小
      'personalization-questions': 10 // 🔧 修復：增加批次大小，讓 AI 決定最適數量
    };
    
    this.batchTimeouts = {
      'learning-plan': 3000,        // 3秒批量超時
      'subtasks-generation': 2000,  // 2秒批量超時
      'productivity-tips': 5000,    // 5秒批量超時（統計類型相對穩定）
      'learning-questions': 4000,   // 4秒批量超時
      'personalization-questions': 3000 // 3秒批量超時
    };

    // 批量處理統計
    this.stats = {
      totalRequests: 0,
      batchedRequests: 0,
      savedApiCalls: 0,
      estimatedCostSaved: 0,
      averageBatchSize: 0,
      processingTimes: []
    };

    console.log('🔄 Batch Processing Service initialized');
  }

  /**
   * 添加請求到批量隊列
   */
  async addToBatch(requestType, requestData, options = {}) {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      const queueItem = {
        id: requestId,
        type: requestType,
        data: requestData,
        options,
        resolve,
        reject,
        timestamp: Date.now()
      };

      // 初始化該類型的隊列
      if (!this.batchQueue.has(requestType)) {
        this.batchQueue.set(requestType, []);
      }

      // 添加到隊列
      const queue = this.batchQueue.get(requestType);
      queue.push(queueItem);

      this.stats.totalRequests++;

      console.log(`📥 Added request to ${requestType} batch queue (${queue.length}/${this.batchSizes[requestType]})`);

      // 檢查是否達到批量大小或設置超時
      this.checkBatchReady(requestType);
    });
  }

  /**
   * 檢查批量是否準備好處理
   */
  checkBatchReady(requestType) {
    const queue = this.batchQueue.get(requestType);
    const batchSize = this.batchSizes[requestType] || 3;
    const timeout = this.batchTimeouts[requestType] || 3000;

    // 如果達到批量大小，立即處理
    if (queue.length >= batchSize) {
      console.log(`🚀 Batch size reached for ${requestType}, processing immediately`);
      this.processBatch(requestType);
      return;
    }

    // 設置超時處理（如果還沒有設置）
    if (!this.processingTimers.has(requestType)) {
      const timer = setTimeout(() => {
        if (queue.length > 0) {
          console.log(`⏰ Batch timeout reached for ${requestType}, processing ${queue.length} requests`);
          this.processBatch(requestType);
        }
      }, timeout);

      this.processingTimers.set(requestType, timer);
    }
  }

  /**
   * 處理批量請求
   */
  async processBatch(requestType) {
    const startTime = Date.now();
    
    try {
      // 清除計時器
      if (this.processingTimers.has(requestType)) {
        clearTimeout(this.processingTimers.get(requestType));
        this.processingTimers.delete(requestType);
      }

      const queue = this.batchQueue.get(requestType);
      if (!queue || queue.length === 0) {
        return;
      }

      // 取出所有待處理的請求
      const requests = queue.splice(0);
      console.log(`🔄 Processing batch of ${requests.length} ${requestType} requests`);

      // 根據請求類型選擇批量處理策略
      const results = await this.executeBatchStrategy(requestType, requests);

      // 返回結果給所有等待的請求
      requests.forEach((request, index) => {
        if (results[index] && !results[index].error) {
          request.resolve(results[index]);
        } else {
          request.reject(new Error(results[index]?.error || 'Batch processing failed'));
        }
      });

      // 更新統計
      this.updateBatchStats(requests.length, Date.now() - startTime);

      console.log(`✅ Batch processing completed for ${requestType} in ${Date.now() - startTime}ms`);

    } catch (error) {
      console.error(`❌ Batch processing failed for ${requestType}:`, error);
      
      // 處理錯誤，單獨重試每個請求
      const queue = this.batchQueue.get(requestType);
      if (queue) {
        const requests = queue.splice(0);
        this.fallbackToIndividualProcessing(requests);
      }
    }
  }

  /**
   * 執行批量處理策略
   */
  async executeBatchStrategy(requestType, requests) {
    switch (requestType) {
      case 'learning-plan':
        return await this.batchLearningPlans(requests);
      
      case 'subtasks-generation':
        return await this.batchSubtasksGeneration(requests);
      
      case 'productivity-tips':
        return await this.batchProductivityTips(requests);
      
      case 'learning-questions':
        return await this.batchLearningQuestions(requests);
      
      case 'personalization-questions':
        return await this.batchPersonalizationQuestions(requests);
      
      default:
        // 後備處理：分別處理每個請求
        return await this.fallbackToIndividualProcessing(requests);
    }
  }

  /**
   * 批量處理學習計劃
   */
  async batchLearningPlans(requests) {
    try {
      // 檢查快取命中
      const cacheChecks = await Promise.all(
        requests.map(async (req) => {
          const cached = await cacheGet('learning-plan', req.data, req.options);
          return { cached, request: req };
        })
      );

      // 分離快取命中和未命中的請求
      const cachedResults = [];
      const uncachedRequests = [];

      cacheChecks.forEach(({ cached, request }, index) => {
        if (cached) {
          cachedResults[index] = cached;
          console.log(`🎯 Cache hit for learning plan: ${request.data.title}`);
        } else {
          uncachedRequests.push({ request, index });
        }
      });

      // 如果所有請求都有快取，直接返回
      if (uncachedRequests.length === 0) {
        return cachedResults;
      }

      // 創建批量提示詞
      const batchPrompt = this.createBatchLearningPlanPrompt(uncachedRequests.map(item => item.request));
      
      // 執行批量 AI 調用
      const batchResponse = await callGeminiStructured(
        batchPrompt.systemPrompt,
        batchPrompt.userPrompt,
        {
          schemaType: 'batchLearningPlans',
          maxTokens: Math.min(8000, uncachedRequests.length * 2000),
          temperature: 0.1
        }
      );

      // 處理批量響應
      const results = Array(requests.length).fill(null);
      
      // 填入快取結果
      cacheChecks.forEach(({ cached }, index) => {
        if (cached) {
          results[index] = cached;
        }
      });

      // 填入新生成的結果並保存到快取
      if (batchResponse.plans && Array.isArray(batchResponse.plans)) {
        await Promise.all(
          uncachedRequests.map(async ({ request, index }, planIndex) => {
            if (batchResponse.plans[planIndex]) {
              const planResult = batchResponse.plans[planIndex];
              results[index] = planResult;
              
              // 保存到快取
              await cacheSet('learning-plan', request.data, planResult, request.options);
            }
          })
        );
      }

      // 計算節省的 API 調用次數
      const savedCalls = Math.max(0, uncachedRequests.length - 1);
      this.stats.savedApiCalls += savedCalls;
      this.stats.estimatedCostSaved += savedCalls * 8; // 估算每次調用8美分

      return results;

    } catch (error) {
      console.error('❌ Batch learning plan processing failed:', error);
      throw error;
    }
  }

  /**
   * 批量處理子任務生成
   */
  async batchSubtasksGeneration(requests) {
    try {
      // 檢查快取
      const cacheChecks = await Promise.all(
        requests.map(async (req) => {
          const cached = await cacheGet('subtasks-generation', req.data, req.options);
          return { cached, request: req };
        })
      );

      const cachedResults = [];
      const uncachedRequests = [];

      cacheChecks.forEach(({ cached, request }, index) => {
        if (cached) {
          cachedResults[index] = cached;
        } else {
          uncachedRequests.push({ request, index });
        }
      });

      if (uncachedRequests.length === 0) {
        return cachedResults;
      }

      // 創建批量子任務生成提示詞
      const batchPrompt = this.createBatchSubtasksPrompt(uncachedRequests.map(item => item.request));
      
      const batchResponse = await callGeminiStructured(
        batchPrompt.systemPrompt,
        batchPrompt.userPrompt,
        {
          schemaType: 'batchSubtasks',
          maxTokens: Math.min(6000, uncachedRequests.length * 1500),
          temperature: 0.2
        }
      );

      const results = Array(requests.length).fill(null);
      
      // 填入結果和快取
      cacheChecks.forEach(({ cached }, index) => {
        if (cached) {
          results[index] = cached;
        }
      });

      if (batchResponse.taskGroups && Array.isArray(batchResponse.taskGroups)) {
        await Promise.all(
          uncachedRequests.map(async ({ request, index }, groupIndex) => {
            if (batchResponse.taskGroups[groupIndex]) {
              const subtasksResult = { subtasks: batchResponse.taskGroups[groupIndex].subtasks };
              results[index] = subtasksResult;
              
              await cacheSet('subtasks-generation', request.data, subtasksResult, request.options);
            }
          })
        );
      }

      const savedCalls = Math.max(0, uncachedRequests.length - 1);
      this.stats.savedApiCalls += savedCalls;
      this.stats.estimatedCostSaved += savedCalls * 6;

      return results;

    } catch (error) {
      console.error('❌ Batch subtasks generation failed:', error);
      throw error;
    }
  }

  /**
   * 批量處理生產力建議
   */
  async batchProductivityTips(requests) {
    try {
      // 標準化統計數據以提高快取命中率
      const normalizedRequests = requests.map(req => ({
        ...req,
        normalizedStats: {
          focusTimeRange: Math.floor((req.data.stats?.focusTime || 0) / 30) * 30,
          tasksCompletedRange: Math.floor((req.data.stats?.tasksCompleted || 0) / 2) * 2,
          avgSessionRange: Math.floor((req.data.stats?.averageSessionDuration || 0) / 15) * 15,
          distractionsRange: Math.floor((req.data.stats?.distractions || 0) / 2) * 2
        }
      }));

      // 檢查快取
      const cacheChecks = await Promise.all(
        normalizedRequests.map(async (req) => {
          const cacheKey = { stats: req.normalizedStats, language: req.options.language };
          const cached = await cacheGet('productivity-tips', cacheKey, req.options);
          return { cached, request: req };
        })
      );

      const cachedResults = [];
      const uncachedRequests = [];

      cacheChecks.forEach(({ cached, request }, index) => {
        if (cached) {
          cachedResults[index] = cached;
        } else {
          uncachedRequests.push({ request, index });
        }
      });

      if (uncachedRequests.length === 0) {
        return cachedResults;
      }

      // 分組相似的統計數據以進一步優化
      const groupedRequests = this.groupSimilarStats(uncachedRequests);
      const batchPrompt = this.createBatchProductivityTipsPrompt(groupedRequests);
      
      const batchResponse = await callGeminiStructured(
        batchPrompt.systemPrompt,
        batchPrompt.userPrompt,
        {
          schemaType: 'batchProductivityTips',
          maxTokens: Math.min(4000, groupedRequests.length * 800),
          temperature: 0.3
        }
      );

      const results = Array(requests.length).fill(null);
      
      // 填入快取結果
      cacheChecks.forEach(({ cached }, index) => {
        if (cached) {
          results[index] = cached;
        }
      });

      // 處理批量響應並保存快取
      if (batchResponse.tipGroups && Array.isArray(batchResponse.tipGroups)) {
        await Promise.all(
          groupedRequests.map(async (group, groupIndex) => {
            if (batchResponse.tipGroups[groupIndex]) {
              const tipsResult = { tips: batchResponse.tipGroups[groupIndex].tips };
              
              // 將結果應用到所有相似的請求
              for (const requestItem of group.requests) {
                results[requestItem.index] = tipsResult;
                
                // 保存到快取
                const cacheKey = { stats: requestItem.request.normalizedStats, language: requestItem.request.options.language };
                await cacheSet('productivity-tips', cacheKey, tipsResult, requestItem.request.options);
              }
            }
          })
        );
      }

      const savedCalls = Math.max(0, uncachedRequests.length - groupedRequests.length);
      this.stats.savedApiCalls += savedCalls;
      this.stats.estimatedCostSaved += savedCalls * 4;

      return results;

    } catch (error) {
      console.error('❌ Batch productivity tips processing failed:', error);
      throw error;
    }
  }

  /**
   * 批量處理學習問題
   */
  async batchLearningQuestions(requests) {
    try {
      const cacheChecks = await Promise.all(
        requests.map(async (req) => {
          const cached = await cacheGet('learning-questions', req.data, req.options);
          return { cached, request: req };
        })
      );

      const cachedResults = [];
      const uncachedRequests = [];

      cacheChecks.forEach(({ cached, request }, index) => {
        if (cached) {
          cachedResults[index] = cached;
        } else {
          uncachedRequests.push({ request, index });
        }
      });

      if (uncachedRequests.length === 0) {
        return cachedResults;
      }

      const batchPrompt = this.createBatchLearningQuestionsPrompt(uncachedRequests.map(item => item.request));
      
      const batchResponse = await callGeminiStructured(
        batchPrompt.systemPrompt,
        batchPrompt.userPrompt,
        {
          schemaType: 'batchLearningQuestions',
          maxTokens: Math.min(3000, uncachedRequests.length * 600),
          temperature: 0.2
        }
      );

      const results = Array(requests.length).fill(null);
      
      cacheChecks.forEach(({ cached }, index) => {
        if (cached) {
          results[index] = cached;
        }
      });

      if (batchResponse.questionGroups && Array.isArray(batchResponse.questionGroups)) {
        await Promise.all(
          uncachedRequests.map(async ({ request, index }, groupIndex) => {
            if (batchResponse.questionGroups[groupIndex]) {
              const questionsResult = { questions: batchResponse.questionGroups[groupIndex].questions };
              results[index] = questionsResult;
              
              await cacheSet('learning-questions', request.data, questionsResult, request.options);
            }
          })
        );
      }

      const savedCalls = Math.max(0, uncachedRequests.length - 1);
      this.stats.savedApiCalls += savedCalls;
      this.stats.estimatedCostSaved += savedCalls * 3;

      return results;

    } catch (error) {
      console.error('❌ Batch learning questions processing failed:', error);
      throw error;
    }
  }

  /**
   * 批量處理個人化問題
   */
  async batchPersonalizationQuestions(requests) {
    try {
      const cacheChecks = await Promise.all(
        requests.map(async (req) => {
          const cached = await cacheGet('personalization-questions', req.data, req.options);
          return { cached, request: req };
        })
      );

      const cachedResults = [];
      const uncachedRequests = [];

      cacheChecks.forEach(({ cached, request }, index) => {
        if (cached) {
          cachedResults[index] = cached;
        } else {
          uncachedRequests.push({ request, index });
        }
      });

      if (uncachedRequests.length === 0) {
        return cachedResults;
      }

      const batchPrompt = this.createBatchPersonalizationPrompt(uncachedRequests.map(item => item.request));
      
      const batchResponse = await callGeminiStructured(
        batchPrompt.systemPrompt,
        batchPrompt.userPrompt,
        {
          schemaType: 'batchPersonalizationQuestions',
          maxTokens: Math.min(4000, uncachedRequests.length * 1000),
          temperature: 0.1
        }
      );

      const results = Array(requests.length).fill(null);
      
      cacheChecks.forEach(({ cached }, index) => {
        if (cached) {
          results[index] = cached;
        }
      });

      if (batchResponse.questionGroups && Array.isArray(batchResponse.questionGroups)) {
        await Promise.all(
          uncachedRequests.map(async ({ request, index }, groupIndex) => {
            if (batchResponse.questionGroups[groupIndex]) {
              const questionsResult = { questions: batchResponse.questionGroups[groupIndex].questions };
              results[index] = questionsResult;
              
              await cacheSet('personalization-questions', request.data, questionsResult, request.options);
            }
          })
        );
      }

      const savedCalls = Math.max(0, uncachedRequests.length - 1);
      this.stats.savedApiCalls += savedCalls;
      this.stats.estimatedCostSaved += savedCalls * 5;

      return results;

    } catch (error) {
      console.error('❌ Batch personalization questions processing failed:', error);
      throw error;
    }
  }

  /**
   * 創建批量學習計劃提示詞
   */
  createBatchLearningPlanPrompt(requests) {
    const language = requests[0]?.options?.language || 'zh';
    const isZh = language === 'zh';

    const systemPrompt = isZh
      ? `你是專業的學習規劃師。你將同時為多個學習任務生成完整的學習計劃。每個計劃應該包含個人化問題、詳細學習計劃和具體子任務。

**批量處理要求:**
1. 為每個任務生成獨立的完整學習計劃
2. 保持每個計劃的個性化和針對性
3. 確保計劃結構一致但內容不同
4. 優化批量處理的效率

**回應格式:** 返回一個包含所有學習計劃的陣列，每個計劃包含完整的結構。`
      : `You are a professional learning planner. You will simultaneously generate complete learning plans for multiple learning tasks. Each plan should include personalization questions, detailed learning plans, and specific subtasks.

**Batch processing requirements:**
1. Generate independent complete learning plans for each task
2. Maintain personalization and targeting for each plan
3. Ensure consistent plan structure but different content
4. Optimize batch processing efficiency

**Response format:** Return an array containing all learning plans, each plan including complete structure.`;

    const userPrompt = isZh
      ? `請為以下 ${requests.length} 個學習任務同時生成完整的學習計劃：

${requests.map((req, index) => `
**任務 ${index + 1}:**
- 標題: ${req.data.title}
- 描述: ${req.data.description || '無特殊描述'}
- 任務類型: ${req.data.taskType || 'skill_learning'}
- 當前程度: ${req.data.currentProficiency || 'beginner'}
- 目標程度: ${req.data.targetProficiency || 'intermediate'}
`).join('\n')}

請為每個任務生成包含個人化問題、學習計劃和子任務的完整計劃。`
      : `Please simultaneously generate complete learning plans for the following ${requests.length} learning tasks:

${requests.map((req, index) => `
**Task ${index + 1}:**
- Title: ${req.data.title}
- Description: ${req.data.description || 'No specific description'}
- Task Type: ${req.data.taskType || 'skill_learning'}
- Current Proficiency: ${req.data.currentProficiency || 'beginner'}
- Target Proficiency: ${req.data.targetProficiency || 'intermediate'}
`).join('\n')}

Please generate complete plans including personalization questions, learning plans, and subtasks for each task.`;

    return { systemPrompt, userPrompt };
  }

  /**
   * 創建批量子任務提示詞
   */
  createBatchSubtasksPrompt(requests) {
    const language = requests[0]?.options?.language || 'zh';
    const isZh = language === 'zh';

    const systemPrompt = isZh
      ? `你是專業的任務分解專家。你將同時為多個學習任務生成詳細的子任務列表。

**批量處理要求:**
1. 為每個任務生成 5-8 個具體子任務
2. 每個子任務時長 30-120 分鐘
3. 難度循序漸進
4. 包含學習資源推薦

**回應格式:** 返回一個任務組陣列，每組包含該任務的所有子任務。`
      : `You are a professional task decomposition expert. You will simultaneously generate detailed subtask lists for multiple learning tasks.

**Batch processing requirements:**
1. Generate 5-8 specific subtasks for each task
2. Each subtask duration 30-120 minutes
3. Progressive difficulty
4. Include learning resource recommendations

**Response format:** Return an array of task groups, each group containing all subtasks for that task.`;

    const userPrompt = isZh
      ? `請為以下 ${requests.length} 個學習任務同時生成子任務列表：

${requests.map((req, index) => `
**任務 ${index + 1}:**
- 標題: ${req.data.title}
- 描述: ${req.data.description || '無特殊描述'}
- 任務類型: ${req.data.taskType || 'skill_learning'}
`).join('\n')}

請為每個任務生成實用且可執行的子任務列表。`
      : `Please simultaneously generate subtask lists for the following ${requests.length} learning tasks:

${requests.map((req, index) => `
**Task ${index + 1}:**
- Title: ${req.data.title}
- Description: ${req.data.description || 'No specific description'}
- Task Type: ${req.data.taskType || 'skill_learning'}
`).join('\n')}

Please generate practical and executable subtask lists for each task.`;

    return { systemPrompt, userPrompt };
  }

  /**
   * 創建批量生產力建議提示詞
   */
  createBatchProductivityTipsPrompt(groupedRequests) {
    const language = groupedRequests[0]?.requests[0]?.request?.options?.language || 'zh';
    const isZh = language === 'zh';

    const systemPrompt = isZh
      ? `你是專業的生產力顧問。你將同時為多組不同的使用者統計數據生成個人化的生產力建議。

**批量處理要求:**
1. 為每組統計數據生成 3-5 個針對性建議
2. 考慮統計數據的模式和趨勢
3. 提供可立即執行的改進方案
4. 確保建議的實用性和可行性

**回應格式:** 返回一個建議組陣列，每組包含該統計模式的所有建議。`
      : `You are a professional productivity consultant. You will simultaneously generate personalized productivity suggestions for multiple groups of different user statistics.

**Batch processing requirements:**
1. Generate 3-5 targeted suggestions for each statistical group
2. Consider patterns and trends in the statistics
3. Provide immediately actionable improvement solutions
4. Ensure practicality and feasibility of suggestions

**Response format:** Return an array of suggestion groups, each group containing all suggestions for that statistical pattern.`;

    const userPrompt = isZh
      ? `請為以下 ${groupedRequests.length} 組不同的使用者統計模式同時生成生產力建議：

${groupedRequests.map((group, index) => `
**統計模式 ${index + 1}:** (${group.requests.length} 位使用者)
- 專注時間範圍: ${group.pattern.focusTimeRange} 分鐘
- 完成任務範圍: ${group.pattern.tasksCompletedRange} 個
- 平均專注時長範圍: ${group.pattern.avgSessionRange} 分鐘
- 干擾次數範圍: ${group.pattern.distractionsRange} 次
`).join('\n')}

請為每個統計模式生成具體可行的生產力改進建議。`
      : `Please simultaneously generate productivity suggestions for the following ${groupedRequests.length} different user statistical patterns:

${groupedRequests.map((group, index) => `
**Statistical Pattern ${index + 1}:** (${group.requests.length} users)
- Focus time range: ${group.pattern.focusTimeRange} minutes
- Completed tasks range: ${group.pattern.tasksCompletedRange} tasks
- Average session duration range: ${group.pattern.avgSessionRange} minutes
- Distractions range: ${group.pattern.distractionsRange} times
`).join('\n')}

Please generate specific and actionable productivity improvement suggestions for each statistical pattern.`;

    return { systemPrompt, userPrompt };
  }

  /**
   * 創建批量學習問題提示詞
   */
  createBatchLearningQuestionsPrompt(requests) {
    const language = requests[0]?.options?.language || 'zh';
    const isZh = language === 'zh';

    const systemPrompt = isZh
      ? `你是專業的教育評估專家。你將同時為多個學習摘要生成復習問題。

**批量處理要求:**
1. 為每個摘要生成 3-6 個高質量問題
2. 涵蓋不同的認知層次
3. 促進深度思考和理解
4. 幫助知識鞏固和應用

**回應格式:** 返回一個問題組陣列，每組包含該摘要的所有復習問題。`
      : `You are a professional educational assessment expert. You will simultaneously generate review questions for multiple learning summaries.

**Batch processing requirements:**
1. Generate 3-6 high-quality questions for each summary
2. Cover different cognitive levels
3. Promote deep thinking and understanding
4. Help consolidate and apply knowledge

**Response format:** Return an array of question groups, each group containing all review questions for that summary.`;

    const userPrompt = isZh
      ? `請為以下 ${requests.length} 個學習摘要同時生成復習問題：

${requests.map((req, index) => `
**摘要 ${index + 1}:**
${req.data.summary}
`).join('\n\n')}

請為每個摘要生成有助於知識鞏固的復習問題。`
      : `Please simultaneously generate review questions for the following ${requests.length} learning summaries:

${requests.map((req, index) => `
**Summary ${index + 1}:**
${req.data.summary}
`).join('\n\n')}

Please generate review questions that help consolidate knowledge for each summary.`;

    return { systemPrompt, userPrompt };
  }

  /**
   * 創建批量個人化問題提示詞
   */
  createBatchPersonalizationPrompt(requests) {
    const language = requests[0]?.options?.language || 'zh';
    const isZh = language === 'zh';

    const systemPrompt = isZh
      ? `你是專業的個人化學習評估專家。你將同時為多個學習任務生成個人化診斷問題。

**批量處理要求:**
1. 為每個任務生成 4-7 個深度診斷問題
2. 問題應幫助了解學習者的背景和需求
3. 涵蓋經驗水平、學習偏好、時間安排等方面
4. 確保問題的針對性和有效性

**回應格式:** 返回一個問題組陣列，每組包含該任務的所有個人化問題。`
      : `You are a professional personalized learning assessment expert. You will simultaneously generate personalized diagnostic questions for multiple learning tasks.

**Batch processing requirements:**
1. Generate 4-7 deep diagnostic questions for each task
2. Questions should help understand learner background and needs
3. Cover experience level, learning preferences, time scheduling, etc.
4. Ensure targeting and effectiveness of questions

**Response format:** Return an array of question groups, each group containing all personalization questions for that task.`;

    const userPrompt = isZh
      ? `請為以下 ${requests.length} 個學習任務同時生成個人化診斷問題：

${requests.map((req, index) => `
**任務 ${index + 1}:**
- 標題: ${req.data.title}
- 描述: ${req.data.description || '無特殊描述'}
`).join('\n')}

請為每個任務生成有助於個人化學習規劃的診斷問題。`
      : `Please simultaneously generate personalized diagnostic questions for the following ${requests.length} learning tasks:

${requests.map((req, index) => `
**Task ${index + 1}:**
- Title: ${req.data.title}
- Description: ${req.data.description || 'No specific description'}
`).join('\n')}

Please generate diagnostic questions that help with personalized learning planning for each task.`;

    return { systemPrompt, userPrompt };
  }

  /**
   * 分組相似的統計數據
   */
  groupSimilarStats(uncachedRequests) {
    const groups = [];
    
    uncachedRequests.forEach(requestItem => {
      const stats = requestItem.request.normalizedStats;
      
      // 尋找相似的組
      let foundGroup = groups.find(group => 
        this.areStatsSimilar(group.pattern, stats)
      );
      
      if (foundGroup) {
        foundGroup.requests.push(requestItem);
      } else {
        // 創建新組
        groups.push({
          pattern: stats,
          requests: [requestItem]
        });
      }
    });
    
    return groups;
  }

  /**
   * 檢查統計數據是否相似
   */
  areStatsSimilar(stats1, stats2) {
    return (
      stats1.focusTimeRange === stats2.focusTimeRange &&
      stats1.tasksCompletedRange === stats2.tasksCompletedRange &&
      stats1.avgSessionRange === stats2.avgSessionRange &&
      stats1.distractionsRange === stats2.distractionsRange
    );
  }

  /**
   * 後備單獨處理（當批量處理失敗時）
   */
  async fallbackToIndividualProcessing(requests) {
    console.log(`🔄 Falling back to individual processing for ${requests.length} requests`);
    
    const results = await Promise.allSettled(
      requests.map(async (request) => {
        try {
          // 這裡應該調用原始的單獨處理邏輯
          // 為了簡化，我們返回一個錯誤，實際實現中應該調用對應的單獨處理函數
          throw new Error('Individual processing not implemented in fallback');
        } catch (error) {
          return { error: error.message };
        }
      })
    );

    return results.map(result => 
      result.status === 'fulfilled' ? result.value : { error: result.reason.message }
    );
  }

  /**
   * 生成請求 ID
   */
  generateRequestId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 更新批量處理統計
   */
  updateBatchStats(batchSize, processingTime) {
    this.stats.batchedRequests += batchSize;
    this.stats.processingTimes.push(processingTime);
    
    // 更新平均批量大小
    const totalBatches = this.stats.processingTimes.length;
    this.stats.averageBatchSize = this.stats.batchedRequests / totalBatches;
    
    console.log(`📊 Batch Stats - Total: ${this.stats.totalRequests}, Batched: ${this.stats.batchedRequests}, Saved: ${this.stats.savedApiCalls}, Cost Saved: $${(this.stats.estimatedCostSaved / 100).toFixed(2)}`);
  }

  /**
   * 獲取批量處理統計
   */
  getStats() {
    const avgProcessingTime = this.stats.processingTimes.length > 0
      ? this.stats.processingTimes.reduce((a, b) => a + b, 0) / this.stats.processingTimes.length
      : 0;

    return {
      ...this.stats,
      averageProcessingTime: Math.round(avgProcessingTime),
      batchEfficiency: this.stats.totalRequests > 0 
        ? ((this.stats.batchedRequests / this.stats.totalRequests) * 100).toFixed(2) + '%'
        : '0%',
      estimatedCostSavedUSD: (this.stats.estimatedCostSaved / 100).toFixed(4)
    };
  }

  /**
   * 重置統計
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      batchedRequests: 0,
      savedApiCalls: 0,
      estimatedCostSaved: 0,
      averageBatchSize: 0,
      processingTimes: []
    };
    
    console.log('📊 Batch processing statistics reset');
  }
}

// 導出類和單例實例
const batchService = new BatchProcessingService();

module.exports = {
  // 導出類
  BatchProcessingService,
  
  // 導出實例方法（向後相容）
  addToBatch: batchService.addToBatch.bind(batchService),
  getStats: batchService.getStats.bind(batchService),
  resetStats: batchService.resetStats.bind(batchService)
}; 