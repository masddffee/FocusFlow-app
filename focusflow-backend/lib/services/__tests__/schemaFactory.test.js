// /lib/services/__tests__/schemaFactory.test.js
// Schema 工廠模式單元測試

const { SchemaFactory, SchemaRegistry, SchemaValidator } = require('../schemaFactory');
const { SchemaType } = require('@google/generative-ai');

describe('Schema Factory Pattern Tests', () => {
  let schemaFactory;
  let schemaRegistry;
  let schemaValidator;

  beforeEach(() => {
    schemaFactory = new SchemaFactory();
    schemaRegistry = new SchemaRegistry();
    schemaValidator = new SchemaValidator();
  });

  describe('SchemaFactory', () => {
    test('應該建立基本的 personalizationQuestions schema', () => {
      const schema = schemaFactory.createSchema('personalizationQuestions');
      
      expect(schema).toBeDefined();
      expect(schema.type).toBe(SchemaType.OBJECT);
      expect(schema.properties.questions).toBeDefined();
      expect(schema.properties.questions.type).toBe(SchemaType.ARRAY);
      expect(schema.required).toContain('questions');
    });

    test('應該建立基本的 subtasks schema', () => {
      const schema = schemaFactory.createSchema('subtasks');
      
      expect(schema).toBeDefined();
      expect(schema.type).toBe(SchemaType.OBJECT);
      expect(schema.properties.subtasks).toBeDefined();
      expect(schema.properties.subtasks.type).toBe(SchemaType.ARRAY);
      expect(schema.required).toContain('subtasks');
    });

    test('應該建立基本的 learningPlan schema', () => {
      const schema = schemaFactory.createSchema('learningPlan');
      
      expect(schema).toBeDefined();
      expect(schema.type).toBe(SchemaType.OBJECT);
      expect(schema.properties.achievableGoal).toBeDefined();
      expect(schema.properties.recommendedTools).toBeDefined();
      expect(schema.properties.checkpoints).toBeDefined();
      expect(schema.properties.estimatedTimeToCompletion).toBeDefined();
    });

    test('應該支援動態 schema 選項', () => {
      const options = {
        includeOptionalFields: true,
        maxItems: 10,
        customEnums: {
          difficulty: ['beginner', 'intermediate', 'advanced']
        }
      };
      
      const schema = schemaFactory.createSchema('subtasks', options);
      
      expect(schema).toBeDefined();
      // 驗證自定義選項被應用
      const subtaskProperties = schema.properties.subtasks.items.properties;
      expect(subtaskProperties.difficulty.enum).toEqual(['beginner', 'intermediate', 'advanced']);
    });

    test('應該拋出錯誤當 schema 類型不存在', () => {
      expect(() => {
        schemaFactory.createSchema('nonExistentSchema');
      }).toThrow('Unknown schema type: nonExistentSchema');
    });

    test('應該支援 schema 組合', () => {
      const combinedSchema = schemaFactory.combineSchemas([
        'personalizationQuestions',
        'learningPlan',
        'subtasks'
      ]);
      
      expect(combinedSchema).toBeDefined();
      expect(combinedSchema.type).toBe(SchemaType.OBJECT);
      expect(combinedSchema.properties.personalizationQuestions).toBeDefined();
      expect(combinedSchema.properties.learningPlan).toBeDefined();
      expect(combinedSchema.properties.subtasks).toBeDefined();
    });
  });

  describe('SchemaRegistry', () => {
    test('應該註冊和檢索 schema 定義', () => {
      const customSchema = {
        type: SchemaType.OBJECT,
        properties: {
          test: { type: SchemaType.STRING }
        }
      };
      
      schemaRegistry.register('custom', customSchema);
      const retrieved = schemaRegistry.get('custom');
      
      expect(retrieved).toEqual(customSchema);
    });

    test('應該列出所有已註冊的 schema', () => {
      schemaRegistry.register('test1', { type: SchemaType.STRING });
      schemaRegistry.register('test2', { type: SchemaType.NUMBER });
      
      const allSchemas = schemaRegistry.list();
      
      expect(allSchemas).toContain('test1');
      expect(allSchemas).toContain('test2');
    });

    test('應該檢查 schema 是否存在', () => {
      schemaRegistry.register('existing', { type: SchemaType.STRING });
      
      expect(schemaRegistry.exists('existing')).toBe(true);
      expect(schemaRegistry.exists('nonExisting')).toBe(false);
    });

    test('應該支援 schema 更新', () => {
      const originalSchema = { type: SchemaType.STRING };
      const updatedSchema = { type: SchemaType.NUMBER };
      
      schemaRegistry.register('updateTest', originalSchema);
      schemaRegistry.update('updateTest', updatedSchema);
      
      const retrieved = schemaRegistry.get('updateTest');
      expect(retrieved).toEqual(updatedSchema);
    });
  });

  describe('SchemaValidator', () => {
    test('應該驗證有效的 personalizationQuestions 響應', () => {
      const validResponse = {
        questions: [
          {
            id: 'q1',
            question: 'What is your learning goal?',
            type: 'text',
            required: true
          }
        ]
      };
      
      const result = schemaValidator.validate(validResponse, 'personalizationQuestions');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('應該檢測無效的 subtasks 響應', () => {
      const invalidResponse = {
        subtasks: [
          {
            // 缺少必填欄位
            title: 'Test task'
          }
        ]
      };
      
      const result = schemaValidator.validate(invalidResponse, 'subtasks');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('應該支援自定義驗證規則', () => {
      const customValidator = (data, schemaType) => {
        if (schemaType === 'custom' && !data.customField) {
          return { isValid: false, errors: ['Missing customField'] };
        }
        return { isValid: true, errors: [] };
      };
      
      schemaValidator.addCustomValidator('custom', customValidator);
      
      const result = schemaValidator.validate({}, 'custom');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing customField');
    });

    test('應該提供詳細的錯誤訊息', () => {
      const invalidResponse = {
        questions: [
          {
            id: 'q1',
            // 缺少 question, type, required 欄位
          }
        ]
      };
      
      const result = schemaValidator.validate(invalidResponse, 'personalizationQuestions');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('missing fields'))).toBe(true);
    });
  });

  describe('Schema 建構器', () => {
    test('應該建立具有可重用組件的 schema', () => {
      const baseSubtask = schemaFactory.getBaseSubtaskSchema();
      
      expect(baseSubtask).toBeDefined();
      expect(baseSubtask.properties.id).toBeDefined();
      expect(baseSubtask.properties.title).toBeDefined();
      expect(baseSubtask.properties.text).toBeDefined();
      expect(baseSubtask.properties.aiEstimatedDuration).toBeDefined();
    });

    test('應該支援 schema 擴展', () => {
      const baseSchema = schemaFactory.getBaseSubtaskSchema();
      const extendedSchema = schemaFactory.extendSchema(baseSchema, {
        customField: { type: SchemaType.STRING },
        customArray: { 
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING }
        }
      });
      
      expect(extendedSchema.properties.customField).toBeDefined();
      expect(extendedSchema.properties.customArray).toBeDefined();
      // 原始欄位應該保留
      expect(extendedSchema.properties.id).toBeDefined();
      expect(extendedSchema.properties.title).toBeDefined();
    });

    test('應該支援條件性 schema 生成', () => {
      const conditions = {
        includeSkills: true,
        includeResources: false,
        maxDifficulty: 'medium'
      };
      
      const conditionalSchema = schemaFactory.createConditionalSchema('subtasks', conditions);
      
      const subtaskProps = conditionalSchema.properties.subtasks.items.properties;
      expect(subtaskProps.skills).toBeDefined(); // 應該包含
      expect(subtaskProps.recommendedResources).toBeUndefined(); // 應該排除
    });
  });

  describe('效能測試', () => {
    test('應該在合理時間內生成複雜 schema', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        schemaFactory.createSchema('unifiedLearningPlan');
      }
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // 100 次生成應該在 1 秒內完成
      expect(executionTime).toBeLessThan(1000);
    });

    test('應該快取已生成的 schema', () => {
      const schema1 = schemaFactory.createSchema('subtasks');
      const schema2 = schemaFactory.createSchema('subtasks');
      
      // 第二次調用應該回傳快取的結果
      expect(schema1).toBe(schema2);
    });
  });

  describe('向後兼容性測試', () => {
    test('應該產生與原始 RESPONSE_SCHEMAS 相同的結構', () => {
      const originalPersonalizationQuestions = {
        type: SchemaType.OBJECT,
        properties: {
          questions: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.STRING, description: "Question identifier" },
                question: { type: SchemaType.STRING, description: "Question text" },
                type: { 
                  type: SchemaType.STRING,
                  description: "Question type",
                  enum: ["text", "choice", "scale", "boolean"]
                },
                required: { type: SchemaType.BOOLEAN, description: "Is required" }
              },
              required: ["id", "question", "type", "required"]
            }
          }
        },
        required: ["questions"]
      };
      
      const generatedSchema = schemaFactory.createSchema('personalizationQuestions');
      
      expect(generatedSchema).toEqual(originalPersonalizationQuestions);
    });
  });
});