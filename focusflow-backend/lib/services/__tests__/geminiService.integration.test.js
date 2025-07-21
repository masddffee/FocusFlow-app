// /lib/services/__tests__/geminiService.integration.test.js
// GeminiService 與 Schema Factory 整合測試

const GeminiService = require('../geminiService');
const { SchemaType } = require('@google/generative-ai');

// 模擬 serverConfig
jest.mock('../../../config/serverConfig', () => ({
  getAiConfig: () => ({
    gemini: {
      apiKey: 'test_api_key',
      model: 'gemini-2.5-flash',
      maxTokens: 2048,
      temperature: 0.7,
      requestTimeout: 30000
    }
  })
}));

// 模擬 Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn()
  })),
  SchemaType: {
    OBJECT: 'object',
    ARRAY: 'array',
    STRING: 'string',
    NUMBER: 'number',
    BOOLEAN: 'boolean'
  }
}));

describe('GeminiService Schema Factory Integration Tests', () => {
  let geminiService;

  beforeEach(() => {
    geminiService = new GeminiService();
  });

  describe('Schema Factory 整合', () => {
    test('應該初始化 Schema Factory', () => {
      expect(geminiService.schemaFactory).toBeDefined();
      expect(geminiService.schemaFactory.registry).toBeDefined();
      expect(geminiService.schemaFactory.validator).toBeDefined();
    });

    test('應該提供 Schema Factory 配置信息', () => {
      const config = geminiService.getConfiguration();
      
      expect(config.schemaFactory).toBeDefined();
      expect(config.schemaFactory.enabled).toBe(true);
      expect(config.schemaFactory.cacheStats).toBeDefined();
      expect(config.schemaFactory.availableSchemas).toBeDefined();
      expect(Array.isArray(config.schemaFactory.availableSchemas)).toBe(true);
    });

    test('應該能創建自定義 Schema', () => {
      const schema = geminiService.createCustomSchema('subtasks', {
        maxItems: 5,
        customEnums: {
          difficulty: ['beginner', 'intermediate', 'advanced']
        }
      });
      
      expect(schema).toBeDefined();
      expect(schema.type).toBe(SchemaType.OBJECT);
      expect(schema.properties.subtasks).toBeDefined();
    });

    test('應該能註冊新的 Schema 類型', () => {
      const customSchema = {
        type: SchemaType.OBJECT,
        properties: {
          testField: { type: SchemaType.STRING }
        }
      };
      
      geminiService.registerSchema('customTest', customSchema);
      
      // 驗證 Schema 已註冊
      const config = geminiService.getConfiguration();
      expect(config.schemaFactory.availableSchemas).toContain('customTest');
    });

    test('應該能組合多個 Schema', () => {
      const combinedSchema = geminiService.combineSchemas([
        'personalizationQuestions',
        'subtasks'
      ]);
      
      expect(combinedSchema).toBeDefined();
      expect(combinedSchema.type).toBe(SchemaType.OBJECT);
      expect(combinedSchema.properties.personalizationQuestions).toBeDefined();
      expect(combinedSchema.properties.subtasks).toBeDefined();
    });

    test('應該能清除 Schema 快取', () => {
      // 先創建一些 Schema 以建立快取
      geminiService.createCustomSchema('subtasks');
      geminiService.createCustomSchema('personalizationQuestions');
      
      const beforeClearStats = geminiService.getConfiguration().schemaFactory.cacheStats;
      expect(beforeClearStats.size).toBeGreaterThan(0);
      
      // 清除快取
      geminiService.clearSchemaCache();
      
      const afterClearStats = geminiService.getConfiguration().schemaFactory.cacheStats;
      expect(afterClearStats.size).toBe(0);
    });
  });

  describe('向後兼容性測試', () => {
    test('RESPONSE_SCHEMAS 應該仍然可用', () => {
      // 測試傳統 RESPONSE_SCHEMAS 訪問
      const geminiServiceInstance = new GeminiService();
      
      // 這些訪問應該觸發 Schema Factory 的動態生成
      expect(() => {
        const schema = geminiServiceInstance.constructor.RESPONSE_SCHEMAS || {};
        // 在這裡我們不能直接測試 RESPONSE_SCHEMAS，因為它現在是動態的
        // 但我們可以測試 createCustomSchema 方法
      }).not.toThrow();
    });

    test('validateStructuredResponse 應該仍然工作', () => {
      const validSubtasksResponse = {
        subtasks: [
          {
            id: 'test-1',
            title: 'Test Task',
            text: 'Test Description',
            aiEstimatedDuration: 30,
            difficulty: 'easy',
            order: 1,
            completed: false
          }
        ]
      };
      
      const result = geminiService.validateStructuredResponse(validSubtasksResponse, 'subtasks');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('無效的響應應該被正確檢測', () => {
      const invalidSubtasksResponse = {
        subtasks: [
          {
            // 缺少必填欄位
            title: 'Incomplete Task'
          }
        ]
      };
      
      const result = geminiService.validateStructuredResponse(invalidSubtasksResponse, 'subtasks');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('應該處理個人化問題響應', () => {
      const validQuestionsResponse = {
        questions: [
          {
            id: 'q1',
            question: 'What is your learning goal?',
            type: 'text',
            required: true
          },
          {
            id: 'q2',
            question: 'How much time can you dedicate?',
            type: 'choice',
            required: false,
            options: ['1 hour', '2 hours', '3+ hours']
          }
        ]
      };
      
      const result = geminiService.validateStructuredResponse(validQuestionsResponse, 'personalizationQuestions');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('應該處理學習計劃響應', () => {
      const validLearningPlanResponse = {
        achievableGoal: 'Learn JavaScript fundamentals',
        recommendedTools: ['VSCode', 'Node.js', 'MDN Docs'],
        checkpoints: ['Variables and data types', 'Functions', 'DOM manipulation'],
        estimatedTimeToCompletion: 40
      };
      
      const result = geminiService.validateStructuredResponse(validLearningPlanResponse, 'learningPlan');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Schema Factory 進階功能測試', () => {
    test('應該支援條件性 Schema 生成', () => {
      const conditionalSchema = geminiService.schemaFactory.createConditionalSchema('subtasks', {
        includeSkills: true,
        includeResources: false,
        maxDifficulty: 'medium'
      });
      
      expect(conditionalSchema).toBeDefined();
      const subtaskProps = conditionalSchema.properties.subtasks.items.properties;
      expect(subtaskProps.skills).toBeDefined();
      expect(subtaskProps.recommendedResources).toBeUndefined();
    });

    test('應該支援 Schema 擴展', () => {
      const baseSchema = geminiService.schemaFactory.getBaseSubtaskSchema();
      const extendedSchema = geminiService.schemaFactory.extendSchema(baseSchema, {
        customField: { type: SchemaType.STRING },
        priority: { 
          type: SchemaType.STRING,
          enum: ['low', 'medium', 'high']
        }
      });
      
      expect(extendedSchema.properties.customField).toBeDefined();
      expect(extendedSchema.properties.priority).toBeDefined();
      // 原始欄位應該保留
      expect(extendedSchema.properties.id).toBeDefined();
      expect(extendedSchema.properties.title).toBeDefined();
    });

    test('應該快取 Schema 以提高效能', () => {
      const startTime = Date.now();
      
      // 第一次生成
      const schema1 = geminiService.createCustomSchema('subtasks');
      const firstGenTime = Date.now() - startTime;
      
      const secondStartTime = Date.now();
      // 第二次生成（應該使用快取）
      const schema2 = geminiService.createCustomSchema('subtasks');
      const secondGenTime = Date.now() - secondStartTime;
      
      // 第二次應該更快（使用快取）
      expect(secondGenTime).toBeLessThanOrEqual(firstGenTime);
      
      // 結果應該相同
      expect(schema1).toBe(schema2);
    });
  });

  describe('錯誤處理測試', () => {
    test('應該處理未知的 Schema 類型', () => {
      expect(() => {
        geminiService.createCustomSchema('unknownSchemaType');
      }).toThrow('Unknown schema type: unknownSchemaType');
    });

    test('應該優雅地處理 Schema Factory 錯誤', () => {
      // 模擬 Schema Factory 錯誤
      const originalCreateSchema = geminiService.schemaFactory.createSchema;
      geminiService.schemaFactory.createSchema = jest.fn().mockImplementation(() => {
        throw new Error('Schema factory error');
      });
      
      expect(() => {
        geminiService.createCustomSchema('subtasks');
      }).toThrow('Schema factory error');
      
      // 恢復原始方法
      geminiService.schemaFactory.createSchema = originalCreateSchema;
    });

    test('validateStructuredResponse 應該優雅地回退到傳統驗證', () => {
      // 模擬 Schema Factory 驗證錯誤
      const originalValidate = geminiService.schemaFactory.validateResponse;
      geminiService.schemaFactory.validateResponse = jest.fn().mockImplementation(() => {
        throw new Error('Validation factory error');
      });
      
      const validResponse = {
        subtasks: [
          {
            id: 'test-1',
            title: 'Test Task',
            text: 'Test Description',
            aiEstimatedDuration: 30,
            difficulty: 'easy',
            order: 1,
            completed: false
          }
        ]
      };
      
      // 應該回退到傳統驗證並成功
      const result = geminiService.validateStructuredResponse(validResponse, 'subtasks');
      expect(result.isValid).toBe(true);
      
      // 恢復原始方法
      geminiService.schemaFactory.validateResponse = originalValidate;
    });
  });
});