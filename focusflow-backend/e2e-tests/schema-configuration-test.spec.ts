/**
 * Schema 配置獨立測試
 * TDD 階段 4：獨立測試後端作業處理服務 - 專注於 Schema 問題
 */

// 確保環境變數正確載入
require('dotenv').config();

const { test, expect } = require('@playwright/test');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

test.describe('Schema 配置獨立測試', () => {
  test('階段4-測試1: 直接測試 responseSchema 配置', async () => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // 簡化的 Schema 定義
    const simpleSchema = {
      type: SchemaType.OBJECT,
      properties: {
        questions: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING },
              question: { type: SchemaType.STRING },
              type: { type: SchemaType.STRING },
              required: { type: SchemaType.BOOLEAN }
            },
            required: ["id", "question", "type", "required"]
          }
        }
      },
      required: ["questions"]
    };

    console.log('🧪 [TEST] 測試簡化 responseSchema...');
    console.log('📋 [TEST] Schema 結構:', JSON.stringify(simpleSchema, null, 2));

    try {
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: '請生成 2 個關於 Python 學習的問題' }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: simpleSchema,
          maxOutputTokens: 1000,
          temperature: 0.1
        }
      });

      const response = result.response;
      const text = response.text();

      console.log('✅ [TEST] Schema 調用成功');
      console.log('📊 [TEST] 回應長度:', text.length);
      console.log('🔍 [TEST] 原始回應:', text);

      const parsed = JSON.parse(text);
      console.log('📋 [TEST] 解析成功，問題數量:', parsed.questions?.length || 0);

      expect(parsed).toBeTruthy();
      expect(parsed.questions).toBeDefined();
      expect(Array.isArray(parsed.questions)).toBe(true);

    } catch (error) {
      console.error('❌ [TEST] Schema 測試失敗:', error.message);
      throw error;
    }
  });

  test('階段4-測試2: 測試更寬鬆的 Schema 配置', async () => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // 更寬鬆的 Schema - 移除嚴格的 required 約束
    const flexibleSchema = {
      type: SchemaType.OBJECT,
      properties: {
        questions: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING },
              question: { type: SchemaType.STRING },
              type: { type: SchemaType.STRING }
            }
          }
        }
      }
    };

    console.log('🧪 [TEST] 測試寬鬆 Schema...');

    try {
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: '生成學習問題' }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: flexibleSchema,
          maxOutputTokens: 800,
          temperature: 0.2
        }
      });

      const text = result.response.text();
      console.log('✅ [TEST] 寬鬆 Schema 成功');
      console.log('📊 [TEST] 回應:', text);

      const parsed = JSON.parse(text);
      expect(parsed.questions).toBeDefined();

    } catch (error) {
      console.error('❌ [TEST] 寬鬆 Schema 失敗:', error.message);
      throw error;
    }
  });

  test('階段4-測試3: 測試無 Schema 的 JSON 輸出', async () => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    console.log('🧪 [TEST] 測試無 Schema 的 JSON 輸出...');

    try {
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: '請生成一個 JSON 格式的回應，包含 questions 陣列，每個問題有 id, question, type 三個欄位' }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 1000,
          temperature: 0.1
        }
      });

      const text = result.response.text();
      console.log('✅ [TEST] 無 Schema JSON 成功');
      console.log('📊 [TEST] 回應:', text);

      const parsed = JSON.parse(text);
      console.log('📋 [TEST] 成功解析 JSON');

      expect(parsed).toBeTruthy();

    } catch (error) {
      console.error('❌ [TEST] 無 Schema JSON 失敗:', error.message);
      throw error;
    }
  });

  test('階段4-測試4: 比較不同 Token 限制的影響', async () => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const tokenLimits = [200, 500, 1000, 2000];

    for (const limit of tokenLimits) {
      console.log(`🧪 [TEST] 測試 Token 限制: ${limit}`);

      try {
        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [{ text: '生成學習問題 JSON' }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: limit,
            temperature: 0.1
          }
        });

        const text = result.response.text();
        console.log(`✅ [TEST] Token ${limit}: 成功，長度 ${text.length}`);

        if (text.length > 0) {
          const parsed = JSON.parse(text);
          console.log(`📋 [TEST] Token ${limit}: JSON 解析成功`);
        }

      } catch (error) {
        console.error(`❌ [TEST] Token ${limit}: 失敗 -`, error.message);
      }
    }
  });

  test('階段4-測試5: 診斷當前 GeminiService 使用的確切配置', async () => {
    console.log('🧪 [TEST] 載入並測試 GeminiService...');

    const GeminiService = require('../lib/services/geminiService');
    const geminiService = new GeminiService();

    // 獲取配置
    const config = geminiService.getConfiguration();
    console.log('🔍 [TEST] GeminiService 配置:', config);

    // 直接呼叫 callGeminiStructured 但使用簡單參數
    try {
      console.log('🧪 [TEST] 直接測試 callGeminiStructured...');

      const result = await geminiService.callGeminiStructured(
        '請生成學習問題',
        '主題: 基本測試',
        {
          schemaType: 'personalizationQuestions',
          maxTokens: 800,
          temperature: 0.1,
          maxRetries: 1  // 減少重試次數加快測試
        }
      );

      console.log('✅ [TEST] callGeminiStructured 成功');
      console.log('📋 [TEST] 結果:', result);

      expect(result).toBeTruthy();

    } catch (error) {
      console.error('❌ [TEST] callGeminiStructured 失敗:', error.message);
      
      // 檢查是否是我們的 fallback 機制
      if (error.message.includes('fallback') || error.message.includes('Empty response')) {
        console.log('🔧 [TEST] 觸發了 fallback 機制，這表明 API 調用有問題');
      }
      
      throw error;
    }
  });
});