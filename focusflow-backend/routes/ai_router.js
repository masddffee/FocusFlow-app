// focusflow-backend/routes/ai_router.js

const express = require('express');
const router = express.Router();

// 統一日誌管理
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4
};

class SimpleLogger {
  constructor() {
    const envLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'ERROR' : 'DEBUG');
    this.currentLevel = this.parseLogLevel(envLevel);
    this.context = 'AIRouter';
  }

  parseLogLevel(level) {
    switch (level.toUpperCase()) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': case 'WARNING': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'SILENT': case 'NONE': return LogLevel.SILENT;
      default: return LogLevel.INFO;
    }
  }

  shouldLog(level) {
    return level >= this.currentLevel;
  }

  debug(message, data) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`[DEBUG] [${this.context}] ${message}`, data || '');
    }
  }

  info(message, data) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(`[INFO] [${this.context}] ${message}`, data || '');
    }
  }

  warn(message, data) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[WARN] [${this.context}] ${message}`, data || '');
    }
  }

  error(message, error) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[ERROR] [${this.context}] ${message}`, error || '');
    }
  }
}

const logger = new SimpleLogger();

// 服務與常量
const { JobQueueService, JOB_TYPES, JOB_STATUS } = require('../lib/services/jobQueueService');
const GeminiService = require('../lib/services/geminiService');
const { IntelligentCacheService } = require('../lib/services/cacheService');
const { BatchProcessingService } = require('../lib/services/batchProcessingService');
const { CostMonitoringService } = require('../lib/services/costMonitoringService');
const { CompressionService } = require('../lib/services/compressionService');
const { constructDiagnosticPrompt } = require('../lib/prompts/personalization_prompt');
const { constructUltimateLearningPlanPrompt } = require('../lib/prompts/main_prompt');

// 全局服務實例
const geminiService = new GeminiService();
const cacheService = new IntelligentCacheService();
const batchProcessingService = new BatchProcessingService();
const costMonitoringService = new CostMonitoringService();
const compressionService = new CompressionService();
const jobQueue = new JobQueueService();

const { getAiConfig } = require('../config/serverConfig');

// 🔧 Phase 1B: 使用統一配置系統替代硬編碼配置
const aiConfig = getAiConfig();

// ==========================================
// 🔧 健康檢查和系統狀態端點
// ==========================================
router.get('/health-check', async (req, res) => {
  try {
    const healthResult = await geminiService.checkHealth();
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        gemini: healthResult.isHealthy ? 'healthy' : 'unhealthy',
        cache: 'healthy',
        jobQueue: 'healthy'
      },
      message: 'All systems operational'
    });
  } catch (error) {
    console.error('[HEALTH-CHECK] Error:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

router.get('/system-stats', async (req, res) => {
  try {
    const cacheStats = cacheService.getStats();
    const batchStats = batchProcessingService.getStats();
    const costStats = costMonitoringService.getDetailedStats();
    res.status(200).json({
      cache: cacheStats,
      batch: batchStats,
      cost: costStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[SYSTEM-STATS] Error:', error);
    res.status(500).json({
      error: 'Failed to get system stats',
      message: error.message
    });
  }
});

// ==========================================
// 📊 監控和診斷端點
// ==========================================
router.get('/cache-stats', async (req, res) => {
  try {
    const stats = cacheService.getStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('[CACHE-STATS] Error:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

router.get('/batch-stats', async (req, res) => {
  try {
    const stats = batchProcessingService.getStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('[BATCH-STATS] Error:', error);
    res.status(500).json({ error: 'Failed to get batch stats' });
  }
});

router.get('/cost-stats', async (req, res) => {
  try {
    const stats = costMonitoringService.getDetailedStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('[COST-STATS] Error:', error);
    res.status(500).json({ error: 'Failed to get cost stats' });
  }
});

router.get('/optimization-dashboard', async (req, res) => {
  try {
    const cacheStats = cacheService.getStats();
    const batchStats = batchProcessingService.getStats();
    const costStats = costMonitoringService.getDetailedStats();
    res.status(200).json({
      overview: {
        timestamp: new Date().toISOString(),
        system: 'FocusFlow AI Backend',
        version: '2.0.0'
      },
      cache: cacheStats,
      batch: batchStats,
      cost: costStats,
      recommendations: [
        'System is operating efficiently',
        'Consider reviewing cost patterns weekly',
        'Monitor cache hit rates for optimization opportunities'
      ]
    });
  } catch (error) {
    console.error('[OPTIMIZATION-DASHBOARD] Error:', error);
    res.status(500).json({ error: 'Failed to get optimization dashboard' });
  }
});

// ==========================================
// ⚠️ 已棄用的端點（暫時保留以維持向後兼容性）
// ==========================================
router.post('/personalization-questions', async (req, res) => {
  console.warn('⚠️ [DEPRECATED] /personalization-questions endpoint is deprecated. Use /api/jobs instead.');
  const { title, description = '', language = 'zh' } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Task title is required.' });
  }
  try {
    const jobId = jobQueue.createJob(JOB_TYPES.PERSONALIZATION, { title, description, language });
    res.status(202).json({
      jobId,
      message: 'Request submitted to job queue. Please use /api/jobs/{jobId} to check status.',
      migrationNotice: 'This endpoint is deprecated. Please migrate to POST /api/jobs with type "personalization".',
      pollEndpoint: `/api/jobs/${jobId}`
    });
  } catch (error) {
    console.error('[DEPRECATED-PERSONALIZATION] Error:', error);
    res.status(500).json({
      error: 'Failed to process request',
      message: error.message,
      migrationNotice: 'This endpoint is deprecated. Please migrate to POST /api/jobs.'
    });
  }
});

router.post('/generate-subtasks', async (req, res) => {
  console.warn('⚠️ [DEPRECATED] /generate-subtasks endpoint is deprecated. Use /api/jobs instead.');
  const { title, description = '', clarificationResponses = {}, dueDate, taskType = 'skill_learning', currentProficiency = 'beginner', targetProficiency = 'intermediate', language = 'zh' } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Task title is required.' });
  }
  try {
    const jobId = jobQueue.createJob(JOB_TYPES.SUBTASK_GENERATION, {
      title, description, clarificationResponses, dueDate, taskType, currentProficiency, targetProficiency, language
    });
    res.status(202).json({
      jobId,
      message: 'Subtask generation submitted to job queue.',
      migrationNotice: 'This endpoint is deprecated. Please migrate to POST /api/jobs with type "subtask_generation".',
      pollEndpoint: `/api/jobs/${jobId}`
    });
  } catch (error) {
    console.error('[DEPRECATED-SUBTASKS] Error:', error);
    res.status(500).json({
      error: 'Failed to process request',
      message: error.message,
      migrationNotice: 'This endpoint is deprecated. Please migrate to POST /api/jobs.'
    });
  }
});

router.post('/generate-plan', async (req, res) => {
  console.warn('⚠️ [DEPRECATED] /generate-plan endpoint is deprecated. Use /api/jobs instead.');
  const { title, description = '', clarificationResponses = {}, dueDate, currentProficiency = 'beginner', targetProficiency = 'intermediate', language = 'zh' } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Task title is required.' });
  }
  try {
    const jobId = jobQueue.createJob(JOB_TYPES.LEARNING_PLAN, {
      title, description, clarificationResponses, dueDate, currentProficiency, targetProficiency, language
    });
    res.status(202).json({
      jobId,
      message: 'Learning plan generation submitted to job queue.',
      migrationNotice: 'This endpoint is deprecated. Please migrate to POST /api/jobs with type "learning_plan".',
      pollEndpoint: `/api/jobs/${jobId}`
    });
  } catch (error) {
    console.error('[DEPRECATED-PLAN] Error:', error);
    res.status(500).json({
      error: 'Failed to process request',
      message: error.message,
      migrationNotice: 'This endpoint is deprecated. Please migrate to POST /api/jobs.'
    });
  }
});

// ==========================================
// 🆕 簡化的直接 API 端點（無需 JobQueue）
// ==========================================

/**
 * 🎯 直接生成統一學習計劃 - 簡單同步實現
 * 替代複雜的 JobQueue 系統，直接返回結果
 */
router.post('/generate-unified-plan', async (req, res) => {
  const startTime = Date.now();
  const { 
    title, 
    description = '', 
    language = 'zh',
    taskType = 'skill_learning',
    currentProficiency = 'beginner',
    targetProficiency = 'intermediate',
    clarificationResponses = {}
  } = req.body;

  // 基本驗證
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Task title is required',
      code: 'MISSING_TITLE'
    });
  }

  try {
    logger.info(`🚀 [UNIFIED-PLAN] Starting direct generation for: ${title}`);

    // 決定是否需要個人化問題
    const needsPersonalization = !clarificationResponses || Object.keys(clarificationResponses).length === 0;
    
    if (needsPersonalization) {
      // 第一階段：生成個人化問題
      logger.info('🔍 [UNIFIED-PLAN] Generating personalization questions...');
      
      const personalizationPrompt = constructDiagnosticPrompt({
        title,
        description,
        language,
        taskType,
        currentProficiency,
        targetProficiency
      });

      const questionResponse = await geminiService.callGeminiStructured(
        personalizationPrompt.systemMessage,
        personalizationPrompt.userMessage,
        {
          schemaType: 'personalizationQuestions',
          maxTokens: 1500,
          temperature: 0.2,
          model: aiConfig.defaultModel
        }
      );

      if (questionResponse && questionResponse.questions && questionResponse.questions.length > 0) {
        logger.info(`✅ [UNIFIED-PLAN] Generated ${questionResponse.questions.length} personalization questions`);
        return res.status(200).json({
          success: true,
          stage: 'personalization',
          personalizationQuestions: questionResponse.questions,
          processingTime: Date.now() - startTime
        });
      }
    }

    // 第二階段：生成完整學習計劃和子任務
    logger.info('🎓 [UNIFIED-PLAN] Generating complete learning plan...');
    
    const learningPlanPrompt = constructUltimateLearningPlanPrompt({
      title,
      description,
      language,
      taskType,
      currentProficiency,
      targetProficiency,
      clarificationResponses
    });

    const planResponse = await geminiService.callGeminiStructured(
      learningPlanPrompt.systemMessage,
      learningPlanPrompt.userMessage,
      {
        schemaType: 'ultimateLearningPlan',
        maxTokens: 4000,
        temperature: 0.1,
        model: aiConfig.defaultModel
      }
    );

    if (planResponse && planResponse.learningPlan && planResponse.subtasks) {
      logger.info(`✅ [UNIFIED-PLAN] Generated plan with ${planResponse.subtasks.length} subtasks`);
      
      // 添加處理時間和成功指標
      const response = {
        success: true,
        stage: 'complete',
        learningPlan: planResponse.learningPlan,
        subtasks: planResponse.subtasks,
        processingTime: Date.now() - startTime,
        metadata: {
          taskType,
          subtaskCount: planResponse.subtasks.length,
          proficiencyProgression: `${currentProficiency} → ${targetProficiency}`,
          language
        }
      };

      return res.status(200).json(response);
    } else {
      throw new Error('AI 未能生成有效的學習計劃結構');
    }

  } catch (error) {
    logger.error('[UNIFIED-PLAN] Generation failed:', error.message);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate learning plan',
      message: error.message || 'AI service encountered an error',
      code: 'GENERATION_FAILED',
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
});

// ==========================================
// 🆕 學習問題生成端點
// ==========================================
router.post('/generate-learning-questions', async (req, res) => {
  const { summary, language = 'zh' } = req.body;
  if (!summary || typeof summary !== 'string' || summary.trim().length < 5) {
    return res.status(400).json({ error: 'Summary is required and must be a non-empty string.' });
  }
  try {
    // 呼叫 GeminiService 生成學習問題
    const questions = await geminiService.callGeminiStructured(
      'You are a learning reinforcement expert. Generate thoughtful review questions based on the learning summary.\n\nCreate 3-5 questions that:\n- Test understanding of key concepts\n- Encourage deeper thinking\n- Help reinforce learning\n- Are specific to the content learned\n\nReturn as a JSON array of strings (just the questions).',
      `Learning Summary: ${summary}\n\nGenerate review questions as JSON array:`,
      { schemaType: 'learningQuestions', maxTokens: 800, temperature: 0.2, model: aiConfig.defaultModel }
    );
    if (questions && Array.isArray(questions.questions) && questions.questions.length > 0) {
      return res.json({ questions: questions.questions });
    } else {
      // 不提供後備機制，確保 AI 必須正常工作
      logger.error('AI failed to generate questions - no fallback provided');
      return res.status(500).json({ 
        error: 'AI service failed to generate questions', 
        message: 'Please try again or check system configuration' 
      });
    }
  } catch (error) {
    logger.error('[LEARNING-QUESTIONS] Error:', error.message);
    // 不提供後備機制，直接回傳錯誤
    return res.status(500).json({ 
      error: 'Failed to generate learning questions', 
      message: error.message || 'AI service encountered an error',
      timestamp: new Date().toISOString()
    });
  }
});

// ==========================================
// 🆕 時間估算端點
// ==========================================
router.post('/estimate-task-duration', async (req, res) => {
  const { title, description, difficulty, subtasks } = req.body;
  
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Task title is required.' });
  }
  
  try {
    // 使用 GeminiService 估算任務時間
    const prompt = `請估算以下任務的完成時間（分鐘）：
任務標題：${title}
${description ? `描述：${description}` : ''}
${difficulty ? `難度：${difficulty}` : ''}
${subtasks && subtasks.length > 0 ? `子任務數量：${subtasks.length}` : ''}

請只回傳一個數字，代表預估的總分鐘數。`;
    
    const response = await geminiService.callGemini(prompt, '');
    const estimatedMinutes = parseInt(response.trim()) || 60;
    
    res.json({
      success: true,
      estimatedDuration: estimatedMinutes,
      unit: 'minutes'
    });
    
  } catch (error) {
    logger.error('[ESTIMATE-TASK-DURATION] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to estimate task duration',
      message: error.message || 'AI estimation service encountered an error',
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/estimate-subtask-duration', async (req, res) => {
  const { subtaskText, difficulty } = req.body;
  
  if (!subtaskText || typeof subtaskText !== 'string') {
    return res.status(400).json({ error: 'Subtask text is required.' });
  }
  
  try {
    // 使用 GeminiService 估算子任務時間
    const prompt = `請估算以下子任務的完成時間（分鐘）：
子任務：${subtaskText}
${difficulty ? `難度：${difficulty}` : ''}

請只回傳一個數字，代表預估的總分鐘數。`;
    
    const response = await geminiService.callGemini(prompt, '');
    const estimatedMinutes = parseInt(response.trim()) || 30;
    
    res.json({
      success: true,
      estimatedDuration: estimatedMinutes,
      unit: 'minutes'
    });
    
  } catch (error) {
    logger.error('[ESTIMATE-SUBTASK-DURATION] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to estimate subtask duration',
      message: error.message || 'AI estimation service encountered an error',
      timestamp: new Date().toISOString()
    });
  }
});

// ==========================================
// 🗂️ 作業佇列 API (統一入口)
// ==========================================
// POST /api/jobs - 提交新作業
router.post('/jobs', async (req, res) => {
  try {
    const { type, params, options = {} } = req.body;
    if (!type || !Object.values(JOB_TYPES).includes(type)) {
      return res.status(400).json({
        error: 'Invalid job type',
        validTypes: Object.values(JOB_TYPES),
        provided: type
      });
    }
    if (!params || typeof params !== 'object') {
      return res.status(400).json({
        error: 'Job parameters are required',
        example: {
          type: 'task_planning',
          params: { title: 'Learn Python', description: 'Basic programming', language: 'zh' }
        }
      });
    }
    const validationResult = validateJobParams(type, params);
    if (!validationResult.isValid) {
      return res.status(400).json({
        error: 'Invalid job parameters',
        details: validationResult.errors,
        required: validationResult.required
      });
    }
    const jobId = jobQueue.createJob(type, params, {
      ...options,
      userId: req.headers['x-user-id'] || 'anonymous',
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
    const estimatedDuration = jobQueue.estimateJobDuration(type);
    console.log(`📝 [JOBS-API] New job submitted: ${jobId} (${type})`);
    res.status(202).json({
      jobId,
      type,
      status: JOB_STATUS.PENDING,
      estimatedDuration,
      message: getJobTypeMessage(type),
      pollEndpoint: `/api/jobs/${jobId}`,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[JOBS-API] Job submission failed:', error);
    res.status(500).json({
      error: 'Failed to submit job',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/jobs/:jobId - 查詢作業狀態
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({
        error: 'Invalid job ID',
        provided: jobId
      });
    }
    const jobStatus = jobQueue.getJobStatus(jobId);
    if (!jobStatus) {
      return res.status(404).json({
        error: 'Job not found',
        jobId,
        possibleReasons: [
          'Job ID is incorrect',
          'Job has expired and been cleaned up',
          'Job was never created'
        ]
      });
    }
    const response = {
      jobId: jobStatus.id,
      type: jobStatus.type,
      status: jobStatus.status,
      progress: jobStatus.progress,
      createdAt: jobStatus.createdAt,
      startedAt: jobStatus.startedAt,
      completedAt: jobStatus.completedAt,
      runningTime: jobStatus.runningTime,
      estimatedDuration: jobStatus.estimatedDuration,
      isDelayed: jobStatus.isDelayed
    };
    if (jobStatus.status === JOB_STATUS.COMPLETED) {
      response.result = jobStatus.result;
      response.message = '作業完成！結果已準備就緒。';
    } else if (jobStatus.status === JOB_STATUS.FAILED) {
      response.error = jobStatus.error;
      response.message = '作業失敗，請查看錯誤詳情。';
    } else if (jobStatus.status === JOB_STATUS.TIMEOUT) {
      response.message = '作業處理時間較長，但仍在進行中，請稍後再查詢。';
    } else if (jobStatus.status === JOB_STATUS.PROCESSING) {
      const remainingTime = Math.max(0, jobStatus.estimatedDuration - jobStatus.runningTime);
      response.estimatedRemainingTime = remainingTime;
      response.message = `正在處理中，預計還需 ${Math.ceil(remainingTime / 1000)} 秒。`;
    } else {
      response.message = '作業在佇列中等待處理。';
    }
    if (jobStatus.status === JOB_STATUS.PENDING || jobStatus.status === JOB_STATUS.PROCESSING) {
      response.polling = {
        shouldContinue: true,
        nextPollDelay: getNextPollDelay(jobStatus.status, jobStatus.runningTime),
        maxPolls: 120,
        timeoutWarning: jobStatus.runningTime > 60000
      };
    }
    res.status(200).json(response);
  } catch (error) {
    console.error('[JOBS-API] Job status query failed:', error);
    res.status(500).json({
      error: 'Failed to get job status',
      message: error.message,
      jobId: req.params.jobId,
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/jobs/:jobId - 取消作業
router.delete('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const success = jobQueue.cancelJob(jobId);
    if (success) {
      console.log(`🗑️ [JOBS-API] Job cancelled: ${jobId}`);
      res.status(200).json({
        success: true,
        message: '作業已成功取消',
        jobId
      });
    } else {
      res.status(400).json({
        success: false,
        message: '無法取消作業（可能已在處理中或不存在）',
        jobId
      });
    }
  } catch (error) {
    console.error('[JOBS-API] Job cancellation failed:', error);
    res.status(500).json({
      error: 'Failed to cancel job',
      message: error.message,
      jobId: req.params.jobId
    });
  }
});

// GET /api/jobs - 佇列狀態
router.get('/jobs', async (req, res) => {
  try {
    const stats = jobQueue.getStats();
    res.status(200).json({
      stats,
      info: {
        message: 'Job queue is operational',
        supportedTypes: Object.values(JOB_TYPES),
        maxConcurrentJobs: 3,
        defaultTimeout: '5 minutes (soft timeout)',
        jobExpiryTime: '30 minutes'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[JOBS-API] Stats query failed:', error);
    res.status(500).json({
      error: 'Failed to get queue stats',
      message: error.message
    });
  }
});

// === 輔助函數 ===
function validateJobParams(type, params) {
  const errors = [];
  const required = [];
  switch (type) {
    case JOB_TYPES.TASK_PLANNING:
      required.push('title');
      if (!params.title || typeof params.title !== 'string' || params.title.trim().length === 0) {
        errors.push('title is required and must be a non-empty string');
      }
      break;
    case JOB_TYPES.PERSONALIZATION:
      required.push('title');
      if (!params.title || typeof params.title !== 'string' || params.title.trim().length === 0) {
        errors.push('title is required and must be a non-empty string');
      }
      break;
    case JOB_TYPES.SUBTASK_GENERATION:
      required.push('title');
      if (!params.title || typeof params.title !== 'string' || params.title.trim().length === 0) {
        errors.push('title is required and must be a non-empty string');
      }
      break;
    case JOB_TYPES.LEARNING_PLAN:
      required.push('title');
      if (!params.title || typeof params.title !== 'string' || params.title.trim().length === 0) {
        errors.push('title is required and must be a non-empty string');
      }
      break;
    default:
      errors.push(`Unknown job type: ${type}`);
  }
  if (params.language && !['en', 'zh'].includes(params.language)) {
    errors.push('language must be either "en" or "zh"');
  }
  return {
    isValid: errors.length === 0,
    errors,
    required
  };
}

function getJobTypeMessage(type) {
  const messages = {
    [JOB_TYPES.TASK_PLANNING]: '正在分析您的任務並規劃完整的學習路徑...',
    [JOB_TYPES.PERSONALIZATION]: '正在生成個人化問題以更好地了解您的需求...',
    [JOB_TYPES.SUBTASK_GENERATION]: '正在根據您的目標和時間約束生成最適化的子任務...',
    [JOB_TYPES.LEARNING_PLAN]: '正在創建包含具體步驟和資源的完整學習計劃...'
  };
  return messages[type] || '正在處理您的請求...';
}

function getNextPollDelay(status, runningTime) {
  if (status === JOB_STATUS.PENDING) {
    return 1000;
  }
  if (status === JOB_STATUS.PROCESSING) {
    if (runningTime < 10000) return 1000;
    if (runningTime < 30000) return 2000;
    if (runningTime < 60000) return 3000;
    return 5000;
  }
  return 1000;
}

module.exports = router; 