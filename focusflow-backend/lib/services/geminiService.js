// /lib/services/geminiService.js

const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const dotenv = require('dotenv');
const { getAiConfig } = require('../../config/serverConfig');
const { SchemaFactory } = require('./schemaFactory');

// 確保環境變數正確載入
dotenv.config();

// 🔧 Phase 1B: 使用統一配置系統
const aiConfig = getAiConfig();

// 檢查 API key 是否正確載入
if (!aiConfig.gemini.apiKey || aiConfig.gemini.apiKey === 'your_gemini_api_key_here') {
  console.error('❌ [GEMINI] API key not configured properly');
  console.error('🔍 [GEMINI] Current API key length:', aiConfig.gemini.apiKey?.length || 0);
} else {
  console.log('✅ [GEMINI] API key configured, length:', aiConfig.gemini.apiKey.length);
  console.log(`🎯 [GEMINI] Model: ${aiConfig.gemini.model}`);
  console.log(`⚡ [GEMINI] Max tokens: ${aiConfig.gemini.maxTokens}`);
}

// 🚀 Phase 2A: 使用 Schema 工廠模式替代硬編碼 Schema
// Schema 工廠實例 - 動態生成和管理 Schema
const schemaFactory = new SchemaFactory();

// 向後兼容性：保留原始 RESPONSE_SCHEMAS 的結構，但使用工廠生成
// 這確保現有代碼可以無縫遷移到新的動態 Schema 系統
const getLegacyResponseSchemas = () => {
  return {
    personalizationQuestions: schemaFactory.createSchema('personalizationQuestions'),
    subtasks: schemaFactory.createSchema('subtasks'),
    learningPlan: schemaFactory.createSchema('learningPlan', { includeSubtasks: true }),
    unifiedLearningPlan: schemaFactory.createSchema('unifiedLearningPlan')
  };
};

// 向後兼容性：延遲載入的 RESPONSE_SCHEMAS
let _responseSchemas = null;
const RESPONSE_SCHEMAS = new Proxy({}, {
  get(target, prop) {
    if (!_responseSchemas) {
      _responseSchemas = getLegacyResponseSchemas();
    }
    return _responseSchemas[prop];
  }
});

class GeminiService {
  constructor() {
    // 🔧 Phase 1B: 使用統一配置系統替代硬編碼配置
    const aiConfig = getAiConfig();
    
    this.apiKey = aiConfig.gemini.apiKey;
    this.defaultModel = aiConfig.gemini.model;
    this.defaultMaxTokens = aiConfig.gemini.maxTokens;
    this.defaultTemperature = aiConfig.gemini.temperature;
    this.requestTimeout = aiConfig.gemini.requestTimeout;
    
    // 🚀 Phase 2A: 集成 Schema 工廠
    this.schemaFactory = new SchemaFactory();
    
    if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
      console.warn('⚠️ Warning: GEMINI_API_KEY not properly configured in .env file');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      console.log('✅ Gemini API key configured');
      console.log('🚀 Schema Factory initialized');
    }
  }

  /**
   * Call Gemini API with structured output using responseSchema
   * @param {string} systemPrompt - System instructions for the AI
   * @param {string} userContent - User input content
   * @param {Object} options - Additional options including schema
   * @returns {Promise<Object>} - Parsed AI response object
   */
  async callGeminiStructured(systemPrompt, userContent, options = {}) {
    const startTime = Date.now();
    const maxRetries = options.maxRetries || 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.genAI) {
          throw new Error('Gemini API not configured. Please check your GEMINI_API_KEY environment variable.');
        }

        const model = this.genAI.getGenerativeModel({ 
          model: options.model || this.defaultModel 
        });

        // 🚀 Phase 2A: 使用 Schema 工廠動態生成 Schema
        const schemaType = options.schemaType || 'subtasks';
        let responseSchema;
        
        try {
          // 首先嘗試使用 Schema 工廠
          responseSchema = this.schemaFactory.createSchema(schemaType, options.schemaOptions || {});
        } catch (factoryError) {
          // 向後兼容性：回退到傳統 Schema
          responseSchema = RESPONSE_SCHEMAS[schemaType];
          if (!responseSchema) {
            throw new Error(`Unknown schema type: ${schemaType}. Factory error: ${factoryError.message}`);
          }
          console.warn(`⚠️ Using legacy schema for ${schemaType}: ${factoryError.message}`);
        }

        console.log(`🤖 [Attempt ${attempt}/${maxRetries}] Calling Gemini with structured output (${schemaType})`);
        console.log(`📝 Model: ${options.model || this.defaultModel}`);
        console.log(`📄 Response Schema: ${schemaType}`);

        // 更寬鬆的 token 數量設定
        let adjustedMaxTokens = options.maxTokens || this.defaultMaxTokens;
        if (schemaType === 'personalizationQuestions') {
          adjustedMaxTokens = Math.max(adjustedMaxTokens, 1200);
        } else if (schemaType === 'unifiedLearningPlan') {
          adjustedMaxTokens = Math.max(adjustedMaxTokens, 4000);
        }
        
        const requestConfig = {
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userContent}` }]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            maxOutputTokens: adjustedMaxTokens,
            temperature: options.temperature || this.defaultTemperature,
            candidateCount: 1
          }
        };

        // 添加超時控制
        const result = await Promise.race([
          model.generateContent(requestConfig),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout)
          )
        ]);
        
        const response = result.response;
        if (!response) {
          throw new Error('No response received from Gemini API');
        }
        
        const responseText = response.text();
        
        // 檢查空回應
        if (!responseText || responseText.trim().length === 0) {
          throw new Error('Empty response received from Gemini API');
        }
        
        console.log(`📊 Response length: ${responseText.length} characters`);
        console.log(`⏱️ Request took: ${Date.now() - startTime}ms`);

        // 解析和驗證響應
        let parsedResponse;
        try {
          // 清理響應文本
          let cleanedResponse = responseText.trim();
          
          // 移除可能的 markdown 代碼塊
          cleanedResponse = cleanedResponse.replace(/^```(?:json|javascript|js)?\s*/gm, '');
          cleanedResponse = cleanedResponse.replace(/```\s*$/gm, '');
          cleanedResponse = cleanedResponse.replace(/^```/g, '');
          cleanedResponse = cleanedResponse.replace(/```$/g, '');
          cleanedResponse = cleanedResponse.trim();
          
          parsedResponse = JSON.parse(cleanedResponse);
          console.log(`✅ JSON parsing successful`);
        } catch (parseError) {
          console.error(`❌ JSON parsing failed:`, parseError);
          console.log(`🔍 Raw response (first 500 chars):`, responseText.substring(0, 500));
          
          // JSON parsing failed - retry with different configuration
          if (attempt < maxRetries) {
            console.log(`🔄 Retrying API call with modified parameters (attempt ${attempt + 1}/${maxRetries})...`);
            lastError = new Error(`JSON parsing failed: ${parseError.message}`);
            continue;
          } else {
            throw new Error(`JSON parsing failed after ${maxRetries} attempts: ${parseError.message}`);
          }
        }

        // 🚀 Phase 2A: 使用 Schema 工廠驗證器
        let validationResult;
        try {
          validationResult = this.schemaFactory.validateResponse(parsedResponse, schemaType);
        } catch (validationError) {
          // 向後兼容性：回退到傳統驗證
          console.warn(`⚠️ Using legacy validation for ${schemaType}: ${validationError.message}`);
          validationResult = this.validateStructuredResponse(parsedResponse, schemaType);
        }
        
        if (!validationResult.isValid) {
          console.warn(`⚠️ Schema validation failed:`, validationResult.errors);
          
          if (attempt < maxRetries) {
            console.log(`🔄 Retrying with modified prompt (attempt ${attempt + 1}/${maxRetries})...`);
            lastError = new Error(`Schema validation failed: ${validationResult.errors.join(', ')}`);
            continue;
          } else {
            throw new Error(`Schema validation failed after ${maxRetries} attempts: ${validationResult.errors.join(', ')}`);
          }
        }

        console.log(`✅ Structured output validation passed`);
        return parsedResponse;

      } catch (error) {
        console.error(`❌ [Attempt ${attempt}/${maxRetries}] Structured output failed:`, error.message);
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = Math.min(Math.pow(2, attempt) * 1000, 8000);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // 在重試時調整參數
          if (attempt === 2) {
            adjustedMaxTokens = Math.min(adjustedMaxTokens * 1.5, 4000);
            console.log(`🔧 Increasing maxTokens to ${adjustedMaxTokens} for retry`);
          }
        }
      }
    }

    // 如果所有重試都失敗了
    throw lastError || new Error('All structured output attempts failed');
  }

  /**
   * 🚀 Phase 2A: 重構驗證方法，優先使用 Schema 工廠驗證器
   * @deprecated 此方法保留用於向後兼容性，新代碼應使用 schemaFactory.validateResponse()
   * @param {Object} response - AI 響應對象
   * @param {string} schemaType - Schema 類型
   * @returns {Object} - 驗證結果
   */
  validateStructuredResponse(response, schemaType) {
    console.warn('⚠️ DEPRECATED: validateStructuredResponse() is deprecated. Use schemaFactory.validateResponse() for better performance and flexibility.');
    
    try {
      // 嘗試使用新的 Schema 工廠驗證器
      return this.schemaFactory.validateResponse(response, schemaType);
    } catch (error) {
      console.warn(`⚠️ Schema factory validation failed, falling back to legacy validation: ${error.message}`);
      
      // 回退到原始驗證邏輯
      const errors = [];

      if (schemaType === 'personalizationQuestions') {
        // 驗證個人化問題 schema
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

          // 驗證問題類型和選項
          if (question.type === 'choice') {
            if (!question.options || !Array.isArray(question.options) || question.options.length === 0) {
              // 自動修復：如果是 choice 但沒有 options，轉成 text 類型
              question.type = 'text';
              delete question.options;
            }
          }

          // 驗證簡單類型
          if (question.type && !['text', 'choice', 'scale', 'boolean'].includes(question.type)) {
            errors.push(`Question ${index + 1}: invalid type "${question.type}"`);
          }
        });

        return { isValid: errors.length === 0, errors };
      }

      if (schemaType === 'subtasks') {
        // 驗證子任務 schema
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
      } else if (schemaType === 'unifiedLearningPlan') {
        // 驗證統一學習計劃 schema
        if (!response.personalizationQuestions || !Array.isArray(response.personalizationQuestions)) {
          errors.push('Missing personalizationQuestions array');
        }
        if (!response.learningPlan || typeof response.learningPlan !== 'object') {
          errors.push('Missing learningPlan object');
        }
        if (!response.subtasks || !Array.isArray(response.subtasks)) {
          errors.push('Missing subtasks array');
        }

        // 驗證子任務
        if (response.subtasks) {
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
          });
        }
      } else if (schemaType === 'learningPlan') {
        // 驗證學習計劃 schema
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
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    }
  }

  /**
   * Legacy callGemini method for backward compatibility
   * @deprecated Use callGeminiStructured for better reliability
   */
  async callGemini(systemPrompt, userContent, options = {}) {
    console.warn('⚠️ DEPRECATED: callGemini() is deprecated. Use callGeminiStructured() for better reliability.');
    
    // For backward compatibility, try to provide a simple schema if none provided
    if (!options.schema && !options.schemaType) {
      // Try to guess the schema type based on content
      if (systemPrompt.includes('questions') || userContent.includes('questions')) {
        options.schemaType = 'personalizationQuestions';
      } else if (systemPrompt.includes('subtasks') || userContent.includes('subtasks')) {
        options.schemaType = 'subtasks';
      } else if (systemPrompt.includes('learning plan') || userContent.includes('learning plan')) {
        options.schemaType = 'learningPlan';
      } else {
        throw new Error('Schema type must be specified for structured output');
      }
    }
    
    const result = await this.callGeminiStructured(systemPrompt, userContent, options);
    // Return as JSON string for backward compatibility
    return JSON.stringify(result);
  }

  /**
   * Health check for Gemini service
   * @returns {Promise<Object>} - Health status
   */
  async checkHealth() {
    try {
      if (!this.genAI) {
        return {
          status: 'error',
          geminiService: 'misconfigured',
          error: 'Gemini API key not configured or invalid',
          timestamp: new Date().toISOString(),
          note: 'Please check your GEMINI_API_KEY environment variable'
        };
      }

      // 使用簡單的結構化測試
      const testSystemPrompt = 'You are a helpful assistant providing health status information.';
      const testUserPrompt = 'Generate a simple health check response with questions array containing one question about system status.';
      
      const testResponse = await this.callGeminiStructured(
        testSystemPrompt,
        testUserPrompt,
        { schemaType: 'personalizationQuestions', timeout: 10000 }
      );

      // 檢查結構化響應
      if (testResponse && testResponse.questions && Array.isArray(testResponse.questions)) {
        return {
          status: 'healthy',
          geminiService: 'operational',
          model: this.defaultModel,
          timestamp: new Date().toISOString(),
          apiKeyConfigured: true,
          testResponse: `Generated ${testResponse.questions.length} questions successfully`,
          features: {
            structuredOutput: 'enabled',
            schemaValidation: 'working'
          }
        };
      } else {
        return {
          status: 'warning',
          geminiService: 'responding_unexpectedly',
          error: 'Gemini is responding but not in expected structured format',
          timestamp: new Date().toISOString(),
          testResponse: JSON.stringify(testResponse).substring(0, 200) + '...'
        };
      }

    } catch (error) {
      console.error('Gemini health check failed:', error);
      
      // Analyze the error for better reporting
      let errorStatus = 'error';
      let errorType = 'unknown';
      
      if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('Invalid Gemini API key')) {
        errorStatus = 'misconfigured';
        errorType = 'invalid_api_key';
      } else if (error.message?.includes('QUOTA_EXCEEDED')) {
        errorStatus = 'quota_exceeded';
        errorType = 'usage_limit_reached';
      } else if (error.message?.includes('timeout')) {
        errorStatus = 'timeout';
        errorType = 'service_slow';
      } else if (error.message?.includes('PERMISSION_DENIED')) {
        errorStatus = 'permission_denied';
        errorType = 'insufficient_permissions';
      }

      return {
        status: errorStatus,
        geminiService: errorType,
        error: error.message || 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        note: 'Please check your Gemini API configuration and account status'
      };
    }
  }

  /**
   * Get available models (for compatibility)
   * @returns {Array} - List of available models
   */
  getAvailableModels() {
    return [
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Latest ultra-fast Gemini Flash model with advanced capabilities',
        maxTokens: 8192,
        recommended: true
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        description: 'High-performance Gemini 2.0 Flash model for production use',
        maxTokens: 8192,
        recommended: false
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Previous generation Gemini Pro model with enhanced capabilities',
        maxTokens: 8192,
        recommended: false
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'Previous generation Gemini Flash model',
        maxTokens: 8192,
        recommended: false
      }
    ];
  }

  /**
   * Get current configuration
   * @returns {Object} - Current service configuration
   */
  getConfiguration() {
    return {
      model: this.defaultModel,
      maxTokens: this.defaultMaxTokens,
      temperature: this.defaultTemperature,
      timeout: this.requestTimeout,
      apiKeyConfigured: Boolean(this.apiKey && this.apiKey !== 'your_gemini_api_key_here'),
      availableModels: this.getAvailableModels(),
      // 🚀 Phase 2A: Schema 工廠配置
      schemaFactory: {
        enabled: true,
        cacheStats: this.schemaFactory.getCacheStats(),
        availableSchemas: this.schemaFactory.registry.list()
      }
    };
  }

  /**
   * 🚀 Phase 2A: 創建自定義 Schema
   * @param {string} schemaType - Schema 類型
   * @param {Object} options - Schema 選項
   * @returns {Object} - 生成的 Schema
   */
  createCustomSchema(schemaType, options = {}) {
    return this.schemaFactory.createSchema(schemaType, options);
  }

  /**
   * 🚀 Phase 2A: 註冊新的 Schema 類型
   * @param {string} name - Schema 名稱
   * @param {Object} schema - Schema 定義
   */
  registerSchema(name, schema) {
    this.schemaFactory.registry.register(name, schema);
  }

  /**
   * 🚀 Phase 2A: 組合多個 Schema
   * @param {Array<string>} schemaTypes - Schema 類型列表
   * @param {Object} options - 選項
   * @returns {Object} - 組合的 Schema
   */
  combineSchemas(schemaTypes, options = {}) {
    return this.schemaFactory.combineSchemas(schemaTypes, options);
  }

  /**
   * 🚀 Phase 2A: 清除 Schema 快取
   */
  clearSchemaCache() {
    this.schemaFactory.clearCache();
  }

  /**
   * 估算文本的 token 數量
   * 這是一個簡化的估算方法，實際 token 數量可能有所不同
   * @param {string} text - 要估算的文本
   * @returns {number} - 估算的 token 數量
   */
  estimateTokens(text) {
    if (!text || typeof text !== 'string') {
      return 0;
    }

    // 基本的 token 估算邏輯
    // 對於中文：大約 1.5-2 個字符 = 1 token
    // 對於英文：大約 4 個字符 = 1 token
    
    const chineseCharRegex = /[\u4e00-\u9fff]/g;
    const chineseChars = (text.match(chineseCharRegex) || []).length;
    const otherChars = text.length - chineseChars;
    
    // 中文字符按 1.5 字符/token 計算，其他字符按 4 字符/token 計算
    const estimatedTokens = Math.ceil(chineseChars / 1.5) + Math.ceil(otherChars / 4);
    
    return Math.max(1, estimatedTokens); // 至少 1 個 token
  }
}

// Export class only
module.exports = GeminiService;