import { test, expect } from '@playwright/test';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini 模型對比測試 - 驗證 1.5 Flash vs 2.5 Flash 的穩定性
 * 重點測試 responseSchema 的可靠性和 JSON 解析成功率
 */

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    personalizationQuestions: {
      type: "array",
      items: { type: "string" }
    },
    learningPlan: {
      type: "object",
      properties: {
        achievableGoal: { type: "string" },
        recommendedTools: { type: "array", items: { type: "string" } },
        checkpoints: { type: "array", items: { type: "string" } },
        estimatedTimeToCompletion: { type: "string" }
      },
      required: ["achievableGoal", "recommendedTools", "checkpoints", "estimatedTimeToCompletion"]
    },
    subtasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          text: { type: "string" },
          aiEstimatedDuration: { type: "number" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          order: { type: "number" },
          completed: { type: "boolean" },
          skills: { type: "array", items: { type: "string" } },
          recommendedResources: { type: "array", items: { type: "string" } },
          phase: { type: "string", enum: ["knowledge", "practice", "application", "reflection", "output", "review"] },
          dependencies: { type: "array", items: { type: "string" }, nullable: true }
        },
        required: ["id", "title", "text", "aiEstimatedDuration", "difficulty", "order", "completed"]
      }
    }
  },
  required: ["personalizationQuestions", "learningPlan", "subtasks"]
};

test.describe('Gemini 模型穩定性對比測試', () => {
  let genAI: GoogleGenerativeAI;
  
  test.beforeEach(() => {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  });

  test('對比測試: Gemini 1.5 Flash vs 2.5 Flash 響應穩定性', async () => {
    const testPrompt = `
創建一個學習 React Native 開發的完整計劃，包含：
1. 個性化問題（2-3個）
2. 學習計劃（目標、工具、檢查點、時間估算）
3. 詳細子任務（5-7個，涵蓋基礎到進階）

學習者背景：有 JavaScript 基礎，想要學習跨平台移動開發
`;

    const models = [
      { name: 'gemini-1.5-flash', expected: '穩定' },
      { name: 'gemini-2.5-flash', expected: '可能截斷' }
    ];

    const results: Record<string, any> = {};

    for (const modelInfo of models) {
      console.log(`\n🧪 測試模型: ${modelInfo.name}`);
      
      const model = genAI.getGenerativeModel({ model: modelInfo.name });
      const testResults = {
        modelName: modelInfo.name,
        attempts: [],
        successCount: 0,
        totalAttempts: 3
      };

      // 每個模型測試 3 次
      for (let i = 1; i <= 3; i++) {
        console.log(`  嘗試 ${i}/3 - ${modelInfo.name}`);
        
        const attemptResult = {
          attempt: i,
          success: false,
          error: null,
          responseLength: 0,
          jsonValid: false,
          hasAllRequiredFields: false,
          subtaskCount: 0,
          processingTime: 0
        };

        const startTime = Date.now();

        try {
          const result = await model.generateContent({
            contents: [{ 
              role: 'user', 
              parts: [{ text: testPrompt }] 
            }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA,
              maxOutputTokens: 2000,
              temperature: 0.1,
              topP: 0.5
            }
          });

          attemptResult.processingTime = Date.now() - startTime;
          const responseText = result.response.text();
          attemptResult.responseLength = responseText.length;

          console.log(`    響應長度: ${responseText.length} 字符`);
          console.log(`    處理時間: ${attemptResult.processingTime}ms`);

          // 嘗試解析 JSON
          try {
            const parsedResponse = JSON.parse(responseText);
            attemptResult.jsonValid = true;
            
            // 檢查必要欄位
            const hasPersonalizationQuestions = Array.isArray(parsedResponse.personalizationQuestions);
            const hasLearningPlan = parsedResponse.learningPlan && typeof parsedResponse.learningPlan === 'object';
            const hasSubtasks = Array.isArray(parsedResponse.subtasks);
            
            attemptResult.hasAllRequiredFields = hasPersonalizationQuestions && hasLearningPlan && hasSubtasks;
            attemptResult.subtaskCount = hasSubtasks ? parsedResponse.subtasks.length : 0;
            
            if (attemptResult.hasAllRequiredFields) {
              attemptResult.success = true;
              testResults.successCount++;
              console.log(`    ✅ 成功 - ${parsedResponse.subtasks.length} 個子任務`);
            } else {
              console.log(`    ⚠️ JSON 有效但缺少必要欄位`);
            }

          } catch (parseError) {
            attemptResult.error = `JSON 解析失敗: ${parseError instanceof Error ? parseError.message : String(parseError)}`;
            console.log(`    ❌ JSON 解析失敗: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
            console.log(`    原始響應前 200 字符: ${responseText.substring(0, 200)}...`);
          }

        } catch (apiError) {
          attemptResult.processingTime = Date.now() - startTime;
          attemptResult.error = `API 調用失敗: ${apiError instanceof Error ? apiError.message : String(apiError)}`;
          console.log(`    ❌ API 調用失敗: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
        }

        testResults.attempts.push(attemptResult);
        
        // 短暫延遲避免 rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      results[modelInfo.name] = testResults;
      
      const successRate = (testResults.successCount / testResults.totalAttempts * 100).toFixed(1);
      console.log(`\n📊 ${modelInfo.name} 總結:`);
      console.log(`  成功率: ${successRate}% (${testResults.successCount}/${testResults.totalAttempts})`);
      console.log(`  平均響應長度: ${Math.round(testResults.attempts.reduce((sum, a) => sum + a.responseLength, 0) / testResults.attempts.length)} 字符`);
      console.log(`  平均處理時間: ${Math.round(testResults.attempts.reduce((sum, a) => sum + a.processingTime, 0) / testResults.attempts.length)}ms`);
    }

    // 分析結果
    console.log('\n🔍 模型對比分析:');
    
    const model15Results = results['gemini-1.5-flash'];
    const model25Results = results['gemini-2.5-flash'];
    
    const model15SuccessRate = (model15Results.successCount / model15Results.totalAttempts) * 100;
    const model25SuccessRate = (model25Results.successCount / model25Results.totalAttempts) * 100;
    
    console.log(`Gemini 1.5 Flash 成功率: ${model15SuccessRate.toFixed(1)}%`);
    console.log(`Gemini 2.5 Flash 成功率: ${model25SuccessRate.toFixed(1)}%`);
    
    // 期望 1.5 Flash 表現更穩定
    expect(model15SuccessRate).toBeGreaterThanOrEqual(80); // 至少 80% 成功率
    
    if (model15SuccessRate > model25SuccessRate) {
      console.log('✅ 驗證: Gemini 1.5 Flash 確實比 2.5 Flash 更穩定');
    } else {
      console.log('⚠️ 意外: Gemini 2.5 Flash 表現未如預期差');
    }

    // 檢查錯誤模式
    console.log('\n🐛 錯誤模式分析:');
    
    for (const [modelName, results] of Object.entries(results)) {
      const failedAttempts = results.attempts.filter((a: any) => !a.success);
      if (failedAttempts.length > 0) {
        console.log(`${modelName} 失敗原因:`);
        failedAttempts.forEach((attempt: any, index: number) => {
          console.log(`  ${index + 1}. ${attempt.error || '結構不完整'}`);
        });
      }
    }

    // 輸出詳細結果供進一步分析
    console.log('\n📋 完整測試結果:', JSON.stringify(results, null, 2));
  });

  test('簡化測試: 驗證修復後的 geminiService 調用', async () => {
    console.log('🧪 測試修復後的 geminiService 邏輯...');
    
    // 模擬修復後的邏輯：直接使用 responseSchema
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const simpleSchema = {
      type: "object",
      properties: {
        questions: {
          type: "array", 
          items: { type: "string" }
        }
      },
      required: ["questions"]
    };

    const result = await model.generateContent({
      contents: [{ 
        role: 'user', 
        parts: [{ text: '生成 3 個關於學習程式設計的問題' }] 
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: simpleSchema,
        maxOutputTokens: 500,
        temperature: 0.1,
        topP: 0.5
      }
    });

    const responseText = result.response.text();
    console.log(`響應長度: ${responseText.length} 字符`);
    console.log(`響應內容: ${responseText}`);

    // 應該能直接解析，無需額外清理
    const parsedResponse = JSON.parse(responseText);
    
    expect(parsedResponse).toHaveProperty('questions');
    expect(Array.isArray(parsedResponse.questions)).toBe(true);
    expect(parsedResponse.questions.length).toBeGreaterThan(0);
    
    console.log(`✅ 成功生成 ${parsedResponse.questions.length} 個問題`);
    parsedResponse.questions.forEach((q: string, i: number) => {
      console.log(`  ${i + 1}. ${q}`);
    });
  });
});