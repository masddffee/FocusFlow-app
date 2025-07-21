/**
 * Gemini API 整合診斷測試
 * TDD 階段 2：檢查 Gemini API 整合與速率限制問題
 */

const { test, expect } = require('@playwright/test');

test.describe('Gemini API 整合與速率限制診斷', () => {
  let GeminiService;
  let geminiService;

  test.beforeEach(() => {
    GeminiService = require('../lib/services/geminiService');
    geminiService = new GeminiService();
  });

  test('階段2-測試1: Gemini API 基本配置檢查', async () => {
    const config = geminiService.getConfiguration();
    
    console.log('🔍 [TEST] Gemini API 配置:', config);
    
    // 檢查基本配置
    expect(config.apiKeyConfigured).toBe(true);
    expect(config.model).toBeTruthy();
    expect(config.maxTokens).toBeGreaterThan(0);
    
    console.log('✅ [TEST] 基本配置正確');
    console.log('📊 [TEST] 最大 Token 數:', config.maxTokens);
    console.log('🤖 [TEST] 使用模型:', config.model);
  });

  test('階段2-測試2: 小型請求成功測試', async () => {
    const smallParams = {
      schemaType: 'personalizationQuestions',
      maxTokens: 500, // 小型請求
      temperature: 0.1
    };

    const systemPrompt = '請生成 1 個簡單的個人化問題以測試 API 連接';
    const userContent = '主題：基本測試';

    try {
      console.log('🧪 [TEST] 測試小型 API 請求...');
      const result = await geminiService.callGeminiStructured(systemPrompt, userContent, smallParams);
      
      console.log('✅ [TEST] 小型請求成功');
      console.log('📊 [TEST] 回傳問題數量:', result.questions?.length || 0);
      
      // 驗證基本結構
      expect(result).toBeTruthy();
      expect(result.questions).toBeDefined();
      expect(Array.isArray(result.questions)).toBe(true);
      
    } catch (error) {
      console.error('❌ [TEST] 小型請求失敗:', error.message);
      console.error('🔍 [TEST] 錯誤類型:', error.constructor.name);
      throw error;
    }
  });

  test('階段2-測試3: 大型請求與截斷問題測試', async () => {
    const largeParams = {
      schemaType: 'personalizationQuestions',
      maxTokens: 4000, // 大型請求，可能觸發截斷
      temperature: 0.1
    };

    const systemPrompt = '請生成 4 個詳細的個人化問題，每個問題都要包含豐富的選項和說明';
    const userContent = '主題：學習 Python 程式設計，包括基礎語法、數據處理、Web 框架、機器學習等完整課程規劃';

    try {
      console.log('🧪 [TEST] 測試大型 API 請求與截斷處理...');
      
      const startTime = Date.now();
      const result = await geminiService.callGeminiStructured(systemPrompt, userContent, largeParams);
      const duration = Date.now() - startTime;
      
      console.log('⏱️  [TEST] 請求耗時:', duration, 'ms');
      console.log('📊 [TEST] 回傳問題數量:', result.questions?.length || 0);
      
      // 檢查是否經過修復
      if (result._repaired) {
        console.log('🔧 [TEST] 偵測到回應修復，原始長度:', result._originalLength);
      }
      
      // 驗證結構完整性
      expect(result).toBeTruthy();
      expect(result.questions).toBeDefined();
      expect(Array.isArray(result.questions)).toBe(true);
      
      // 檢查每個問題的結構
      result.questions.forEach((question, index) => {
        console.log(`📋 [TEST] 問題 ${index + 1}:`, {
          hasId: !!question.id,
          hasQuestion: !!question.question,
          hasType: !!question.type,
          hasRequired: typeof question.required === 'boolean'
        });
        
        expect(question.id).toBeTruthy();
        expect(question.question).toBeTruthy();
        expect(question.type).toBeTruthy();
        expect(typeof question.required).toBe('boolean');
      });
      
      console.log('✅ [TEST] 大型請求結構驗證通過');
      
    } catch (error) {
      console.error('❌ [TEST] 大型請求失敗:', error.message);
      
      // 分析錯誤類型
      if (error.message.includes('JSON')) {
        console.error('🔍 [TEST] JSON 解析錯誤 - 可能是回應截斷問題');
      } else if (error.message.includes('quota') || error.message.includes('rate')) {
        console.error('🔍 [TEST] API 配額或速率限制問題');
      } else {
        console.error('🔍 [TEST] 其他 API 錯誤');
      }
      
      throw error;
    }
  });

  test('階段2-測試4: 速率限制與重試機制測試', async () => {
    const requests = [];
    const concurrentRequests = 5; // 同時發送多個請求
    
    console.log(`🚀 [TEST] 測試 ${concurrentRequests} 個並發請求...`);
    
    for (let i = 0; i < concurrentRequests; i++) {
      const requestPromise = geminiService.callGeminiStructured(
        `請生成關於主題 ${i + 1} 的個人化問題`,
        `測試並發請求 ${i + 1}`,
        {
          schemaType: 'personalizationQuestions',
          maxTokens: 800,
          temperature: 0.1
        }
      );
      
      requests.push({
        id: i + 1,
        promise: requestPromise,
        startTime: Date.now()
      });
    }
    
    // 等待所有請求完成
    const results = await Promise.allSettled(requests.map(req => req.promise));
    
    let successCount = 0;
    let failureCount = 0;
    const durations = [];
    
    results.forEach((result, index) => {
      const duration = Date.now() - requests[index].startTime;
      durations.push(duration);
      
      if (result.status === 'fulfilled') {
        successCount++;
        console.log(`✅ [TEST] 請求 ${index + 1} 成功 (${duration}ms)`);
      } else {
        failureCount++;
        console.error(`❌ [TEST] 請求 ${index + 1} 失敗 (${duration}ms):`, result.reason.message);
        
        // 分析失敗原因
        if (result.reason.message.includes('quota')) {
          console.error('🔍 [TEST] 速率限制觸發');
        } else if (result.reason.message.includes('timeout')) {
          console.error('🔍 [TEST] 請求超時');
        }
      }
    });
    
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    console.log('📊 [TEST] 並發測試結果:');
    console.log(`   成功: ${successCount}/${concurrentRequests}`);
    console.log(`   失敗: ${failureCount}/${concurrentRequests}`);
    console.log(`   平均耗時: ${Math.round(avgDuration)}ms`);
    console.log(`   最長耗時: ${Math.max(...durations)}ms`);
    console.log(`   最短耗時: ${Math.min(...durations)}ms`);
    
    // 至少應該有一半的請求成功
    expect(successCount).toBeGreaterThan(concurrentRequests / 2);
  });

  test('階段2-測試5: Token 限制邊界測試', async () => {
    const tokenLimits = [500, 1000, 2000, 4000, 8000];
    
    for (const maxTokens of tokenLimits) {
      console.log(`🧪 [TEST] 測試 Token 限制: ${maxTokens}`);
      
      try {
        const result = await geminiService.callGeminiStructured(
          '請生成詳細的個人化問題，盡可能包含豐富的內容和選項',
          '主題：全面的程式設計學習計劃，包含前端、後端、數據庫、DevOps 等所有面向',
          {
            schemaType: 'personalizationQuestions',
            maxTokens: maxTokens,
            temperature: 0.1
          }
        );
        
        const questionCount = result.questions?.length || 0;
        const hasRepair = !!result._repaired;
        
        console.log(`📊 [TEST] Token ${maxTokens}: ${questionCount} 問題${hasRepair ? ' (已修復)' : ''}`);
        
        // 檢查是否有截斷跡象
        if (hasRepair) {
          console.log(`🔧 [TEST] Token ${maxTokens}: 偵測到回應修復`);
        }
        
      } catch (error) {
        console.error(`❌ [TEST] Token ${maxTokens} 失敗:`, error.message);
        
        if (error.message.includes('JSON')) {
          console.error(`🔍 [TEST] Token ${maxTokens}: JSON 解析失敗 - 可能超出限制`);
        }
      }
    }
  });
});