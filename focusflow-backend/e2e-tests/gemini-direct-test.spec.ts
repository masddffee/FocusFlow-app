/**
 * 直接測試 Gemini API 調用
 * 基於用戶確認 generateContent API 可以成功呼叫
 */

// 🔧 確保環境變數正確載入
require('dotenv').config();

const { test, expect } = require('@playwright/test');
const { GoogleGenerativeAI } = require('@google/generative-ai');

test.describe('Gemini API 直接調用測試', () => {
  test('直接測試 generateContent API 基本調用', async () => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    console.log('🧪 [TEST] 測試基本 generateContent 調用...');

    try {
      const result = await model.generateContent('請回答：今天是什麼日期？請用中文回答。');
      const response = result.response;
      const text = response.text();

      console.log('✅ [TEST] 基本調用成功');
      console.log('📊 [TEST] 回應長度:', text.length);
      console.log('🔍 [TEST] 回應內容:', text.substring(0, 100));

      expect(text).toBeTruthy();
      expect(text.length).toBeGreaterThan(0);

    } catch (error) {
      console.error('❌ [TEST] 基本調用失敗:', error.message);
      throw error;
    }
  });

  test('測試 JSON 格式輸出（不使用 Schema）', async () => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    console.log('🧪 [TEST] 測試 JSON 格式輸出...');

    try {
      const prompt = `請生成一個簡單的 JSON 格式回應，包含以下結構：
{
  "questions": [
    {
      "id": "q1",
      "question": "您的學習目標是什麼？",
      "type": "text",
      "required": true
    }
  ]
}

請直接回傳 JSON，不要包含任何其他文字。`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      console.log('📊 [TEST] 回應長度:', text.length);
      console.log('🔍 [TEST] 原始回應:', text);

      // 嘗試解析 JSON
      const cleanedText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanedText);

      console.log('✅ [TEST] JSON 解析成功');
      console.log('📋 [TEST] 問題數量:', parsed.questions?.length || 0);

      expect(parsed).toBeTruthy();
      expect(parsed.questions).toBeDefined();

    } catch (error) {
      console.error('❌ [TEST] JSON 格式測試失敗:', error.message);
      throw error;
    }
  });

  test('測試 responseMimeType application/json', async () => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    console.log('🧪 [TEST] 測試 responseMimeType application/json...');

    try {
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: '請生成一個包含學習問題的 JSON 對象，格式為：{"questions": [{"id": "q1", "question": "問題內容", "type": "text", "required": true}]}' }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 1000,
          temperature: 0.1
        }
      });

      const response = result.response;
      const text = response.text();

      console.log('📊 [TEST] 回應長度:', text.length);
      console.log('🔍 [TEST] 原始回應:', text);

      // 直接解析 JSON (不需要清理)
      const parsed = JSON.parse(text);

      console.log('✅ [TEST] JSON responseMimeType 成功');
      console.log('📋 [TEST] 解析結果:', parsed);

      expect(parsed).toBeTruthy();

    } catch (error) {
      console.error('❌ [TEST] responseMimeType 測試失敗:', error.message);
      console.error('🔍 [TEST] 錯誤詳情:', error);
      throw error;
    }
  });
});