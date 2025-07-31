// /lib/services/geminiService.js

const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// 統一日誌管理
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4
};

class SimpleLogger {
  constructor() {
    const envLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'ERROR' : 'DEBUG');
    this.currentLevel = this.parseLogLevel(envLevel);
  }

  parseLogLevel(level) {
    switch (level.toUpperCase()) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': case 'WARNING': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'SILENT': case 'NONE': return LogLevel.SILENT;
      default: return LogLevel.INFO;
    }
  }

  shouldLog(level) {
    return level >= this.currentLevel;
  }

  debug(message, data) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`[DEBUG] [GeminiService] ${message}`, data || '');
    }
  }

  info(message, data) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(`[INFO] [GeminiService] ${message}`, data || '');
    }
  }

  warn(message, data) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[WARN] [GeminiService] ${message}`, data || '');
    }
  }

  error(message, error) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[ERROR] [GeminiService] ${message}`, error || '');
    }
  }
}

const logger = new SimpleLogger();

// 🆕 定義結構化輸出的 Schema
const RESPONSE_SCHEMAS = {
  // 個人化問題生成的 Schema
  personalizationQuestions: {
    type: SchemaType.OBJECT,
    properties: {
      questions: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING },
            question: { type: SchemaType.STRING },
            type: { 
              type: SchemaType.STRING,
              enum: ["text", "choice"]
            },
            options: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              nullable: true
            },
            required: { type: SchemaType.BOOLEAN }
          },
          required: ["id", "question", "type", "required"]
        }
      }
    },
    required: ["questions"]
  },

  // 子任務生成的 Schema
  subtasks: {
    type: SchemaType.OBJECT,
    properties: {
      subtasks: {
        type: SchemaType.ARRAY,
        items: {
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
        }
      }
    },
    required: ["subtasks"]
  },

  // 學習計劃生成的 Schema
  learningPlan: {
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
      estimatedTimeToCompletion: { type: SchemaType.NUMBER },
      subtasks: {
        type: SchemaType.ARRAY,
        items: {
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
        }
      }
    },
    required: ["achievableGoal", "recommendedTools", "checkpoints", "estimatedTimeToCompletion"]
  },

  // 統一學習計劃的 Schema
  unifiedLearningPlan: {
    type: SchemaType.OBJECT,
    properties: {
      personalizationQuestions: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING },
            question: { type: SchemaType.STRING },
            type: { 
              type: SchemaType.STRING,
              enum: ["text", "choice"]
            },
            options: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              nullable: true
            },
            required: { type: SchemaType.BOOLEAN }
          },
          required: ["id", "question", "type", "required"]
        }
      },
      learningPlan: {
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
      },
      subtasks: {
        type: SchemaType.ARRAY,
        items: {
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
        }
      }
    },
    required: ["personalizationQuestions", "learningPlan", "subtasks"]
  },

  // 🆕 增強版學習計劃的 Schema - 包含依賴關係和時間約束
  enhancedLearningPlan: {
    type: SchemaType.OBJECT,
    properties: {
      personalizationQuestions: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING },
            question: { type: SchemaType.STRING },
            type: { 
              type: SchemaType.STRING,
              enum: ["text", "choice"]
            },
            options: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              nullable: true
            },
            required: { type: SchemaType.BOOLEAN }
          },
          required: ["id", "question", "type", "required"]
        }
      },
      learningPlan: {
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
      },
      subtasks: {
        type: SchemaType.ARRAY,
        items: {
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
            },
            dependencies: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              nullable: true
            }
          },
          required: ["id", "title", "text", "aiEstimatedDuration", "difficulty", "order", "completed"]
        }
      }
    },
    required: ["personalizationQuestions", "learningPlan", "subtasks"]
  },

  // 🆕 新增生產力建議 schema
  productivityTips: {
    type: SchemaType.OBJECT,
    properties: {
      tips: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING }
      }
    },
    required: ["tips"]
  },

  // 🆕 新增學習問題 schema
  learningQuestions: {
    type: SchemaType.OBJECT,
    properties: {
      questions: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING }
      }
    },
    required: ["questions"]
  },

  // 🆕 新增輸入品質評估 schema
  inputQuality: {
    type: SchemaType.OBJECT,
    properties: {
      isSufficient: { type: SchemaType.BOOLEAN },
      reasons: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING }
      }
    },
    required: ["isSufficient", "reasons"]
  }
};

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.defaultModel = process.env.DEFAULT_MODEL || 'gemini-2.5-flash';
    this.defaultMaxTokens = parseInt(process.env.GEMINI_MAX_TOKENS || process.env.DEFAULT_MAX_TOKENS) || 6000;
    this.defaultTemperature = parseFloat(process.env.DEFAULT_TEMPERATURE) || 0.1;
    this.requestTimeout = parseInt(process.env.REQUEST_TIMEOUT) || 30000;
    
    if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
      logger.warn('GEMINI_API_KEY not properly configured in .env file');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      logger.info('Gemini API key configured');
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
    const maxRetries = options.maxRetries || 1; // 🔧 進一步減少重試次數，加快處理速度
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.genAI) {
          throw new Error('Gemini API not configured. Please check your GEMINI_API_KEY environment variable.');
        }

        const model = this.genAI.getGenerativeModel({ 
          model: options.model || this.defaultModel 
        });

        // 🆕 取得指定的 schema
        const schemaType = options.schemaType || 'subtasks';
        const responseSchema = RESPONSE_SCHEMAS[schemaType];
        
        if (!responseSchema) {
          throw new Error(`Unknown schema type: ${schemaType}`);
        }

        logger.info(`[Attempt ${attempt}/${maxRetries}] Calling Gemini with structured output (${schemaType})`);
        logger.debug(`Model: ${options.model || this.defaultModel}`);

        // 🔧 簡化：使用穩定的配置，不做複雜的適應性調整
        const requestConfig = {
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nUser Request: ${userContent}` }]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            maxOutputTokens: this.defaultMaxTokens,
            temperature: 0.1, // 保持低溫度確保穩定性
            topP: 0.8,
          }
        };

        const result = await model.generateContent(requestConfig);
        
        logger.debug(`Request took: ${Date.now() - startTime}ms`);

        // 🔧 簡化：直接解析 JSON，只做基本錯誤處理
        const responseText = result.response.text();
        
        logger.debug(`Response length: ${responseText.length} characters`);
        
        // 改善的 JSON 解析，處理截斷問題
        let parsedResponse;
        try {
          // 檢查回應是否被截斷
          if (responseText.length < 50) {
            throw new Error(`Response too short: ${responseText.length} characters`);
          }
          
          // 檢查是否以 JSON 結尾
          const trimmedResponse = responseText.trim();
          if (!trimmedResponse.endsWith('}') && !trimmedResponse.endsWith(']')) {
            logger.warn(`⚠️ Response may be truncated, length: ${responseText.length}`);
            logger.debug(`Response end: ...${responseText.slice(-100)}`);
          }
          
          parsedResponse = JSON.parse(responseText);
        } catch (parseError) {
          logger.warn(`⚠️ JSON parsing failed: ${parseError.message}`);
          logger.debug(`Response length: ${responseText.length}`);
          logger.debug(`Response preview: ${responseText.substring(0, 200)}...`);
          
          if (attempt < maxRetries) {
            lastError = parseError;
            continue; // 重試
          } else {
            throw new Error(`JSON parsing failed after ${maxRetries} attempts: ${parseError.message}`);
          }
        }
        
        // 基本驗證：確保有必要的字段
        if (schemaType === 'subtasks' && (!parsedResponse.subtasks || !Array.isArray(parsedResponse.subtasks))) {
          if (attempt < maxRetries) {
            lastError = new Error('Invalid subtasks format');
            continue;
          } else {
            throw new Error('Response missing required subtasks array');
          }
        }
        
        logger.info(`✅ Structured output validated successfully (${schemaType})`);
        return parsedResponse;

      } catch (error) {
        logger.error(`❌ [Attempt ${attempt}/${maxRetries}] Structured output failed:`, error.message);
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = 500; // 減少延遲時間從 1000ms 到 500ms
          logger.info(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // 如果所有重試都失敗了
    throw lastError || new Error('All structured output attempts failed');
  }

  // 🔧 移除了複雜的適應性配置和提示增強函數

  // 🔧 移除了複雜的截斷檢測、JSON修復和健康檢查函數

  /**
   * 驗證結構化響應是否符合 schema 要求
   * @param {Object} response - AI 響應對象
   * @param {string} schemaType - Schema 類型
   * @returns {Object} - 驗證結果
   */
  validateStructuredResponse(response, schemaType) {
    const errors = [];

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
    } else if (schemaType === 'productivityTips') {
      // 🆕 驗證生產力建議 schema
      if (!response.tips || !Array.isArray(response.tips)) {
        errors.push('Missing or invalid tips array');
        return { isValid: false, errors };
      }

      if (response.tips.length === 0) {
        errors.push('Tips array is empty');
      }

      response.tips.forEach((tip, index) => {
        if (typeof tip !== 'string' || tip.trim().length === 0) {
          errors.push(`Tip ${index + 1}: must be a non-empty string`);
        }
      });
    } else if (schemaType === 'learningQuestions') {
      // 🆕 驗證學習問題 schema
      if (!response.questions || !Array.isArray(response.questions)) {
        errors.push('Missing or invalid questions array');
        return { isValid: false, errors };
      }

      if (response.questions.length === 0) {
        errors.push('Questions array is empty');
      }

      response.questions.forEach((question, index) => {
        if (typeof question !== 'string' || question.trim().length === 0) {
          errors.push(`Question ${index + 1}: must be a non-empty string`);
        }
      });
    } else if (schemaType === 'inputQuality') {
      // 🆕 驗證輸入品質評估 schema
      if (typeof response.isSufficient !== 'boolean') {
        errors.push('Missing or invalid isSufficient boolean');
      }

      if (response.reasons && !Array.isArray(response.reasons)) {
        errors.push('Invalid reasons array');
      }

      if (response.reasons) {
        response.reasons.forEach((reason, index) => {
          if (typeof reason !== 'string' || reason.trim().length === 0) {
            errors.push(`Reason ${index + 1}: must be a non-empty string`);
          }
        });
      }
    } else if (schemaType === 'personalizationQuestions') {
      // 🆕 驗證個人化問題 schema (之前缺少)
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
        if (question.type && !['text', 'choice', 'scale'].includes(question.type)) {
          errors.push(`Question ${index + 1}: invalid type "${question.type}"`);
        }

        // 如果是選擇題，檢查是否有選項
        if (question.type === 'choice' && (!question.options || !Array.isArray(question.options) || question.options.length === 0)) {
          errors.push(`Question ${index + 1}: choice type requires non-empty options array`);
        }
      });
    } else if (schemaType === 'learningPlan') {
      // 🆕 驗證學習計劃 schema (之前缺少)
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

  /**
   * 嘗試修復常見的結構化響應問題
   * @param {Object} response - 原始響應
   * @param {string} schemaType - Schema 類型
   * @returns {Object|null} - 修復後的響應，如果無法修復則返回 null
   */
  repairStructuredResponse(response, schemaType) {
    try {
      const repairedResponse = JSON.parse(JSON.stringify(response)); // 深拷貝

      if (schemaType === 'subtasks' || schemaType === 'unifiedLearningPlan') {
        const subtasks = schemaType === 'subtasks' ? repairedResponse.subtasks : repairedResponse.subtasks;
        
        if (subtasks && Array.isArray(subtasks)) {
          subtasks.forEach((subtask, index) => {
            // 修復缺失的必需欄位
            if (!subtask.id) {
              subtask.id = `repaired_subtask_${index + 1}_${Date.now()}`;
            }
            if (!subtask.title) {
              subtask.title = `Task ${index + 1}`;
            }
            if (!subtask.text) {
              subtask.text = subtask.description || subtask.title || `Task ${index + 1} description`;
            }
            if (typeof subtask.aiEstimatedDuration !== 'number') {
              subtask.aiEstimatedDuration = subtask.duration || 60;
            }
            if (!subtask.difficulty) {
              subtask.difficulty = 'medium';
            }
            if (typeof subtask.order !== 'number') {
              subtask.order = index + 1;
            }
            if (typeof subtask.completed !== 'boolean') {
              subtask.completed = false;
            }
            if (!Array.isArray(subtask.skills)) {
              subtask.skills = subtask.tags || [];
            }
            if (!Array.isArray(subtask.recommendedResources)) {
              subtask.recommendedResources = [];
            }
            if (!subtask.phase) {
              // 根據順序分配階段
              const phases = ['knowledge', 'practice', 'application', 'reflection', 'output', 'review'];
              subtask.phase = phases[index % phases.length];
            }

            // 修復無效的枚舉值
            if (!['easy', 'medium', 'hard'].includes(subtask.difficulty)) {
              subtask.difficulty = 'medium';
            }
            if (subtask.phase && !['knowledge', 'practice', 'application', 'reflection', 'output', 'review'].includes(subtask.phase)) {
              subtask.phase = 'practice';
            }
          });
        }
      }

      return repairedResponse;
    } catch (error) {
      console.error('Failed to repair response:', error);
      return null;
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
        options.schemaType = 'subtasks'; // Default fallback
      }
    }
    
    try {
      const result = await this.callGeminiStructured(systemPrompt, userContent, options);
      // Return as JSON string for backward compatibility
      return JSON.stringify(result);
    } catch (error) {
      console.error('❌ Structured call failed in legacy mode:', error);
      throw error;
    }
  }

  /**
   * Parse AI response with enhanced error handling and auto-repair for truncated responses
   * @param {string} response - Raw AI response
   * @returns {Object} - Parsed response object
   */
  parseAIResponse(response) {
    try {
      // Clean the response more carefully
      let cleanedResponse = response.trim();
      
      // Remove markdown code blocks
      cleanedResponse = cleanedResponse.replace(/^```(?:json|javascript|js)?\s*/gm, '');
      cleanedResponse = cleanedResponse.replace(/```\s*$/gm, '');
      cleanedResponse = cleanedResponse.replace(/^```/g, '');
      cleanedResponse = cleanedResponse.replace(/```$/g, '');
      
      // Remove any leading/trailing whitespace
      cleanedResponse = cleanedResponse.trim();
      
      // Find the first { and try to find the complete JSON
      const firstBrace = cleanedResponse.indexOf('{');
      if (firstBrace === -1) {
        throw new Error('No JSON object found in response');
      }
      
      // Extract everything from the first brace
      let jsonCandidate = cleanedResponse.substring(firstBrace);
      
      // Try to find the balanced JSON by counting braces
      let braceCount = 0;
      let jsonEnd = -1;
      
      for (let i = 0; i < jsonCandidate.length; i++) {
        const char = jsonCandidate[i];
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            jsonEnd = i;
            break;
          }
        }
      }
      
      if (jsonEnd !== -1) {
        // We found a complete JSON object
        const completeJson = jsonCandidate.substring(0, jsonEnd + 1);
        return JSON.parse(completeJson);
      } else {
        // JSON is incomplete, but let's try to parse what we have
        // This might fail, but we'll catch it below
        return JSON.parse(jsonCandidate);
      }
      
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      console.error('Raw response length:', response.length);
      console.error('Raw response preview (first 500 chars):', response.substring(0, 500));
      console.error('Raw response preview (last 500 chars):', response.substring(Math.max(0, response.length - 500)));
      
      // 🆕 Enhanced auto-repair system for truncated JSON responses
      try {
        // Try to extract and repair the JSON
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let extractedJson = jsonMatch[0];
          
          // If the JSON appears incomplete, try to close it intelligently
          const openBraces = (extractedJson.match(/\{/g) || []).length;
          const closeBraces = (extractedJson.match(/\}/g) || []).length;
          
          if (openBraces > closeBraces) {
            console.log('🔧 Attempting to repair truncated JSON...');
            
            // Handle incomplete string values
            if (extractedJson.match(/:\s*"[^"]*$/)) {
              // If it ends with an incomplete string value, close it
              extractedJson += '"';
            } else if (extractedJson.match(/,\s*"[^"]*$/)) {
              // If it ends with an incomplete property name, close it
              extractedJson += '": ""';
            } else if (extractedJson.match(/,\s*$/)) {
              // If it ends with a comma, remove the trailing comma
              extractedJson = extractedJson.replace(/,\s*$/, '');
            } else if (extractedJson.match(/:\s*\[.*[^}\]]\s*$/)) {
              // If it ends with an incomplete array, close the array
              extractedJson += ']';
            }
            
            // Add missing closing braces
            const missingBraces = openBraces - closeBraces;
            for (let i = 0; i < missingBraces; i++) {
              extractedJson += '}';
            }
            
            console.log('🔧 Repaired JSON length:', extractedJson.length);
            const repairedResult = JSON.parse(extractedJson);
            console.log('✅ Successfully repaired truncated JSON!');
            
            // Add a flag to indicate this was repaired
            repairedResult._repaired = true;
            repairedResult._originalLength = response.length;
            
            return repairedResult;
          }
        }
      } catch (repairError) {
        console.error('❌ JSON repair attempt failed:', repairError);
      }
      
      // 🆕 Try partial extraction for specific patterns
      try {
        console.log('🔧 Attempting partial extraction...');
        
        // Look for questions array specifically
        const questionsMatch = response.match(/"questions"\s*:\s*\[([\s\S]*?)\]/);
        if (questionsMatch) {
          const questionsContent = questionsMatch[1];
          
          // Try to parse individual questions
          const questions = [];
          const questionMatches = questionsContent.match(/\{[^}]*\}/g) || [];
          
          questionMatches.forEach(qMatch => {
            try {
              const question = JSON.parse(qMatch);
              questions.push(question);
            } catch (qError) {
              // Skip malformed individual questions
            }
          });
          
          if (questions.length > 0) {
            console.log(`✅ Extracted ${questions.length} questions via partial parsing`);
            return { questions, _extracted: true };
          }
        }
        
        // Look for subtasks array specifically
        const subtasksMatch = response.match(/"subtasks"\s*:\s*\[([\s\S]*?)\]/);
        if (subtasksMatch) {
          const subtasksContent = subtasksMatch[1];
          
          // Try to parse individual subtasks
          const subtasks = [];
          const subtaskMatches = subtasksContent.match(/\{[^}]*\}/g) || [];
          
          subtaskMatches.forEach(sMatch => {
            try {
              const subtask = JSON.parse(sMatch);
              subtasks.push(subtask);
            } catch (sError) {
              // Skip malformed individual subtasks
            }
          });
          
          if (subtasks.length > 0) {
            console.log(`✅ Extracted ${subtasks.length} subtasks via partial parsing`);
            return { subtasks, _extracted: true };
          }
        }
        
      } catch (extractError) {
        console.error('❌ Partial extraction failed:', extractError);
      }
      
      // Final fallback: return a structured error response with debugging info
      console.warn('⚠️ Returning fallback response due to parsing failure');
      return {
        error: 'Failed to parse AI response',
        errorType: 'JSON_PARSE_ERROR',
        originalError: error.message,
        rawResponsePreview: response.substring(0, 200),
        rawResponseLength: response.length,
        success: false,
        troubleshooting: {
          suggestion: 'The AI response may be truncated or malformed. Try regenerating.',
          possibleCauses: [
            'Response was cut off due to token limits',
            'Network interruption during response',
            'Malformed JSON from AI model',
            'Special characters causing encoding issues'
          ]
        }
      };
    }
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

      // 🆕 使用簡單的結構化測試
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
      availableModels: this.getAvailableModels()
    };
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

/**
 * 🆕 增強的本地後備系統
 * 當 API 不可用時提供更智能的本地處理
 */
class EnhancedFallbackService {
  constructor() {
    this.templates = this.initializeTemplates();
    this.knowledgeBase = this.initializeKnowledgeBase();
    this.stats = {
      fallbackUsage: 0,
      successRate: 0,
      templateMatches: 0,
      knowledgeBaseHits: 0
    };
  }

  /**
   * 初始化響應模板
   */
  initializeTemplates() {
    return {
      'learning-plan': {
        zh: {
          achievableGoal: "基於輸入內容制定的學習目標",
          recommendedTools: ["線上課程", "實踐練習", "專業書籍", "社群討論"],
          checkpoints: ["建立基礎概念", "實踐基本技能", "進階應用", "專精掌握"],
          estimatedTimeToCompletion: 180
        },
        en: {
          achievableGoal: "Learning goal based on input content",
          recommendedTools: ["Online courses", "Hands-on practice", "Professional books", "Community discussion"],
          checkpoints: ["Build foundation", "Practice basics", "Advanced application", "Master expertise"],
          estimatedTimeToCompletion: 180
        }
      },
      'subtasks-generation': {
        zh: {
          baseSubtasks: [
            { title: "學習基礎概念", difficulty: "easy", duration: 30 },
            { title: "理解核心原理", difficulty: "medium", duration: 45 },
            { title: "實踐基本操作", difficulty: "medium", duration: 60 },
            { title: "深入學習進階內容", difficulty: "hard", duration: 90 },
            { title: "完成實際項目", difficulty: "hard", duration: 120 }
          ]
        },
        en: {
          baseSubtasks: [
            { title: "Learn basic concepts", difficulty: "easy", duration: 30 },
            { title: "Understand core principles", difficulty: "medium", duration: 45 },
            { title: "Practice basic operations", difficulty: "medium", duration: 60 },
            { title: "Study advanced content", difficulty: "hard", duration: 90 },
            { title: "Complete practical project", difficulty: "hard", duration: 120 }
          ]
        }
      },
      'productivity-tips': {
        zh: [
          "設定明確的學習目標和時間表",
          "使用番茄工作法，每25分鐘專注學習後休息5分鐘",
          "創建無干擾的學習環境",
          "定期複習已學內容，加強記憶",
          "與他人分享學習心得，加深理解"
        ],
        en: [
          "Set clear learning goals and schedules",
          "Use Pomodoro Technique: 25 minutes focused learning + 5 minutes break",
          "Create a distraction-free learning environment",
          "Review learned content regularly to strengthen memory",
          "Share learning insights with others to deepen understanding"
        ]
      },
      'learning-questions': {
        zh: [
          "您認為這個學習內容的關鍵要點是什麼？",
          "如何將所學知識應用到實際情況中？",
          "學習過程中遇到的最大挑戰是什麼？",
          "有哪些方面需要進一步加強練習？",
          "您對這個主題還有什麼疑問？"
        ],
        en: [
          "What do you think are the key points of this learning content?",
          "How can you apply the learned knowledge to real situations?",
          "What was the biggest challenge during the learning process?",
          "Which aspects need further practice and reinforcement?",
          "What other questions do you have about this topic?"
        ]
      },
      'personalization-questions': {
        zh: [
          { question: "您目前的學習經驗程度如何？", type: "choice", options: ["初學者", "有基礎", "中等水平", "進階"] },
          { question: "您希望達到什麼程度？", type: "choice", options: ["基本了解", "實際應用", "熟練掌握", "專家水平"] },
          { question: "您每天可以投入多少時間學習？", type: "choice", options: ["30分鐘以下", "30-60分鐘", "1-2小時", "2小時以上"] },
          { question: "您偏好的學習方式是？", type: "choice", options: ["理論學習", "實踐操作", "項目導向", "混合方式"] }
        ],
        en: [
          { question: "What's your current experience level?", type: "choice", options: ["Beginner", "Basic knowledge", "Intermediate", "Advanced"] },
          { question: "What level do you want to achieve?", type: "choice", options: ["Basic understanding", "Practical application", "Proficient mastery", "Expert level"] },
          { question: "How much time can you dedicate daily?", type: "choice", options: ["Under 30 min", "30-60 min", "1-2 hours", "Over 2 hours"] },
          { question: "What's your preferred learning style?", type: "choice", options: ["Theoretical study", "Hands-on practice", "Project-based", "Mixed approach"] }
        ]
      }
    };
  }

  /**
   * 初始化知識庫
   */
  initializeKnowledgeBase() {
    return {
      skillCategories: {
        'programming': {
          zh: ['程式設計', '編程', '開發', '軟體', '程式', 'coding'],
          en: ['programming', 'coding', 'development', 'software', 'computer']
        },
        'language': {
          zh: ['語言', '英語', '中文', '日語', '外語', '口語'],
          en: ['language', 'english', 'chinese', 'japanese', 'speaking', 'grammar']
        },
        'business': {
          zh: ['商業', '管理', '行銷', '財務', '企業', '創業'],
          en: ['business', 'management', 'marketing', 'finance', 'entrepreneurship']
        },
        'design': {
          zh: ['設計', '美術', '視覺', 'UI', 'UX', '創意'],
          en: ['design', 'art', 'visual', 'ui', 'ux', 'creative', 'graphics']
        },
        'technology': {
          zh: ['科技', '技術', '人工智慧', 'AI', '機器學習', '數據'],
          en: ['technology', 'ai', 'artificial intelligence', 'machine learning', 'data']
        }
      },
      difficultyKeywords: {
        easy: {
          zh: ['基礎', '入門', '簡單', '初學', '基本'],
          en: ['basic', 'beginner', 'simple', 'introduction', 'fundamental']
        },
        medium: {
          zh: ['中等', '進階', '深入', '提升', '改進'],
          en: ['intermediate', 'advanced', 'improve', 'enhance', 'develop']
        },
        hard: {
          zh: ['高級', '專業', '精通', '大師', '專家'],
          en: ['expert', 'professional', 'master', 'advanced', 'specialized']
        }
      }
    };
  }

  /**
   * 智能後備響應生成
   */
  async generateFallbackResponse(requestType, content, options = {}) {
    this.stats.fallbackUsage++;
    
    try {
      const language = options.language || 'zh';
      let response;

      switch (requestType) {
        case 'learning-plan':
          response = this.generateLearningPlanFallback(content, language);
          break;
        case 'subtasks-generation':
          response = this.generateSubtasksFallback(content, language);
          break;
        case 'productivity-tips':
          response = this.generateProductivityTipsFallback(content, language);
          break;
        case 'learning-questions':
          response = this.generateLearningQuestionsFallback(content, language);
          break;
        case 'personalization-questions':
          response = this.generatePersonalizationFallback(content, language);
          break;
        default:
          response = this.generateGenericFallback(content, language);
      }

      // 添加後備標識
      response._fallback = true;
      response._fallbackReason = 'API unavailable';
      response._confidence = this.calculateConfidence(content, requestType);
      
      this.stats.successRate = (this.stats.successRate * (this.stats.fallbackUsage - 1) + 1) / this.stats.fallbackUsage;
      
      return response;
    } catch (error) {
      console.error('Fallback generation failed:', error);
      return this.generateMinimalFallback(requestType, options.language || 'zh');
    }
  }

  /**
   * 生成學習計劃後備響應
   */
  generateLearningPlanFallback(content, language) {
    const template = this.templates['learning-plan'][language];
    const category = this.detectSkillCategory(content, language);
    const difficulty = this.detectDifficulty(content, language);
    
    // 根據類別和難度調整模板
    const adjustedTemplate = this.adjustTemplateByCategory(template, category, difficulty, language);
    
    return {
      achievableGoal: this.generateContextualGoal(content, language),
      recommendedTools: adjustedTemplate.recommendedTools,
      checkpoints: adjustedTemplate.checkpoints,
      estimatedTimeToCompletion: this.estimateTimeByDifficulty(difficulty)
    };
  }

  /**
   * 生成子任務後備響應
   */
  generateSubtasksFallback(content, language) {
    const template = this.templates['subtasks-generation'][language];
    const category = this.detectSkillCategory(content, language);
    const difficulty = this.detectDifficulty(content, language);
    
    const subtasks = template.baseSubtasks.map((subtask, index) => ({
      id: `fallback-${Date.now()}-${index}`,
      title: this.contextualizeSubtaskTitle(subtask.title, content, language),
      text: this.generateSubtaskDescription(subtask.title, content, language),
      aiEstimatedDuration: this.adjustDurationByDifficulty(subtask.duration, difficulty),
      difficulty: this.adjustSubtaskDifficulty(subtask.difficulty, difficulty),
      phase: this.getPhaseForIndex(index),
      tags: this.generateTagsForCategory(category, language)
    }));
    
    return subtasks;
  }

  /**
   * 生成生產力建議後備響應
   */
  generateProductivityTipsFallback(stats, language) {
    const baseTips = this.templates['productivity-tips'][language];
    
    // 根據統計數據個性化建議
    const personalizedTips = baseTips.slice();
    
    if (stats.focusTime && stats.focusTime < 30) {
      const tip = language === 'zh' 
        ? "建議逐步延長專注時間，從15分鐘開始慢慢增加"
        : "Gradually extend focus time, starting from 15 minutes and slowly increasing";
      personalizedTips.unshift(tip);
    }
    
    if (stats.distractions && stats.distractions > 5) {
      const tip = language === 'zh' 
        ? "考慮關閉通知和社交媒體，創造更專注的環境"
        : "Consider turning off notifications and social media for a more focused environment";
      personalizedTips.push(tip);
    }
    
    return personalizedTips.slice(0, 5); // 返回最多5個建議
  }

  /**
   * 生成學習問題後備響應
   */
  generateLearningQuestionsFallback(content, language) {
    const baseQuestions = this.templates['learning-questions'][language];
    const category = this.detectSkillCategory(content, language);
    
    // 根據類別調整問題
    const contextualQuestions = baseQuestions.map(question => 
      this.contextualizeQuestion(question, content, category, language)
    );
    
    return contextualQuestions;
  }

  /**
   * 生成個人化問題後備響應
   */
  generatePersonalizationFallback(content, language) {
    const baseQuestions = this.templates['personalization-questions'][language];
    const category = this.detectSkillCategory(content, language);
    
    // 為每個問題生成唯一ID
    const questions = baseQuestions.map((q, index) => ({
      id: `fallback-q-${Date.now()}-${index}`,
      question: q.question,
      type: q.type,
      options: q.options,
      required: index < 2 // 前兩個問題設為必須
    }));
    
    // 根據類別添加特定問題
    if (category) {
      questions.push(this.generateCategorySpecificQuestion(category, language));
    }
    
    return questions;
  }

  /**
   * 檢測技能類別
   */
  detectSkillCategory(content, language) {
    const text = content.toLowerCase();
    
    for (const [category, keywords] of Object.entries(this.knowledgeBase.skillCategories)) {
      const categoryKeywords = keywords[language] || keywords.en;
      if (categoryKeywords.some(keyword => text.includes(keyword))) {
        this.stats.knowledgeBaseHits++;
        return category;
      }
    }
    
    return null;
  }

  /**
   * 檢測難度等級
   */
  detectDifficulty(content, language) {
    const text = content.toLowerCase();
    
    for (const [difficulty, keywords] of Object.entries(this.knowledgeBase.difficultyKeywords)) {
      const difficultyKeywords = keywords[language] || keywords.en;
      if (difficultyKeywords.some(keyword => text.includes(keyword))) {
        return difficulty;
      }
    }
    
    return 'medium'; // 預設中等難度
  }

  /**
   * 計算後備響應的可信度
   */
  calculateConfidence(content, requestType) {
    let confidence = 0.5; // 基準可信度
    
    // 根據內容長度調整
    if (content.length > 100) confidence += 0.1;
    if (content.length > 300) confidence += 0.1;
    
    // 根據關鍵詞匹配調整
    const category = this.detectSkillCategory(content, 'zh');
    if (category) confidence += 0.2;
    
    // 根據請求類型調整
    if (['productivity-tips', 'personalization-questions'].includes(requestType)) {
      confidence += 0.1; // 這些類型的後備響應通常更可靠
    }
    
    return Math.min(1, confidence);
  }

  /**
   * 輔助方法實現
   */
  generateContextualGoal(content, language) {
    const title = content.split('\n')[0] || content.substring(0, 50);
    
    if (language === 'zh') {
      return `透過系統化學習，掌握「${title}」的核心知識和實用技能`;
    } else {
      return `Master core knowledge and practical skills of "${title}" through systematic learning`;
    }
  }

  adjustTemplateByCategory(template, category, difficulty, language) {
    const adjusted = { ...template };
    
    // 根據類別調整工具和檢查點
    if (category === 'programming') {
      if (language === 'zh') {
        adjusted.recommendedTools = ["線上編程平台", "IDE/編輯器", "技術文檔", "開源項目", "程式設計社群"];
        adjusted.checkpoints = ["環境搭建", "語法基礎", "實作小項目", "進階特性", "完整應用開發"];
      }
    } else if (category === 'language') {
      if (language === 'zh') {
        adjusted.recommendedTools = ["語言學習App", "語法書籍", "聽力練習", "口語對話", "文化資源"];
        adjusted.checkpoints = ["基礎詞彙", "語法規則", "聽說練習", "閱讀理解", "流利對話"];
      }
    }
    
    return adjusted;
  }

  estimateTimeByDifficulty(difficulty) {
    const baseTime = 180; // 3小時基準
    const multipliers = { easy: 0.7, medium: 1.0, hard: 1.5 };
    return Math.round(baseTime * (multipliers[difficulty] || 1.0));
  }

  contextualizeSubtaskTitle(title, content, language) {
    // 簡單的上下文化，實際實現可以更複雜
    const topic = content.split('\n')[0] || content.substring(0, 30);
    return title.replace(/學習|Learn/, language === 'zh' ? `學習${topic}的` : `Learn ${topic}`);
  }

  generateSubtaskDescription(title, content, language) {
    if (language === 'zh') {
      return `詳細學習和理解${title}，通過理論學習和實踐練習掌握相關知識和技能。`;
    } else {
      return `Study and understand ${title} in detail through theoretical learning and practical exercises.`;
    }
  }

  adjustDurationByDifficulty(baseDuration, difficulty) {
    const multipliers = { easy: 0.8, medium: 1.0, hard: 1.3 };
    return Math.round(baseDuration * (multipliers[difficulty] || 1.0));
  }

  adjustSubtaskDifficulty(baseDifficulty, overallDifficulty) {
    // 根據整體難度調整子任務難度
    if (overallDifficulty === 'easy' && baseDifficulty === 'hard') return 'medium';
    if (overallDifficulty === 'hard' && baseDifficulty === 'easy') return 'medium';
    return baseDifficulty;
  }

  getPhaseForIndex(index) {
    const phases = ['knowledge', 'practice', 'application', 'mastery', 'creation'];
    return phases[index] || 'practice';
  }

  generateTagsForCategory(category, language) {
    const categoryTags = {
      programming: language === 'zh' ? ['程式設計', '開發', '技術'] : ['programming', 'development', 'technical'],
      language: language === 'zh' ? ['語言學習', '溝通', '文化'] : ['language learning', 'communication', 'culture'],
      business: language === 'zh' ? ['商業技能', '管理', '策略'] : ['business skills', 'management', 'strategy'],
      design: language === 'zh' ? ['設計思維', '創意', '視覺'] : ['design thinking', 'creative', 'visual'],
      technology: language === 'zh' ? ['科技', '創新', '數位'] : ['technology', 'innovation', 'digital']
    };
    
    return categoryTags[category] || (language === 'zh' ? ['學習', '技能'] : ['learning', 'skills']);
  }

  contextualizeQuestion(question, content, category, language) {
    // 簡單的問題上下文化
    const topic = content.split('\n')[0] || content.substring(0, 20);
    return question.replace(/這個學習內容|this learning content/, language === 'zh' ? `「${topic}」` : `"${topic}"`);
  }

  generateCategorySpecificQuestion(category, language) {
    const specificQuestions = {
      programming: {
        zh: { question: "您希望專注於哪種程式語言或技術棧？", type: "text", required: false },
        en: { question: "Which programming language or tech stack would you like to focus on?", type: "text", required: false }
      },
      language: {
        zh: { question: "您的語言學習目標是什麼（如考試、工作、旅遊）？", type: "text", required: false },
        en: { question: "What's your language learning goal (exam, work, travel)?", type: "text", required: false }
      }
    };
    
    const categoryQuestion = specificQuestions[category];
    if (categoryQuestion && categoryQuestion[language]) {
      return {
        id: `category-specific-${Date.now()}`,
        ...categoryQuestion[language]
      };
    }
    
    return null;
  }

  generateMinimalFallback(requestType, language) {
    const minimal = {
      'learning-plan': {
        zh: { achievableGoal: "制定學習計劃", recommendedTools: ["學習資源"], checkpoints: ["開始學習"], estimatedTimeToCompletion: 60 },
        en: { achievableGoal: "Create learning plan", recommendedTools: ["Learning resources"], checkpoints: ["Start learning"], estimatedTimeToCompletion: 60 }
      },
      'subtasks-generation': {
        zh: [{ id: 'minimal-1', title: "開始學習", text: "開始您的學習旅程", aiEstimatedDuration: 30, difficulty: 'easy' }],
        en: [{ id: 'minimal-1', title: "Start learning", text: "Begin your learning journey", aiEstimatedDuration: 30, difficulty: 'easy' }]
      }
    };
    
    return minimal[requestType]?.[language] || { _error: 'Minimal fallback failed' };
  }

  getStats() {
    return {
      ...this.stats,
      effectivenessRate: this.stats.successRate,
      knowledgeBaseEfficiency: this.stats.knowledgeBaseHits / Math.max(1, this.stats.fallbackUsage)
    };
  }

  reset() {
    this.stats = {
      fallbackUsage: 0,
      successRate: 0,
      templateMatches: 0,
      knowledgeBaseHits: 0
    };
  }
}

// Export classes and singleton instances
const geminiService = new GeminiService();
const enhancedFallbackService = new EnhancedFallbackService();

module.exports = GeminiService; 