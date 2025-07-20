/**
 * Job Queue Service - 處理非同步 AI 任務生成
 * 
 * 功能：
 * 1. 管理作業生命週期：pending → processing → completed/failed
 * 2. 支援長時間運行的 AI 任務，無固定超時限制
 * 3. 提供作業狀態查詢和結果輪詢
 * 4. 自動清理過期作業
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;

// 作業狀態枚舉
const JOB_STATUS = {
  PENDING: 'pending',        // 等待處理
  PROCESSING: 'processing',  // 正在處理
  COMPLETED: 'completed',    // 完成
  FAILED: 'failed',         // 失敗
  TIMEOUT: 'timeout'        // 超時（軟超時，不會立即失敗）
};

// 作業類型枚舉
const JOB_TYPES = {
  TASK_PLANNING: 'task_planning',           // 完整任務規劃
  PERSONALIZATION: 'personalization',      // 個人化問題生成
  SUBTASK_GENERATION: 'subtask_generation', // 子任務生成
  LEARNING_PLAN: 'learning_plan'           // 學習計劃生成
};

class JobQueueService {
  constructor() {
    this.jobs = new Map(); // 內存中的作業存儲
    this.processingQueue = []; // 處理佇列
    this.maxConcurrentJobs = 3; // 最大並發作業數
    this.activeProcessors = 0;
    this.jobTimeout = 1 * 60 * 1000; // 1分鐘軟超時（僅警告，不終止）
    this.jobExpiryTime = 30 * 60 * 1000; // 30分鐘後清理完成的作業
    this.statsFilePath = path.join(__dirname, '../../monitoring/job-stats.json');
    
    // 統計數據
    this.stats = {
      totalJobsCreated: 0,
      totalJobsCompleted: 0,
      totalJobsFailed: 0,
      averageProcessingTime: 0,
      currentActiveJobs: 0,
      longestJobDuration: 0
    };

    // 啟動後台任務
    this.startCleanupTask();
    this.startProcessingLoop();
  }

  /**
   * 創建新作業
   * @param {string} type - 作業類型
   * @param {object} params - 作業參數
   * @param {object} options - 選項配置
   * @returns {string} jobId
   */
  createJob(type, params, options = {}) {
    const jobId = uuidv4();
    const now = Date.now();
    
    const job = {
      id: jobId,
      type,
      params,
      options,
      status: JOB_STATUS.PENDING,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
      progress: {
        stage: 'queued',
        message: '作業已建立，等待處理...',
        percentage: 0
      },
      metadata: {
        priority: options.priority || 'normal',
        userId: options.userId || 'anonymous',
        retryCount: 0,
        maxRetries: options.maxRetries || 2,
        estimatedDuration: this.estimateJobDuration(type),
        tags: options.tags || []
      }
    };

    this.jobs.set(jobId, job);
    this.processingQueue.push(jobId);
    this.stats.totalJobsCreated++;
    this.stats.currentActiveJobs++;

    console.log(`📝 [JOB-QUEUE] Created job ${jobId} (${type})`);
    
    // 觸發處理
    this.processNextJob();
    
    return jobId;
  }

  /**
   * 獲取作業狀態
   * @param {string} jobId - 作業ID
   * @returns {object|null} 作業信息
   */
  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    // 計算運行時間
    const now = Date.now();
    const runningTime = job.startedAt ? now - job.startedAt : 0;
    
    // 檢查軟超時
    if (job.status === JOB_STATUS.PROCESSING && runningTime > this.jobTimeout) {
      job.status = JOB_STATUS.TIMEOUT;
      job.progress.message = '作業處理時間較長，但仍在進行中...';
      job.progress.stage = 'delayed';
    }

    return {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      runningTime,
      estimatedDuration: job.metadata.estimatedDuration,
      isDelayed: job.status === JOB_STATUS.TIMEOUT
    };
  }

  /**
   * 取消作業
   * @param {string} jobId - 作業ID
   * @returns {boolean} 是否成功取消
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === JOB_STATUS.PENDING) {
      // 從佇列中移除
      const index = this.processingQueue.indexOf(jobId);
      if (index > -1) {
        this.processingQueue.splice(index, 1);
      }
      
      job.status = JOB_STATUS.FAILED;
      job.error = 'Job cancelled by user';
      job.completedAt = Date.now();
      job.updatedAt = Date.now();
      
      this.stats.currentActiveJobs--;
      this.stats.totalJobsFailed++;
      
      return true;
    }

    return false; // 無法取消正在處理的作業
  }

  /**
   * 開始處理下一個作業
   */
  async processNextJob() {
    // 檢查並發限制
    if (this.activeProcessors >= this.maxConcurrentJobs) {
      return;
    }

    // 獲取下一個待處理作業
    const jobId = this.processingQueue.shift();
    if (!jobId) {
      return;
    }

    const job = this.jobs.get(jobId);
    if (!job || job.status !== JOB_STATUS.PENDING) {
      // 作業已被取消或無效，處理下一個
      this.processNextJob();
      return;
    }

    this.activeProcessors++;
    await this.executeJob(job);
    this.activeProcessors--;

    // 繼續處理佇列中的下一個作業
    setImmediate(() => this.processNextJob());
  }

  /**
   * 執行作業
   * @param {object} job - 作業對象
   */
  async executeJob(job) {
    const startTime = Date.now();
    
    try {
      // 更新狀態為處理中
      job.status = JOB_STATUS.PROCESSING;
      job.startedAt = startTime;
      job.updatedAt = startTime;
      job.progress.stage = 'processing';
      job.progress.message = '正在處理您的請求...';
      job.progress.percentage = 10;

      console.log(`🔄 [JOB-QUEUE] Processing job ${job.id} (${job.type})`);

      // 根據作業類型執行相應的處理
      let result;
      switch (job.type) {
        case JOB_TYPES.TASK_PLANNING:
          result = await this.processTaskPlanning(job);
          break;
        case JOB_TYPES.PERSONALIZATION:
          result = await this.processPersonalization(job);
          break;
        case JOB_TYPES.SUBTASK_GENERATION:
          result = await this.processSubtaskGeneration(job);
          break;
        case JOB_TYPES.LEARNING_PLAN:
          result = await this.processLearningPlan(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // 作業完成
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      job.status = JOB_STATUS.COMPLETED;
      job.result = result;
      job.completedAt = endTime;
      job.updatedAt = endTime;
      job.progress.stage = 'completed';
      job.progress.message = '處理完成！';
      job.progress.percentage = 100;

      // 更新統計
      this.stats.totalJobsCompleted++;
      this.stats.currentActiveJobs--;
      this.updateAverageProcessingTime(duration);
      
      if (duration > this.stats.longestJobDuration) {
        this.stats.longestJobDuration = duration;
      }

      console.log(`✅ [JOB-QUEUE] Job ${job.id} completed in ${duration}ms`);

    } catch (error) {
      // 作業失敗
      const endTime = Date.now();
      
      console.error(`❌ [JOB-QUEUE] Job ${job.id} failed:`, error);
      
      job.status = JOB_STATUS.FAILED;
      job.error = {
        message: error.message,
        type: error.constructor.name,
        timestamp: endTime
      };
      job.completedAt = endTime;
      job.updatedAt = endTime;
      job.progress.stage = 'failed';
      job.progress.message = `處理失敗：${error.message}`;
      job.progress.percentage = 0;

      // 檢查是否需要重試
      if (job.metadata.retryCount < job.metadata.maxRetries) {
        job.metadata.retryCount++;
        job.status = JOB_STATUS.PENDING;
        job.startedAt = null;
        job.progress.stage = 'retrying';
        job.progress.message = `重試中 (${job.metadata.retryCount}/${job.metadata.maxRetries})...`;
        
        // 重新加入佇列
        this.processingQueue.push(job.id);
        console.log(`🔄 [JOB-QUEUE] Retrying job ${job.id} (attempt ${job.metadata.retryCount})`);
      } else {
        // 最終失敗
        this.stats.totalJobsFailed++;
        this.stats.currentActiveJobs--;
      }
    }

    // 保存統計數據
    await this.saveStats();
  }

  /**
   * 處理完整任務規劃
   */
  async processTaskPlanning(job) {
    const { title, description, language = 'zh' } = job.params;
    
    // 導入 AI 服務
    const { constructDiagnosticPrompt } = require('../prompts/personalization_prompt');
    const GeminiService = require('./geminiService');
    const geminiService = new GeminiService();

    // 階段1：生成個人化問題
    job.progress.percentage = 30;
    job.progress.message = '分析任務並生成個人化問題...';
    
    const { systemPrompt, userPrompt } = constructDiagnosticPrompt({
      taskTitle: title,
      taskDescription: description,
      language,
    });

    const diagnosticResult = await geminiService.callGeminiStructured(
      systemPrompt,
      userPrompt,
      {
        schemaType: 'personalizationQuestions',
        maxTokens: 2000,
        temperature: 0.1
      }
    );

    // 階段2：檢查是否需要更多信息
    job.progress.percentage = 60;
    job.progress.message = '分析任務複雜度...';

    if (diagnosticResult.isSufficient) {
      // 直接生成完整計劃
      job.progress.percentage = 80;
      job.progress.message = '生成完整學習計劃...';
      
      const planResult = await this.generateUnifiedPlan({
        title,
        description,
        taskType: diagnosticResult.autoDetectedTaskType,
        currentProficiency: diagnosticResult.inferredCurrentProficiency,
        language
      });

      return {
        needsClarification: false,
        plan: planResult,
        taskType: diagnosticResult.autoDetectedTaskType,
        inferredProficiency: diagnosticResult.inferredCurrentProficiency
      };
    } else {
      // 需要用戶回答問題
      return {
        needsClarification: true,
        questions: diagnosticResult.questions,
        taskType: diagnosticResult.autoDetectedTaskType,
        inferredProficiency: diagnosticResult.inferredCurrentProficiency,
        initialInsight: diagnosticResult.initialInsight
      };
    }
  }

  /**
   * 處理個人化問題生成
   */
  async processPersonalization(job) {
    const { title, description, language = 'zh' } = job.params;
    
    const { constructDiagnosticPrompt } = require('../prompts/personalization_prompt');
    const GeminiService = require('./geminiService');
    const geminiService = new GeminiService();

    job.progress.percentage = 50;
    job.progress.message = '生成個人化問題...';

    const { systemPrompt, userPrompt } = constructDiagnosticPrompt({
      taskTitle: title,
      taskDescription: description,
      language,
    });

    const result = await geminiService.callGeminiStructured(
      systemPrompt,
      userPrompt,
      {
        schemaType: 'personalizationQuestions',
        maxTokens: 2000,
        temperature: 0.1
      }
    );

    return {
      questions: result.questions,
      taskType: result.autoDetectedTaskType,
      inferredProficiency: result.inferredCurrentProficiency,
      isSufficient: result.isSufficient
    };
  }

  /**
   * 處理子任務生成
   */
  async processSubtaskGeneration(job) {
    const {
      title,
      description = '',
      clarificationResponses = {},
      dueDate,
      taskType = 'skill_learning',
      currentProficiency = 'beginner',
      targetProficiency = 'intermediate',
      language = 'zh'
    } = job.params;

    const GeminiService = require('./geminiService');
    const geminiService = new GeminiService();

    job.progress.percentage = 40;
    job.progress.message = '分析任務複雜度和時間約束...';

    // 計算時間約束
    let timeContext = '';
    if (dueDate) {
      const today = new Date();
      const targetDate = new Date(dueDate);
      const availableDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      timeContext = availableDays > 0 ? `可用時間：${availableDays} 天` : '緊急：截止日期已到';
    }

    job.progress.percentage = 70;
    job.progress.message = '生成最適化的子任務...';

    const systemPrompt = `您是一位專業的學習設計師。請根據任務複雜度動態生成子任務，數量應基於內容範圍、時間約束和技能差距。

## 輸出格式：
請返回符合 "subtasks" schema 的 JSON 物件。

${language === 'zh' ? '請用繁體中文生成所有內容' : 'Please generate all content in English'}`;

    const userContent = `## 任務信息：
- 標題：${title}
- 描述：${description}
- 任務類型：${taskType}
- 當前水平：${currentProficiency}
- 目標水平：${targetProficiency}
- 時間約束：${timeContext || '無特定截止日期'}

## 個人化上下文：
${Object.keys(clarificationResponses).length > 0 
  ? Object.entries(clarificationResponses).map(([key, value]) => `- ${key}: ${value}`).join('\n')
  : '無額外個人化信息'}

請分析並動態決定最適合的子任務數量，生成詳細的學習子任務。`;

    const result = await geminiService.callGeminiStructured(
      systemPrompt,
      userContent,
      {
        schemaType: 'subtasks',
        maxTokens: 4000,
        temperature: 0.3
      }
    );

    return {
      subtasks: result.subtasks,
      metadata: {
        totalSubtasks: result.subtasks.length,
        generationMethod: 'dynamic_ai_analysis',
        timeContext,
        taskType,
        proficiencyGap: `${currentProficiency} → ${targetProficiency}`
      }
    };
  }

  /**
   * 處理學習計劃生成
   */
  async processLearningPlan(job) {
    const {
      title,
      description = '',
      clarificationResponses = {},
      taskType = 'skill_learning',
      currentProficiency = 'beginner',
      targetProficiency = 'intermediate',
      language = 'zh'
    } = job.params;

    return await this.generateUnifiedPlan({
      title,
      description,
      clarificationResponses,
      taskType,
      currentProficiency,
      targetProficiency,
      language
    });
  }

  /**
   * 生成統一學習計劃
   */
  async generateUnifiedPlan(params) {
    const GeminiService = require('./geminiService');
    const geminiService = new GeminiService();

    const {
      title,
      description = '',
      clarificationResponses = {},
      taskType = 'skill_learning',
      currentProficiency = 'beginner',
      targetProficiency = 'intermediate',
      language = 'zh'
    } = params;

    // 如果沒有個人化回答，僅回傳個人化問題
    if (!clarificationResponses || Object.keys(clarificationResponses).length === 0) {
      const systemPrompt = `請根據以下任務資訊，生成 2-4 個個人化問題以釐清用戶需求：\n- 標題：${title}\n- 描述：${description}\n- 任務類型：${taskType}\n- 當前水平：${currentProficiency}\n- 目標水平：${targetProficiency}`;
      const userContent = '';
      const questionsResult = await geminiService.callGeminiStructured(
        systemPrompt,
        userContent,
        {
          schemaType: 'personalizationQuestions',
          maxTokens: 800,
          temperature: 0.2
        }
      );
      return { personalizationQuestions: questionsResult.questions || [], learningPlan: null, subtasks: [] };
    }

    // 有個人化回答，生成完整學習計劃
    const systemPrompt = `您是一位專業的學習設計師。請創建完整的學習計劃，包括可實現的目標、推薦工具、檢查點和動態生成的子任務。\n${language === 'zh' ? '所有內容必須使用繁體中文' : 'All content must be in English'}`;
    const userContent = `## 學習任務：\n- 標題：${title}\n- 描述：${description}\n- 任務類型：${taskType}\n- 當前水平：${currentProficiency}\n- 目標水平：${targetProficiency}\n\n## 個人化信息：\n${Object.entries(clarificationResponses).map(([key, value]) => `- ${key}: ${value}`).join('\n')}`;
    const result = await geminiService.callGeminiStructured(
      systemPrompt,
      userContent,
      {
        schemaType: 'unifiedLearningPlan',
        maxTokens: 8000,
        temperature: 0.3
      }
    );
    return result;
  }

  /**
   * 估算作業處理時間
   */
  estimateJobDuration(type) {
    const estimates = {
      [JOB_TYPES.TASK_PLANNING]: 45000,      // 45秒
      [JOB_TYPES.PERSONALIZATION]: 15000,    // 15秒
      [JOB_TYPES.SUBTASK_GENERATION]: 30000, // 30秒
      [JOB_TYPES.LEARNING_PLAN]: 60000      // 60秒
    };
    
    return estimates[type] || 30000; // 默認30秒
  }

  /**
   * 更新平均處理時間
   */
  updateAverageProcessingTime(duration) {
    const totalCompleted = this.stats.totalJobsCompleted;
    if (totalCompleted === 1) {
      this.stats.averageProcessingTime = duration;
    } else {
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * (totalCompleted - 1) + duration) / totalCompleted;
    }
  }

  /**
   * 開始處理循環
   */
  startProcessingLoop() {
    setInterval(() => {
      if (this.processingQueue.length > 0 && this.activeProcessors < this.maxConcurrentJobs) {
        this.processNextJob();
      }
    }, 1000); // 每秒檢查一次
  }

  /**
   * 開始清理任務
   */
  startCleanupTask() {
    setInterval(() => {
      this.cleanupExpiredJobs();
    }, 5 * 60 * 1000); // 每5分鐘清理一次
  }

  /**
   * 清理過期作業
   */
  cleanupExpiredJobs() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [jobId, job] of this.jobs) {
      const isExpired = (
        (job.status === JOB_STATUS.COMPLETED || job.status === JOB_STATUS.FAILED) &&
        (now - job.completedAt) > this.jobExpiryTime
      );

      if (isExpired) {
        this.jobs.delete(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 [JOB-QUEUE] Cleaned up ${cleanedCount} expired jobs`);
    }
  }

  /**
   * 獲取統計數據
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.processingQueue.length,
      activeJobs: this.activeProcessors,
      totalJobsInMemory: this.jobs.size
    };
  }

  /**
   * 保存統計數據到文件
   */
  async saveStats() {
    try {
      await fs.writeFile(this.statsFilePath, JSON.stringify(this.getStats(), null, 2));
    } catch (error) {
      console.error('Failed to save job stats:', error);
    }
  }

  /**
   * 重置統計數據
   */
  resetStats() {
    this.stats = {
      totalJobsCreated: 0,
      totalJobsCompleted: 0,
      totalJobsFailed: 0,
      averageProcessingTime: 0,
      currentActiveJobs: 0,
      longestJobDuration: 0
    };
  }
}

// 導出服務和常量
module.exports = {
  JobQueueService,
  JOB_STATUS,
  JOB_TYPES
}; 