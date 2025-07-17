/**
 * 壓縮和優化服務 - 智能內容處理系統
 * 實現請求/響應壓縮、Token 優化、內容精簡和智能摘要
 */

const zlib = require('zlib');
const { promisify } = require('util');

class CompressionService {
  constructor() {
    this.gzip = promisify(zlib.gzip);
    this.gunzip = promisify(zlib.gunzip);
    this.deflate = promisify(zlib.deflate);
    this.inflate = promisify(zlib.inflate);
    
    // 優化策略配置
    this.optimizationStrategies = {
      'learning-plan': {
        maxInputLength: 2000,    // 最大輸入長度
        summaryRatio: 0.7,       // 摘要比例
        keywordsLimit: 50,       // 關鍵詞限制
        enableCompression: true,  // 啟用壓縮
        templateOptimization: true // 啟用模板優化
      },
      
      'subtasks-generation': {
        maxInputLength: 1500,
        summaryRatio: 0.8,
        keywordsLimit: 40,
        enableCompression: true,
        templateOptimization: true
      },
      
      'productivity-tips': {
        maxInputLength: 800,     // 統計數據相對簡單
        summaryRatio: 0.9,       // 保留更多細節
        keywordsLimit: 20,
        enableCompression: false, // 統計數據已經很簡潔
        templateOptimization: true
      },
      
      'learning-questions': {
        maxInputLength: 1200,
        summaryRatio: 0.6,       // 可以大幅精簡
        keywordsLimit: 30,
        enableCompression: true,
        templateOptimization: true
      },
      
      'personalization-questions': {
        maxInputLength: 1000,
        summaryRatio: 0.8,
        keywordsLimit: 35,
        enableCompression: true,
        templateOptimization: true
      }
    };

    // 壓縮統計
    this.stats = {
      totalCompressions: 0,
      totalDecompressions: 0,
      bytesCompressed: 0,
      bytesDecompressed: 0,
      compressionRatio: 0,
      tokensOptimized: 0,
      estimatedTokensSaved: 0,
      estimatedCostSaved: 0
    };

    console.log('🗜️ Compression Service initialized');
  }

  /**
   * 智能內容優化 - 針對 AI 請求優化
   */
  async optimizeForAI(content, requestType, options = {}) {
    const strategy = this.optimizationStrategies[requestType] || this.optimizationStrategies['learning-plan'];
    
    let optimizedContent = content;
    let optimizationSteps = [];

    try {
      // 1. 內容清理和標準化
      optimizedContent = this.cleanAndNormalize(optimizedContent);
      optimizationSteps.push('content_cleaning');

      // 2. 長度檢查和精簡
      if (this.getContentLength(optimizedContent) > strategy.maxInputLength) {
        optimizedContent = await this.summarizeContent(optimizedContent, strategy.summaryRatio);
        optimizationSteps.push('content_summarization');
      }

      // 3. 關鍵詞提取和優化
      if (strategy.keywordsLimit > 0) {
        optimizedContent = this.optimizeKeywords(optimizedContent, strategy.keywordsLimit);
        optimizationSteps.push('keyword_optimization');
      }

      // 4. 模板優化
      if (strategy.templateOptimization) {
        optimizedContent = this.optimizeTemplates(optimizedContent, requestType);
        optimizationSteps.push('template_optimization');
      }

      // 5. 壓縮（如果需要）
      let compressedContent = optimizedContent;
      if (strategy.enableCompression && this.shouldCompress(optimizedContent)) {
        compressedContent = await this.compressContent(optimizedContent);
        optimizationSteps.push('compression');
      }

      // 統計 Token 節省
      const originalTokens = this.estimateTokens(JSON.stringify(content));
      const optimizedTokens = this.estimateTokens(JSON.stringify(optimizedContent));
      const tokensSaved = Math.max(0, originalTokens - optimizedTokens);

      this.updateOptimizationStats(originalTokens, optimizedTokens, tokensSaved);

      console.log(`🗜️ Content optimized for ${requestType}: ${originalTokens} → ${optimizedTokens} tokens (${tokensSaved} saved)`);

      return {
        original: content,
        optimized: optimizedContent,
        compressed: compressedContent,
        isCompressed: compressedContent !== optimizedContent,
        tokensSaved,
        optimizationSteps,
        compressionRatio: optimizedTokens / originalTokens,
        strategy: requestType
      };

    } catch (error) {
      console.error(`❌ Content optimization failed for ${requestType}:`, error);
      return {
        original: content,
        optimized: content,
        compressed: content,
        isCompressed: false,
        tokensSaved: 0,
        optimizationSteps: ['error'],
        compressionRatio: 1,
        strategy: requestType,
        error: error.message
      };
    }
  }

  /**
   * 內容清理和標準化
   */
  cleanAndNormalize(content) {
    if (typeof content === 'string') {
      return content
        .trim()
        .replace(/\s+/g, ' ')                    // 標準化空格
        .replace(/\n{3,}/g, '\n\n')             // 減少過多換行
        .replace(/[。！？，、；：]{2,}/g, '。')   // 標準化重複標點
        .replace(/[.!?;:,]{2,}/g, '.')          // 標準化英文重複標點
        .replace(/\s*([。！？，、；：.!?;:,])\s*/g, '$1 '); // 標點後加空格
    }

    if (typeof content === 'object') {
      const cleaned = {};
      for (const [key, value] of Object.entries(content)) {
        cleaned[key] = this.cleanAndNormalize(value);
      }
      return cleaned;
    }

    return content;
  }

  /**
   * 智能內容摘要
   */
  async summarizeContent(content, summaryRatio) {
    if (typeof content === 'string') {
      const sentences = content.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
      const targetSentences = Math.ceil(sentences.length * summaryRatio);
      
      // 簡單的句子重要性評分（基於長度和關鍵詞）
      const scoredSentences = sentences.map(sentence => ({
        sentence: sentence.trim(),
        score: this.calculateSentenceImportance(sentence)
      }));

      // 選擇最重要的句子
      const topSentences = scoredSentences
        .sort((a, b) => b.score - a.score)
        .slice(0, targetSentences)
        .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence)) // 保持原順序
        .map(item => item.sentence);

      return topSentences.join('。') + '。';
    }

    if (typeof content === 'object') {
      const summarized = {};
      for (const [key, value] of Object.entries(content)) {
        if (typeof value === 'string') {
          summarized[key] = await this.summarizeContent(value, summaryRatio);
        } else {
          summarized[key] = value;
        }
      }
      return summarized;
    }

    return content;
  }

  /**
   * 計算句子重要性分數
   */
  calculateSentenceImportance(sentence) {
    let score = 0;
    
    // 基本長度分數（適中長度的句子更重要）
    const length = sentence.length;
    if (length > 10 && length < 100) {
      score += Math.min(length / 50, 1) * 10;
    }

    // 關鍵詞分數
    const keywords = [
      '學習', '任務', '目標', '計劃', '方法', '步驟', '重要', '關鍵', '核心', '基礎',
      'learning', 'task', 'goal', 'plan', 'method', 'step', 'important', 'key', 'core', 'basic'
    ];

    keywords.forEach(keyword => {
      if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
        score += 5;
      }
    });

    // 數字和時間相關的句子更重要
    if (/\d+/.test(sentence)) {
      score += 3;
    }

    // 包含動詞的句子更重要
    const actionWords = ['生成', '創建', '學習', '完成', '實施', '執行', 'generate', 'create', 'learn', 'complete', 'implement'];
    actionWords.forEach(word => {
      if (sentence.toLowerCase().includes(word.toLowerCase())) {
        score += 2;
      }
    });

    return score;
  }

  /**
   * 關鍵詞優化
   */
  optimizeKeywords(content, limit) {
    if (typeof content === 'string') {
      // 提取關鍵詞
      const words = content.match(/[\u4e00-\u9fff]+|[a-zA-Z]+/g) || [];
      const wordFreq = {};
      
      words.forEach(word => {
        if (word.length > 1) { // 忽略單字符
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });

      // 選擇最重要的關鍵詞
      const topKeywords = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([word]) => word);

      // 重構內容，優先保留包含關鍵詞的句子
      const sentences = content.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
      const keywordSentences = sentences.filter(sentence => 
        topKeywords.some(keyword => sentence.includes(keyword))
      );

      // 如果關鍵詞句子太少，添加其他重要句子
      if (keywordSentences.length < sentences.length * 0.7) {
        const remainingSentences = sentences.filter(sentence => 
          !keywordSentences.includes(sentence)
        );
        
        keywordSentences.push(...remainingSentences.slice(0, Math.ceil(sentences.length * 0.3)));
      }

      return keywordSentences.join('。') + '。';
    }

    return content;
  }

  /**
   * 模板優化 - 針對不同請求類型的專門優化
   */
  optimizeTemplates(content, requestType) {
    const templates = {
      'learning-plan': this.optimizeLearningPlanTemplate,
      'subtasks-generation': this.optimizeSubtasksTemplate,
      'productivity-tips': this.optimizeProductivityTemplate,
      'learning-questions': this.optimizeQuestionsTemplate,
      'personalization-questions': this.optimizePersonalizationTemplate
    };

    const optimizer = templates[requestType];
    if (optimizer) {
      return optimizer.call(this, content);
    }

    return content;
  }

  /**
   * 學習計劃模板優化
   */
  optimizeLearningPlanTemplate(content) {
    if (typeof content === 'object' && content.title) {
      // 精簡標題和描述
      const optimized = {
        title: this.truncateText(content.title, 100),
        description: content.description ? this.truncateText(content.description, 300) : undefined,
        taskType: content.taskType || 'skill_learning',
        currentProficiency: content.currentProficiency || 'beginner',
        targetProficiency: content.targetProficiency || 'intermediate'
      };

      // 移除未定義的字段
      Object.keys(optimized).forEach(key => {
        if (optimized[key] === undefined) {
          delete optimized[key];
        }
      });

      return optimized;
    }

    return content;
  }

  /**
   * 子任務模板優化
   */
  optimizeSubtasksTemplate(content) {
    if (typeof content === 'object' && content.title) {
      return {
        title: this.truncateText(content.title, 80),
        description: content.description ? this.truncateText(content.description, 200) : undefined,
        taskType: content.taskType || 'skill_learning'
      };
    }

    return content;
  }

  /**
   * 生產力建議模板優化
   */
  optimizeProductivityTemplate(content) {
    if (typeof content === 'object' && content.stats) {
      // 統計數據已經很簡潔，只做基本清理
      return {
        stats: {
          focusTime: Math.round(content.stats.focusTime || 0),
          tasksCompleted: Math.round(content.stats.tasksCompleted || 0),
          averageSessionDuration: Math.round(content.stats.averageSessionDuration || 0),
          distractions: Math.round(content.stats.distractions || 0)
        },
        language: content.language || 'zh'
      };
    }

    return content;
  }

  /**
   * 學習問題模板優化
   */
  optimizeQuestionsTemplate(content) {
    if (typeof content === 'object' && content.summary) {
      return {
        summary: this.truncateText(content.summary, 500),
        language: content.language || 'zh'
      };
    }

    return content;
  }

  /**
   * 個人化問題模板優化
   */
  optimizePersonalizationTemplate(content) {
    if (typeof content === 'object' && content.title) {
      return {
        title: this.truncateText(content.title, 80),
        description: content.description ? this.truncateText(content.description, 200) : undefined,
        language: content.language || 'zh'
      };
    }

    return content;
  }

  /**
   * 文本截斷
   */
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    // 在合適的位置截斷（句號、逗號等）
    const truncated = text.substring(0, maxLength);
    const lastPunctuation = Math.max(
      truncated.lastIndexOf('。'),
      truncated.lastIndexOf('，'),
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf(',')
    );
    
    if (lastPunctuation > maxLength * 0.7) {
      return truncated.substring(0, lastPunctuation + 1);
    }
    
    return truncated + '...';
  }

  /**
   * 內容壓縮
   */
  async compressContent(content) {
    try {
      const contentString = typeof content === 'string' ? content : JSON.stringify(content);
      const buffer = Buffer.from(contentString, 'utf8');
      
      const compressed = await this.gzip(buffer);
      
      this.stats.totalCompressions++;
      this.stats.bytesCompressed += buffer.length;
      
      // 返回 base64 編碼的壓縮數據
      return {
        compressed: true,
        data: compressed.toString('base64'),
        originalSize: buffer.length,
        compressedSize: compressed.length,
        compressionRatio: compressed.length / buffer.length
      };
      
    } catch (error) {
      console.error('❌ Content compression failed:', error);
      return content;
    }
  }

  /**
   * 內容解壓縮
   */
  async decompressContent(compressedData) {
    try {
      if (typeof compressedData === 'object' && compressedData.compressed) {
        const buffer = Buffer.from(compressedData.data, 'base64');
        const decompressed = await this.gunzip(buffer);
        
        this.stats.totalDecompressions++;
        this.stats.bytesDecompressed += decompressed.length;
        
        const content = decompressed.toString('utf8');
        
        // 嘗試解析為 JSON，如果失敗則返回字符串
        try {
          return JSON.parse(content);
        } catch {
          return content;
        }
      }
      
      return compressedData;
      
    } catch (error) {
      console.error('❌ Content decompression failed:', error);
      return compressedData;
    }
  }

  /**
   * 判斷是否應該壓縮
   */
  shouldCompress(content) {
    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    const sizeThreshold = 1000; // 1KB 以上才壓縮
    
    return contentString.length > sizeThreshold;
  }

  /**
   * 估算 Token 數量
   */
  estimateTokens(content) {
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    
    // 粗略估算：英文 1 token ≈ 4 字符，中文 1 token ≈ 1.5 字符
    const chineseChars = (contentStr.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = contentStr.length - chineseChars;
    
    const chineseTokens = chineseChars / 1.5;
    const otherTokens = otherChars / 4;
    
    return Math.ceil(chineseTokens + otherTokens);
  }

  /**
   * 獲取內容長度
   */
  getContentLength(content) {
    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    return contentString.length;
  }

  /**
   * 更新優化統計
   */
  updateOptimizationStats(originalTokens, optimizedTokens, tokensSaved) {
    this.stats.tokensOptimized += originalTokens;
    this.stats.estimatedTokensSaved += tokensSaved;
    
    // 估算成本節省（基於 Gemini 定價）
    const inputCostPerToken = 0.000075;
    const costSaved = tokensSaved * inputCostPerToken;
    this.stats.estimatedCostSaved += costSaved;
    
    // 更新平均壓縮比
    if (this.stats.totalCompressions > 0) {
      this.stats.compressionRatio = this.stats.bytesCompressed > 0
        ? this.stats.bytesDecompressed / this.stats.bytesCompressed
        : 1;
    }
  }

  /**
   * 獲取壓縮統計
   */
  getStats() {
    return {
      ...this.stats,
      averageCompressionRatio: this.stats.compressionRatio.toFixed(3),
      estimatedCostSavedUSD: (this.stats.estimatedCostSaved).toFixed(6),
      optimizationEfficiency: this.stats.tokensOptimized > 0 
        ? ((this.stats.estimatedTokensSaved / this.stats.tokensOptimized) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * 重置統計
   */
  resetStats() {
    this.stats = {
      totalCompressions: 0,
      totalDecompressions: 0,
      bytesCompressed: 0,
      bytesDecompressed: 0,
      compressionRatio: 0,
      tokensOptimized: 0,
      estimatedTokensSaved: 0,
      estimatedCostSaved: 0
    };
    
    console.log('🗜️ Compression statistics reset');
  }
}

// 導出類和單例實例
const compressionService = new CompressionService();

module.exports = {
  // 導出類
  CompressionService,
  
  // 導出實例方法（向後相容）
  optimizeForAI: compressionService.optimizeForAI.bind(compressionService),
  compressContent: compressionService.compressContent.bind(compressionService),
  decompressContent: compressionService.decompressContent.bind(compressionService),
  getStats: compressionService.getStats.bind(compressionService),
  resetStats: compressionService.resetStats.bind(compressionService)
}; 