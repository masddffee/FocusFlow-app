// /lib/services/schemaFactory.js
// Schema 工廠模式實現 - 動態 Schema 生成器

const { SchemaType } = require('@google/generative-ai');

/**
 * Schema 註冊中心 - 管理所有 Schema 定義
 */
class SchemaRegistry {
  constructor() {
    this.schemas = new Map();
    this.initializeDefaultSchemas();
  }

  /**
   * 初始化預設 Schema 定義
   */
  initializeDefaultSchemas() {
    // 基礎組件 Schema
    this.registerBaseComponents();
    
    // 主要 Schema 類型
    this.registerMainSchemas();
  }

  /**
   * 註冊基礎組件
   */
  registerBaseComponents() {
    // 基礎問題組件
    this.register('baseQuestion', {
      type: SchemaType.OBJECT,
      properties: {
        id: { 
          type: SchemaType.STRING,
          description: "Question identifier" 
        },
        question: { 
          type: SchemaType.STRING,
          description: "Question text" 
        },
        type: { 
          type: SchemaType.STRING,
          description: "Question type",
          enum: ["text", "choice", "scale", "boolean"]
        },
        required: { 
          type: SchemaType.BOOLEAN,
          description: "Is required"
        }
      },
      required: ["id", "question", "type", "required"]
    });

    // 基礎子任務組件
    this.register('baseSubtask', {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.STRING },
        title: { type: SchemaType.STRING },
        text: { type: SchemaType.STRING },
        aiEstimatedDuration: { type: SchemaType.NUMBER },
        difficulty: { 
          type: SchemaType.STRING,
          enum: ["easy", "medium", "hard"]
        },
        order: { type: SchemaType.NUMBER },
        completed: { type: SchemaType.BOOLEAN },
        skills: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING }
        },
        recommendedResources: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING }
        },
        phase: { 
          type: SchemaType.STRING,
          enum: ["knowledge", "practice", "application", "reflection", "output", "review"]
        }
      },
      required: ["id", "title", "text", "aiEstimatedDuration", "difficulty", "order", "completed"]
    });

    // 基礎學習計劃組件
    this.register('baseLearningPlan', {
      type: SchemaType.OBJECT,
      properties: {
        achievableGoal: { type: SchemaType.STRING },
        recommendedTools: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING }
        },
        checkpoints: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING }
        },
        estimatedTimeToCompletion: { type: SchemaType.NUMBER }
      },
      required: ["achievableGoal", "recommendedTools", "checkpoints", "estimatedTimeToCompletion"]
    });
  }

  /**
   * 註冊主要 Schema 類型
   */
  registerMainSchemas() {
    // 個人化問題 Schema
    this.register('personalizationQuestions', {
      type: SchemaType.OBJECT,
      properties: {
        questions: {
          type: SchemaType.ARRAY,
          items: this.get('baseQuestion')
        }
      },
      required: ["questions"]
    });

    // 子任務 Schema
    this.register('subtasks', {
      type: SchemaType.OBJECT,
      properties: {
        subtasks: {
          type: SchemaType.ARRAY,
          items: this.get('baseSubtask')
        }
      },
      required: ["subtasks"]
    });

    // 學習計劃 Schema
    this.register('learningPlan', this.get('baseLearningPlan'));
  }

  /**
   * 註冊 Schema
   * @param {string} name - Schema 名稱
   * @param {Object} schema - Schema 定義
   */
  register(name, schema) {
    this.schemas.set(name, this.deepClone(schema));
  }

  /**
   * 獲取 Schema
   * @param {string} name - Schema 名稱
   * @returns {Object} Schema 定義
   */
  get(name) {
    if (!this.schemas.has(name)) {
      throw new Error(`Schema not found: ${name}`);
    }
    return this.deepClone(this.schemas.get(name));
  }

  /**
   * 檢查 Schema 是否存在
   * @param {string} name - Schema 名稱
   * @returns {boolean}
   */
  exists(name) {
    return this.schemas.has(name);
  }

  /**
   * 列出所有 Schema
   * @returns {Array<string>} Schema 名稱列表
   */
  list() {
    return Array.from(this.schemas.keys());
  }

  /**
   * 更新 Schema
   * @param {string} name - Schema 名稱
   * @param {Object} schema - 新的 Schema 定義
   */
  update(name, schema) {
    if (!this.schemas.has(name)) {
      throw new Error(`Cannot update non-existent schema: ${name}`);
    }
    this.schemas.set(name, this.deepClone(schema));
  }

  /**
   * 深度複製對象
   * @param {Object} obj - 要複製的對象
   * @returns {Object} 複製後的對象
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const cloned = {};
      Object.keys(obj).forEach(key => {
        cloned[key] = this.deepClone(obj[key]);
      });
      return cloned;
    }
    return obj;
  }
}

/**
 * Schema 驗證器 - 動態驗證 Schema 響應
 */
class SchemaValidator {
  constructor() {
    this.customValidators = new Map();
  }

  /**
   * 添加自定義驗證器
   * @param {string} schemaType - Schema 類型
   * @param {Function} validator - 驗證函數
   */
  addCustomValidator(schemaType, validator) {
    this.customValidators.set(schemaType, validator);
  }

  /**
   * 驗證響應數據
   * @param {Object} response - 響應數據
   * @param {string} schemaType - Schema 類型
   * @returns {Object} 驗證結果
   */
  validate(response, schemaType) {
    // 檢查是否有自定義驗證器
    if (this.customValidators.has(schemaType)) {
      return this.customValidators.get(schemaType)(response, schemaType);
    }

    // 使用內建驗證邏輯
    return this.validateBuiltInSchema(response, schemaType);
  }

  /**
   * 驗證內建 Schema
   * @param {Object} response - 響應數據
   * @param {string} schemaType - Schema 類型
   * @returns {Object} 驗證結果
   */
  validateBuiltInSchema(response, schemaType) {
    const errors = [];

    switch (schemaType) {
      case 'personalizationQuestions':
        return this.validatePersonalizationQuestions(response);
      
      case 'subtasks':
        return this.validateSubtasks(response);
      
      case 'learningPlan':
        return this.validateLearningPlan(response);
      
      case 'unifiedLearningPlan':
        return this.validateUnifiedLearningPlan(response);
      
      default:
        errors.push(`Unknown schema type: ${schemaType}`);
        return { isValid: false, errors };
    }
  }

  /**
   * 驗證個人化問題
   */
  validatePersonalizationQuestions(response) {
    const errors = [];

    if (!response.questions || !Array.isArray(response.questions)) {
      errors.push('Missing or invalid questions array');
      return { isValid: false, errors };
    }

    response.questions.forEach((question, index) => {
      const requiredFields = ['id', 'question', 'type', 'required'];
      const missingFields = requiredFields.filter(field => {
        if (field === 'required') return typeof question[field] !== 'boolean';
        return !question[field];
      });

      if (missingFields.length > 0) {
        errors.push(`Question ${index + 1}: missing fields [${missingFields.join(', ')}]`);
      }

      // 驗證問題類型
      if (question.type && !['text', 'choice', 'scale', 'boolean'].includes(question.type)) {
        errors.push(`Question ${index + 1}: invalid type "${question.type}"`);
      }

      // 驗證選擇題選項
      if (question.type === 'choice') {
        if (!question.options || !Array.isArray(question.options) || question.options.length === 0) {
          // 自動修復：轉換為文字類型
          question.type = 'text';
          delete question.options;
        }
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * 驗證子任務
   */
  validateSubtasks(response) {
    const errors = [];

    if (!response.subtasks || !Array.isArray(response.subtasks)) {
      errors.push('Missing or invalid subtasks array');
      return { isValid: false, errors };
    }

    response.subtasks.forEach((subtask, index) => {
      const requiredFields = ['id', 'title', 'text', 'aiEstimatedDuration', 'difficulty', 'order', 'completed'];
      const missingFields = requiredFields.filter(field => {
        if (field === 'completed') return typeof subtask[field] !== 'boolean';
        if (field === 'aiEstimatedDuration' || field === 'order') return typeof subtask[field] !== 'number';
        return !subtask[field];
      });

      if (missingFields.length > 0) {
        errors.push(`Subtask ${index + 1}: missing fields [${missingFields.join(', ')}]`);
      }

      // 驗證枚舉值
      if (subtask.difficulty && !['easy', 'medium', 'hard'].includes(subtask.difficulty)) {
        errors.push(`Subtask ${index + 1}: invalid difficulty "${subtask.difficulty}"`);
      }
      if (subtask.phase && !['knowledge', 'practice', 'application', 'reflection', 'output', 'review'].includes(subtask.phase)) {
        errors.push(`Subtask ${index + 1}: invalid phase "${subtask.phase}"`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * 驗證學習計劃
   */
  validateLearningPlan(response) {
    const errors = [];

    if (!response.achievableGoal || typeof response.achievableGoal !== 'string') {
      errors.push('Missing or invalid achievableGoal string');
    }

    if (!response.recommendedTools || !Array.isArray(response.recommendedTools)) {
      errors.push('Missing or invalid recommendedTools array');
    }

    if (!response.checkpoints || !Array.isArray(response.checkpoints)) {
      errors.push('Missing or invalid checkpoints array');
    }

    if (typeof response.estimatedTimeToCompletion !== 'number') {
      errors.push('Missing or invalid estimatedTimeToCompletion number');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * 驗證統一學習計劃
   */
  validateUnifiedLearningPlan(response) {
    const errors = [];

    // 驗證個人化問題
    if (!response.personalizationQuestions || !Array.isArray(response.personalizationQuestions)) {
      errors.push('Missing personalizationQuestions array');
    } else {
      const questionsResult = this.validatePersonalizationQuestions({ questions: response.personalizationQuestions });
      if (!questionsResult.isValid) {
        errors.push(...questionsResult.errors);
      }
    }

    // 驗證學習計劃
    if (!response.learningPlan || typeof response.learningPlan !== 'object') {
      errors.push('Missing learningPlan object');
    } else {
      const planResult = this.validateLearningPlan(response.learningPlan);
      if (!planResult.isValid) {
        errors.push(...planResult.errors);
      }
    }

    // 驗證子任務
    if (!response.subtasks || !Array.isArray(response.subtasks)) {
      errors.push('Missing subtasks array');
    } else {
      const subtasksResult = this.validateSubtasks({ subtasks: response.subtasks });
      if (!subtasksResult.isValid) {
        errors.push(...subtasksResult.errors);
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}

/**
 * Schema 工廠 - 動態生成 Schema
 */
class SchemaFactory {
  constructor() {
    this.registry = new SchemaRegistry();
    this.validator = new SchemaValidator();
    this.cache = new Map();
  }

  /**
   * 創建 Schema
   * @param {string} schemaType - Schema 類型
   * @param {Object} options - 選項
   * @returns {Object} 生成的 Schema
   */
  createSchema(schemaType, options = {}) {
    // 檢查快取
    const cacheKey = this.generateCacheKey(schemaType, options);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let schema;

    switch (schemaType) {
      case 'personalizationQuestions':
        schema = this.createPersonalizationQuestionsSchema(options);
        break;
      
      case 'subtasks':
        schema = this.createSubtasksSchema(options);
        break;
      
      case 'learningPlan':
        schema = this.createLearningPlanSchema(options);
        break;
      
      case 'unifiedLearningPlan':
        schema = this.createUnifiedLearningPlanSchema(options);
        break;
      
      default:
        throw new Error(`Unknown schema type: ${schemaType}`);
    }

    // 應用通用選項
    schema = this.applyCommonOptions(schema, options);

    // 快取結果
    this.cache.set(cacheKey, schema);

    return schema;
  }

  /**
   * 創建個人化問題 Schema
   */
  createPersonalizationQuestionsSchema(options = {}) {
    const baseSchema = this.registry.get('personalizationQuestions');
    
    // 應用自定義枚舉
    if (options.customEnums && options.customEnums.questionType) {
      baseSchema.properties.questions.items.properties.type.enum = options.customEnums.questionType;
    }

    // 應用最大項目數限制
    if (options.maxItems) {
      baseSchema.properties.questions.maxItems = options.maxItems;
    }

    return baseSchema;
  }

  /**
   * 創建子任務 Schema
   */
  createSubtasksSchema(options = {}) {
    const baseSchema = this.registry.get('subtasks');
    
    // 應用自定義難度枚舉
    if (options.customEnums && options.customEnums.difficulty) {
      baseSchema.properties.subtasks.items.properties.difficulty.enum = options.customEnums.difficulty;
    }

    // 應用最大項目數限制
    if (options.maxItems) {
      baseSchema.properties.subtasks.maxItems = options.maxItems;
    }

    // 條件性欄位包含
    if (options.includeOptionalFields === false) {
      const requiredFields = ["id", "title", "text", "aiEstimatedDuration", "difficulty", "order", "completed"];
      const itemProperties = baseSchema.properties.subtasks.items.properties;
      
      Object.keys(itemProperties).forEach(key => {
        if (!requiredFields.includes(key)) {
          delete itemProperties[key];
        }
      });
    }

    return baseSchema;
  }

  /**
   * 創建學習計劃 Schema
   */
  createLearningPlanSchema(options = {}) {
    const baseSchema = this.registry.get('learningPlan');
    
    // 如果包含子任務
    if (options.includeSubtasks) {
      baseSchema.properties.subtasks = {
        type: SchemaType.ARRAY,
        items: this.registry.get('baseSubtask')
      };
      baseSchema.required.push('subtasks');
    }

    return baseSchema;
  }

  /**
   * 創建統一學習計劃 Schema
   */
  createUnifiedLearningPlanSchema(options = {}) {
    return {
      type: SchemaType.OBJECT,
      properties: {
        personalizationQuestions: {
          type: SchemaType.ARRAY,
          items: this.registry.get('baseQuestion')
        },
        learningPlan: this.registry.get('baseLearningPlan'),
        subtasks: {
          type: SchemaType.ARRAY,
          items: this.registry.get('baseSubtask')
        }
      },
      required: ["personalizationQuestions", "learningPlan", "subtasks"]
    };
  }

  /**
   * 組合多個 Schema
   * @param {Array<string>} schemaTypes - Schema 類型列表
   * @param {Object} options - 選項
   * @returns {Object} 組合的 Schema
   */
  combineSchemas(schemaTypes, options = {}) {
    const combinedSchema = {
      type: SchemaType.OBJECT,
      properties: {},
      required: []
    };

    schemaTypes.forEach(schemaType => {
      const schema = this.createSchema(schemaType, options);
      
      if (schemaType === 'personalizationQuestions') {
        combinedSchema.properties.personalizationQuestions = schema.properties.questions;
        combinedSchema.required.push('personalizationQuestions');
      } else if (schemaType === 'subtasks') {
        combinedSchema.properties.subtasks = schema.properties.subtasks;
        combinedSchema.required.push('subtasks');
      } else if (schemaType === 'learningPlan') {
        combinedSchema.properties.learningPlan = schema;
        combinedSchema.required.push('learningPlan');
      }
    });

    return combinedSchema;
  }

  /**
   * 獲取基礎子任務 Schema
   * @returns {Object} 基礎子任務 Schema
   */
  getBaseSubtaskSchema() {
    return this.registry.get('baseSubtask');
  }

  /**
   * 擴展 Schema
   * @param {Object} baseSchema - 基礎 Schema
   * @param {Object} extensions - 擴展欄位
   * @returns {Object} 擴展後的 Schema
   */
  extendSchema(baseSchema, extensions) {
    const extendedSchema = this.registry.deepClone(baseSchema);
    
    Object.keys(extensions).forEach(key => {
      extendedSchema.properties[key] = extensions[key];
    });

    return extendedSchema;
  }

  /**
   * 創建條件性 Schema
   * @param {string} schemaType - Schema 類型
   * @param {Object} conditions - 條件
   * @returns {Object} 條件性 Schema
   */
  createConditionalSchema(schemaType, conditions) {
    const options = {};

    // 根據條件設置選項
    if (conditions.includeSkills !== undefined) {
      if (!conditions.includeSkills) {
        options.excludeFields = options.excludeFields || [];
        options.excludeFields.push('skills');
      }
    }

    if (conditions.includeResources !== undefined) {
      if (!conditions.includeResources) {
        options.excludeFields = options.excludeFields || [];
        options.excludeFields.push('recommendedResources');
      }
    }

    if (conditions.maxDifficulty) {
      const difficultyLevels = ['easy', 'medium', 'hard'];
      const maxIndex = difficultyLevels.indexOf(conditions.maxDifficulty);
      if (maxIndex !== -1) {
        options.customEnums = options.customEnums || {};
        options.customEnums.difficulty = difficultyLevels.slice(0, maxIndex + 1);
      }
    }

    const schema = this.createSchema(schemaType, options);

    // 應用排除欄位
    if (options.excludeFields && schemaType === 'subtasks') {
      const itemProperties = schema.properties.subtasks.items.properties;
      options.excludeFields.forEach(field => {
        delete itemProperties[field];
      });
    }

    return schema;
  }

  /**
   * 驗證響應
   * @param {Object} response - 響應數據
   * @param {string} schemaType - Schema 類型
   * @returns {Object} 驗證結果
   */
  validateResponse(response, schemaType) {
    return this.validator.validate(response, schemaType);
  }

  /**
   * 應用通用選項
   * @param {Object} schema - Schema
   * @param {Object} options - 選項
   * @returns {Object} 處理後的 Schema
   */
  applyCommonOptions(schema, options) {
    // 這裡可以添加通用的 Schema 處理邏輯
    return schema;
  }

  /**
   * 生成快取鍵
   * @param {string} schemaType - Schema 類型
   * @param {Object} options - 選項
   * @returns {string} 快取鍵
   */
  generateCacheKey(schemaType, options) {
    return `${schemaType}_${JSON.stringify(options)}`;
  }

  /**
   * 清除快取
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 獲取快取統計
   * @returns {Object} 快取統計
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = {
  SchemaFactory,
  SchemaRegistry,
  SchemaValidator
};