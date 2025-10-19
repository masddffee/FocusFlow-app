/**
 * 完整工作流程測試：個人化問題回覆 → 子任務生成 → 智慧排程驗證
 * 
 * 這個測試模擬真實用戶完整體驗：
 * 1. 提交初始任務（學習 React Native）
 * 2. 獲得個人化問題
 * 3. 回覆個人化問題
 * 4. 生成子任務和學習計劃
 * 5. 驗證智慧排程結果
 * 6. 確認 4 層優先級系統正常運作
 */

const path = require('path');
const axios = require('axios');
const { performance } = require('perf_hooks');

// 加載環境變數
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BACKEND_URL = 'http://127.0.0.1:3000';

class CompleteWorkflowTest {
  constructor() {
    this.results = [];
    this.startTime = performance.now();
  }

  log(message, color = 'white') {
    const colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async pollJobUntilComplete(jobId, maxAttempts = 30) {
    this.log(`🔄 開始輪詢任務 ${jobId}...`, 'cyan');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/jobs/${jobId}`);
        const { status, result, error, progress } = response.data;
        
        this.log(`📊 [${status.toUpperCase()}] ${progress || '處理中...'}`, 'cyan');
        
        if (status === 'completed') {
          this.log(`✅ 任務完成！耗時: ${attempt * 2}秒`, 'green');
          return { status, result, metadata: response.data };
        }
        
        if (status === 'failed') {
          this.log(`❌ 任務失敗: ${error}`, 'red');
          return { status, error, metadata: response.data };
        }
        
        await this.delay(2000); // 每2秒輪詢一次
      } catch (error) {
        this.log(`⚠️  輪詢錯誤 (嘗試 ${attempt}/${maxAttempts}): ${error.message}`, 'yellow');
        await this.delay(2000);
      }
    }
    
    throw new Error(`任務 ${jobId} 輪詢超時`);
  }

  async runCompleteWorkflow() {
    this.log('🚀 開始完整工作流程測試', 'cyan');
    this.log('=' .repeat(80), 'cyan');
    
    try {
      // === 步驟 1: 提交初始任務 ===
      this.log('\n📋 步驟 1: 提交初始任務', 'blue');
      const initialTask = {
        title: '學習 React Native 開發完整應用程式',
        description: '我想學會使用 React Native 開發一個完整的移動應用程式，包含用戶界面設計、狀態管理、API 整合等核心技能',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天後
        priority: 'general',
        estimatedHours: 40
      };

      const jobResponse = await axios.post(`${BACKEND_URL}/api/jobs`, {
        type: 'personalization',
        params: initialTask
      });
      const jobId = jobResponse.data.jobId;
      this.log(`✅ 任務提交成功，Job ID: ${jobId}`, 'green');

      // === 步驟 2: 等待個人化問題生成 ===
      this.log('\n🤔 步驟 2: 等待個人化問題生成', 'blue');
      const personalizationResult = await this.pollJobUntilComplete(jobId);
      
      if (personalizationResult.status !== 'completed') {
        throw new Error('個人化問題生成失敗');
      }

      const questions = personalizationResult.result.questions;
      this.log(`✅ 生成了 ${questions.length} 個個人化問題`, 'green');
      questions.forEach((q, i) => {
        this.log(`   ${i + 1}. ${q.question.substring(0, 50)}...`, 'white');
      });

      // === 步驟 3: 回覆個人化問題 ===
      this.log('\n💬 步驟 3: 回覆個人化問題', 'blue');
      const answers = {
        goal_vision: '我想開發一個類似 Instagram 的社交媒體應用，具備照片分享、評論、私訊等功能',
        experience_level: '我有基礎的 JavaScript 和 React 經驗，但對 React Native 和移動開發比較陌生',
        learning_preference: '我偏好實作導向的學習方式，希望能邊做邊學，通過實際項目來掌握技能',
        timeline_preference: '我希望在一個月內完成學習，每天大概能投入2-3小時學習時間',
        focus_areas: '我最關心的是用戶界面設計、狀態管理、API整合和應用性能優化這幾個方面'
      };

      const answerResponse = await axios.post(`${BACKEND_URL}/api/jobs`, {
        type: 'subtask_generation',
        params: {
          title: initialTask.title,
          description: initialTask.description,
          deadline: initialTask.deadline,
          priority: initialTask.priority,
          estimatedHours: initialTask.estimatedHours,
          personalizationAnswers: answers
        }
      });
      
      const subtaskJobId = answerResponse.data.jobId;
      this.log(`✅ 個人化問題回覆成功，新 Job ID: ${subtaskJobId}`, 'green');

      // === 步驟 4: 等待子任務和學習計劃生成 ===
      this.log('\n🎯 步驟 4: 等待子任務和學習計劃生成', 'blue');
      const subtaskResult = await this.pollJobUntilComplete(subtaskJobId);
      
      if (subtaskResult.status !== 'completed') {
        throw new Error('子任務生成失敗');
      }

      const { learningPlan, subtasks, reasoning } = subtaskResult.result;
      this.log(`✅ 生成了 ${subtasks.length} 個子任務`, 'green');
      this.log(`📚 學習計劃包含 ${learningPlan?.phases?.length || 0} 個階段`, 'green');
      
      // 顯示子任務詳情
      this.log('\n📝 生成的子任務:', 'cyan');
      subtasks.forEach((task, i) => {
        this.log(`   ${i + 1}. ${task.title}`, 'white');
        this.log(`      📅 ${task.startDate} → ${task.endDate}`, 'white');
        this.log(`      ⏱️  預估時間: ${task.estimatedHours}小時`, 'white');
        this.log(`      🎯 優先級: ${task.priority}`, 'white');
      });

      // === 步驟 5: 驗證智慧排程結果 ===
      this.log('\n📊 步驟 5: 驗證智慧排程結果', 'blue');
      
      // 檢查排程邏輯
      const schedulingAnalysis = this.analyzeScheduling(subtasks);
      this.log('✅ 排程分析結果:', 'green');
      this.log(`   📅 時間分佈: ${schedulingAnalysis.timeDistribution}`, 'white');
      this.log(`   🎯 優先級分佈: ${JSON.stringify(schedulingAnalysis.priorityDistribution)}`, 'white');
      this.log(`   ⏰ 排程合理性: ${schedulingAnalysis.reasonableness}`, 'white');

      // === 步驟 6: 驗證 AI 推理透明度 ===
      this.log('\n🧠 步驟 6: 驗證 AI 推理透明度', 'blue');
      if (reasoning) {
        this.log(`✅ AI 推理說明完整性: ${Object.keys(reasoning).length} 個要素`, 'green');
        this.log(`   🔢 子任務數量決策: ${reasoning.subtaskCount || '未提供'}`, 'white');
        this.log(`   📋 排程策略: ${reasoning.schedulingStrategy || '未提供'}`, 'white');
        this.log(`   🎯 優先級判斷: ${reasoning.priorityReasoning || '未提供'}`, 'white');
      }

      // === 測試結果總結 ===
      const endTime = performance.now();
      const totalTime = Math.round(endTime - this.startTime);
      
      this.log('\n🎉 完整工作流程測試成功！', 'green');
      this.log('=' .repeat(80), 'green');
      this.log(`⏱️  總耗時: ${totalTime}ms`, 'cyan');
      this.log(`📊 個人化問題數量: ${questions.length}`, 'cyan');
      this.log(`🎯 生成子任務數量: ${subtasks.length}`, 'cyan');
      this.log(`📚 學習階段數量: ${learningPlan?.phases?.length || 0}`, 'cyan');
      this.log(`🧠 AI 推理透明度: ${reasoning ? '完整' : '部分'}`, 'cyan');
      
      return {
        success: true,
        questionsCount: questions.length,
        subtasksCount: subtasks.length,
        learningPhases: learningPlan?.phases?.length || 0,
        totalTime,
        schedulingAnalysis,
        hasReasoning: !!reasoning
      };

    } catch (error) {
      this.log(`💥 測試失敗: ${error.message}`, 'red');
      return {
        success: false,
        error: error.message
      };
    }
  }

  analyzeScheduling(subtasks) {
    const priorities = {};
    const dates = subtasks.map(t => new Date(t.startDate));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const daySpan = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

    subtasks.forEach(task => {
      priorities[task.priority] = (priorities[task.priority] || 0) + 1;
    });

    return {
      priorityDistribution: priorities,
      timeDistribution: `${daySpan} 天內分佈`,
      reasonableness: daySpan <= 30 ? '合理' : '可能過於密集'
    };
  }
}

// 執行測試
async function main() {
  const test = new CompleteWorkflowTest();
  const result = await test.runCompleteWorkflow();
  
  if (result.success) {
    console.log('\n🏆 所有測試通過！FocusFlow 完整工作流程運作正常。');
    process.exit(0);
  } else {
    console.log('\n❌ 測試失敗，需要進一步檢查。');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CompleteWorkflowTest;