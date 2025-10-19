/**
 * 子任務數據結構測試 - 檢查排程信息完整性
 */

const axios = require('axios');
const path = require('path');

// 加載環境變數
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BACKEND_URL = 'http://127.0.0.1:3000';

async function testSubtaskDataStructure() {
  console.log('🔍 測試子任務數據結構和排程信息');
  
  try {
    // 1. 提交個人化問題任務
    console.log('\n📝 步驟 1: 提交個人化問題任務');
    const personalizeResponse = await axios.post(`${BACKEND_URL}/api/jobs`, {
      type: 'personalization',
      params: {
        title: '學習 React Native 開發',
        description: '學習移動應用開發',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'general',
        estimatedHours: 40
      }
    });
    
    const personalizeJobId = personalizeResponse.data.jobId;
    console.log(`✅ 個人化任務提交成功: ${personalizeJobId}`);
    
    // 2. 等待個人化問題生成完成
    console.log('\n⏳ 步驟 2: 等待個人化問題生成');
    let personalizationResult;
    for (let i = 0; i < 20; i++) {
      const statusResponse = await axios.get(`${BACKEND_URL}/api/jobs/${personalizeJobId}`);
      if (statusResponse.data.status === 'completed') {
        personalizationResult = statusResponse.data;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    if (!personalizationResult || personalizationResult.status !== 'completed') {
      throw new Error('個人化問題生成超時');
    }
    
    console.log(`✅ 生成了 ${personalizationResult.result.questions.length} 個個人化問題`);
    
    // 3. 提交子任務生成任務
    console.log('\n🎯 步驟 3: 提交子任務生成任務');
    const subtaskResponse = await axios.post(`${BACKEND_URL}/api/jobs`, {
      type: 'subtask_generation',
      params: {
        title: '學習 React Native 開發',
        description: '學習移動應用開發',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'general',
        estimatedHours: 40,
        personalizationAnswers: {
          goal_vision: '我想開發一個社交媒體應用',
          experience_level: '我有基礎的 JavaScript 經驗',
          learning_preference: '我偏好實作導向的學習方式'
        }
      }
    });
    
    const subtaskJobId = subtaskResponse.data.jobId;
    console.log(`✅ 子任務生成任務提交成功: ${subtaskJobId}`);
    
    // 4. 等待子任務生成完成
    console.log('\n⏳ 步驟 4: 等待子任務生成');
    let subtaskResult;
    for (let i = 0; i < 30; i++) {
      const statusResponse = await axios.get(`${BACKEND_URL}/api/jobs/${subtaskJobId}`);
      console.log(`📊 狀態: ${statusResponse.data.status}`);
      
      if (statusResponse.data.status === 'completed') {
        subtaskResult = statusResponse.data;
        break;
      } else if (statusResponse.data.status === 'failed') {
        console.error('❌ 子任務生成失敗:', statusResponse.data.error);
        throw new Error(`子任務生成失敗: ${statusResponse.data.error}`);
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    if (!subtaskResult || subtaskResult.status !== 'completed') {
      throw new Error('子任務生成超時');
    }
    
    // 5. 分析子任務數據結構
    console.log('\n🔍 步驟 5: 分析子任務數據結構');
    const { subtasks, learningPlan, reasoning } = subtaskResult.result;
    
    console.log(`📊 生成了 ${subtasks.length} 個子任務`);
    console.log(`📚 學習計劃: ${learningPlan ? '存在' : '缺失'}`);
    console.log(`🧠 推理信息: ${reasoning ? '存在' : '缺失'}`);
    
    // 詳細檢查前3個子任務的數據結構
    console.log('\n📋 前3個子任務的詳細結構:');
    subtasks.slice(0, 3).forEach((subtask, index) => {
      console.log(`\n📝 子任務 ${index + 1}:`);
      console.log(`   title: ${subtask.title || '❌ 缺失'}`);
      console.log(`   startDate: ${subtask.startDate || '❌ 缺失'}`);
      console.log(`   endDate: ${subtask.endDate || '❌ 缺失'}`);
      console.log(`   estimatedHours: ${subtask.estimatedHours || '❌ 缺失'}`);
      console.log(`   priority: ${subtask.priority || '❌ 缺失'}`);
      console.log(`   order: ${subtask.order || '❌ 缺失'}`);
      console.log(`   phase: ${subtask.phase || '❌ 缺失'}`);
      console.log(`   difficulty: ${subtask.difficulty || 'N/A'}`);
      
      // 檢查其他可能的字段
      const otherFields = Object.keys(subtask).filter(key => 
        !['title', 'startDate', 'endDate', 'estimatedHours', 'priority', 'order', 'phase', 'difficulty'].includes(key)
      );
      if (otherFields.length > 0) {
        console.log(`   其他字段: ${otherFields.join(', ')}`);
      }
    });
    
    // 6. 檢查推理信息
    if (reasoning) {
      console.log('\n🧠 AI 推理信息分析:');
      console.log(`   推理字段數量: ${Object.keys(reasoning).length}`);
      Object.entries(reasoning).forEach(([key, value]) => {
        console.log(`   ${key}: ${JSON.stringify(value).substring(0, 100)}...`);
      });
    }
    
    // 7. 檢查學習計劃
    if (learningPlan) {
      console.log('\n📚 學習計劃分析:');
      if (learningPlan.phases) {
        console.log(`   階段數量: ${learningPlan.phases.length}`);
        learningPlan.phases.slice(0, 2).forEach((phase, index) => {
          console.log(`   階段 ${index + 1}: ${phase.name || phase.title || '未命名'}`);
        });
      }
      if (learningPlan.achievableGoal) {
        console.log(`   可達成目標: ${learningPlan.achievableGoal.substring(0, 100)}...`);
      }
      if (learningPlan.recommendedTools) {
        console.log(`   推薦工具數量: ${learningPlan.recommendedTools.length}`);
      }
    }
    
    // 8. 統計結果
    console.log('\n📊 數據完整性統計:');
    const completeSubtasks = subtasks.filter(st => 
      st.title && st.startDate && st.endDate && st.estimatedHours && st.priority
    );
    
    console.log(`   完整排程信息的子任務: ${completeSubtasks.length}/${subtasks.length}`);
    console.log(`   完整性比例: ${Math.round(completeSubtasks.length / subtasks.length * 100)}%`);
    
    if (completeSubtasks.length === subtasks.length) {
      console.log('✅ 所有子任務都有完整的排程信息');
    } else {
      console.log('⚠️ 部分子任務缺少排程信息');
    }
    
    return {
      success: true,
      subtasksCount: subtasks.length,
      completeSubtasks: completeSubtasks.length,
      hasReasoning: !!reasoning,
      hasLearningPlan: !!learningPlan
    };
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    return { success: false, error: error.message };
  }
}

// 執行測試
testSubtaskDataStructure().then(result => {
  if (result.success) {
    console.log('\n🎉 子任務數據結構測試完成');
  } else {
    console.log('\n💥 測試失敗，需要修復');
    process.exit(1);
  }
}).catch(console.error);