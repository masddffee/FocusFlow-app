/**
 * Job Queue Service 診斷測試
 * TDD 階段 1：深入調查後端 AI 作業佇列服務
 */

const { test, expect } = require('@playwright/test');
const { JobQueueService, JOB_STATUS, JOB_TYPES } = require('../lib/services/jobQueueService');

test.describe('後端 AI 作業佇列服務診斷', () => {
  let jobQueueService;

  test.beforeEach(() => {
    jobQueueService = new JobQueueService();
  });

  test('階段1-測試1: learning_plan 作業創建與基本狀態檢查', async () => {
    // 模擬前端傳送的參數
    const jobParams = {
      title: "學習 Python 程式設計", 
      description: "我想要從零開始學習 Python 程式設計，目標是能夠開發網頁應用程式。希望能夠掌握基礎語法、數據處理和 Web 框架。",
      language: "en",
      taskType: "skill_learning",
      currentProficiency: "beginner", 
      targetProficiency: "intermediate"
    };

    // 創建 learning_plan 作業
    const jobId = jobQueueService.createJob(JOB_TYPES.LEARNING_PLAN, jobParams);
    
    console.log('🔍 [TEST] Created job:', jobId);
    
    // 檢查初始狀態
    const initialStatus = jobQueueService.getJobStatus(jobId);
    expect(initialStatus).toBeTruthy();
    expect(initialStatus.status).toBe(JOB_STATUS.PENDING);
    expect(initialStatus.type).toBe(JOB_TYPES.LEARNING_PLAN);
    
    console.log('✅ [TEST] Initial status correct:', initialStatus.status);
  });

  test('階段1-測試2: 作業執行過程監控', async () => {
    const jobParams = {
      title: "學習 Python 程式設計",
      description: "基礎學習需求",
      language: "en"
    };

    const jobId = jobQueueService.createJob(JOB_TYPES.LEARNING_PLAN, jobParams);
    
    // 等待作業開始處理
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const processingStatus = jobQueueService.getJobStatus(jobId);
    console.log('🔍 [TEST] Processing status:', processingStatus);
    
    // 檢查作業是否進入處理狀態
    if (processingStatus.status === JOB_STATUS.PROCESSING) {
      console.log('✅ [TEST] Job entered processing state');
      console.log('📊 [TEST] Progress:', processingStatus.progress);
    } else {
      console.log('⚠️  [TEST] Job not yet processing, status:', processingStatus.status);
    }
    
    // 等待更長時間觀察作業完成情況
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const finalStatus = jobQueueService.getJobStatus(jobId);
    console.log('🏁 [TEST] Final status:', finalStatus);
    console.log('📊 [TEST] Final progress:', finalStatus.progress);
    
    // 檢查是否卡在 processing 狀態
    if (finalStatus.status === JOB_STATUS.PROCESSING) {
      console.error('❌ [TEST] Job stuck in processing state!');
      console.error('⏱️  [TEST] Running time:', finalStatus.runningTime, 'ms');
    }
  });

  test('階段1-測試3: Gemini API 呼叫路徑驗證', async () => {
    // 直接測試 generateUnifiedPlan 方法
    const testParams = {
      title: "測試計劃",
      description: "測試描述", 
      language: "zh"
    };
    
    console.log('🤖 [TEST] Testing generateUnifiedPlan directly...');
    
    try {
      const result = await jobQueueService.generateUnifiedPlan(testParams);
      console.log('✅ [TEST] generateUnifiedPlan result:', result);
      
      // 檢查回傳結構
      expect(result).toBeTruthy();
      if (result.personalizationQuestions) {
        console.log('📋 [TEST] Returned personalization questions:', result.personalizationQuestions.length);
      }
      if (result.learningPlan) {
        console.log('📚 [TEST] Returned learning plan:', !!result.learningPlan);
      }
      
    } catch (error) {
      console.error('❌ [TEST] generateUnifiedPlan failed:', error);
      console.error('🔍 [TEST] Error details:', {
        message: error.message,
        type: error.constructor.name,
        stack: error.stack?.split('\n')[0]
      });
    }
  });

  test('階段1-測試4: 作業佇列並發處理測試', async () => {
    const jobs = [];
    
    // 創建多個作業
    for (let i = 0; i < 3; i++) {
      const jobId = jobQueueService.createJob(JOB_TYPES.LEARNING_PLAN, {
        title: `測試作業 ${i + 1}`,
        description: "並發測試",
        language: "zh"
      });
      jobs.push(jobId);
    }
    
    console.log('🚀 [TEST] Created', jobs.length, 'concurrent jobs');
    
    // 監控所有作業狀態
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statuses = jobs.map(jobId => {
        const status = jobQueueService.getJobStatus(jobId);
        return {
          jobId: jobId.substring(0, 8),
          status: status.status,
          runningTime: status.runningTime
        };
      });
      
      console.log(`📊 [TEST] Attempt ${attempt + 1} - Job statuses:`, statuses);
      
      // 檢查是否有作業完成
      const completedJobs = statuses.filter(s => s.status === JOB_STATUS.COMPLETED);
      const failedJobs = statuses.filter(s => s.status === JOB_STATUS.FAILED);
      const processingJobs = statuses.filter(s => s.status === JOB_STATUS.PROCESSING);
      
      console.log(`📈 [TEST] Completed: ${completedJobs.length}, Failed: ${failedJobs.length}, Processing: ${processingJobs.length}`);
      
      if (completedJobs.length === jobs.length) {
        console.log('✅ [TEST] All jobs completed successfully');
        break;
      }
    }
    
    // 獲取最終統計
    const stats = jobQueueService.getStats();
    console.log('📊 [TEST] Final queue stats:', stats);
  });
});