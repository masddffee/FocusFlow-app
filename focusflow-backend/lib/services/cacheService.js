/**
 * 智能快取服務 - 成本優化系統
 * 實現多層快取機制，大幅減少重複的 AI API 調用
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class IntelligentCacheService {
  constructor() {
    this.memoryCache = new Map(); // 內存快取
    this.cacheDir = path.join(__dirname, '../../cache');
    this.maxMemoryCacheSize = 1000; // 最大內存快取條目數
    this.maxFileSize = 50 * 1024 * 1024; // 50MB 最大文件大小
    this.lastSimilarityScore = 0; // 記錄最後的相似度評分
    this.defaultTTL = 24 * 60 * 60 * 1000; // 24小時預設過期時間
    
    // 快取統計
    this.stats = {
      hits: 0,
      misses: 0,
      saves: 0,
      evictions: 0,
      errors: 0,
      totalRequestsSaved: 0,
      estimatedCostSaved: 0 // 估算節省的成本
    };
    
    // 不同類型請求的快取策略
    this.cacheStrategies = {
      'personalization-questions': {
        ttl: 7 * 24 * 60 * 60 * 1000, // 7天，個人化問題相對穩定
        similarity: 0.85, // 85% 相似度門檻
        maxVariations: 10 // 每個主題最多10個變體
      },
      'subtasks-generation': {
        ttl: 24 * 60 * 60 * 1000, // 24小時，子任務生成可以快取一天
        similarity: 0.80, // 80% 相似度門檻
        maxVariations: 15 // 每個任務類型最多15個變體
      },
      'learning-plan': {
        ttl: 12 * 60 * 60 * 1000, // 12小時，學習計劃更新頻率較高
        similarity: 0.99, // 99% 相似度門檻 - 極嚴格
        maxVariations: 5 
      },
      'enhanced-learning-plan': {
        ttl: 6 * 60 * 60 * 1000, // 6小時，增強版計劃包含時間約束，更新頻率更高
        similarity: 0.98, // 98% 相似度門檻 - 確保時間約束精確匹配
        maxVariations: 3 // 時間約束相關，需要高度精確匹配
      },
      'productivity-tips': {
        ttl: 6 * 60 * 60 * 1000, // 6小時，生產力建議需要較新
        similarity: 0.90, // 90% 相似度門檻，統計數據類似時可重用
        maxVariations: 5 // 統計範圍有限，變體較少
      },
      'commercial-tasks': {
        ttl: 2 * 60 * 60 * 1000, // 2小時，商業任務需要更新頻率
        similarity: 0.99, // 99% 相似度門檻 - 極嚴格
        maxVariations: 3 
      }
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      // 確保快取目錄存在
      await fs.mkdir(this.cacheDir, { recursive: true });
      
      // 加載持久化快取統計
      await this.loadStats();
      
      console.log('🗄️ Intelligent Cache Service initialized');
      console.log(`📊 Cache Stats - Hits: ${this.stats.hits}, Saves: ${this.stats.saves}, Cost Saved: $${(this.stats.estimatedCostSaved / 100).toFixed(2)}`);
    } catch (error) {
      console.error('❌ Cache service initialization failed:', error);
    }
  }

  /**
   * 生成快取鍵 - 基於內容智能哈希
   */
  generateCacheKey(requestType, content, options = {}) {
    // 標準化內容以提高快取命中率
    const normalizedContent = this.normalizeContent(content);
    
    // 創建語意化的快取鍵
    const semanticKey = {
      type: requestType,
      content: normalizedContent,
      language: options.language || 'zh',
      version: this.getCacheVersion(requestType)
    };
    
    // 生成哈希
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(semanticKey))
      .digest('hex');
    
    return `${requestType}_${hash.substring(0, 16)}`;
  }

  /**
   * 內容標準化 - 提高快取命中率
   */
  normalizeContent(content) {
    if (typeof content === 'string') {
      return content.trim().toLowerCase()
        .replace(/\s+/g, ' ') // 標準化空格
        .replace(/[。！？，、；：]/g, '.') // 標準化中文標點
        .replace(/[.!?;:,]+/g, '.'); // 標準化英文標點
    }
    
    if (typeof content === 'object') {
      // 對物件鍵進行排序以確保一致性
      const normalized = {};
      Object.keys(content)
        .sort()
        .forEach(key => {
          normalized[key] = this.normalizeContent(content[key]);
        });
      return normalized;
    }
    
    return content;
  }

  /**
   * 計算內容相似度
   */
  calculateSimilarity(content1, content2) {
    const str1 = JSON.stringify(this.normalizeContent(content1));
    const str2 = JSON.stringify(this.normalizeContent(content2));
    
    // 使用 Levenshtein 距離計算相似度
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLen);
  }

  /**
   * Levenshtein 距離算法
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * 智能快取檢索
   */
  async get(requestType, content, options = {}) {
    const startTime = Date.now();
    
    try {
      const strategy = this.cacheStrategies[requestType] || this.cacheStrategies['learning-plan'];
      const cacheKey = this.generateCacheKey(requestType, content, options);
      
      // 1. 檢查內存快取
      let cached = this.memoryCache.get(cacheKey);
      if (cached && !this.isExpired(cached, strategy.ttl)) {
        this.stats.hits++;
        this.logCacheHit(requestType, 'memory', Date.now() - startTime);
        return cached.data;
      }
      
      // 2. 檢查文件快取
      try {
        const filePath = path.join(this.cacheDir, `${cacheKey}.json`);
        const fileData = await fs.readFile(filePath, 'utf8');
        cached = JSON.parse(fileData);
        
        if (cached && !this.isExpired(cached, strategy.ttl)) {
          // 加載到內存快取
          this.setMemoryCache(cacheKey, cached);
          this.stats.hits++;
          this.logCacheHit(requestType, 'file', Date.now() - startTime);
          return cached.data;
        }
      } catch (fileError) {
        // 文件不存在或讀取失敗，繼續相似性搜索
      }
      
      // 3. 智能相似性搜索 - 使用嚴格的相似度設定
      // 🆕 暫時禁用相似性快取以確保動態子任務生成
      /*
      const similarResult = await this.findSimilarCache(requestType, content, strategy);
      if (similarResult) {
        this.stats.hits++;
        this.logCacheHit(requestType, 'similarity', Date.now() - startTime);
        console.log(`🎯 Cache similarity hit: ${(this.lastSimilarityScore * 100).toFixed(1)}% for ${requestType}`);
        return similarResult;
      }
      */
      
      // 快取未命中
      this.stats.misses++;
      this.logCacheMiss(requestType, Date.now() - startTime);
      return null;
      
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Cache retrieval error for ${requestType}:`, error);
      return null;
    }
  }

  /**
   * 相似性快取搜索
   */
  async findSimilarCache(requestType, content, strategy) {
    try {
      // 搜索內存快取中的相似項目
      for (const [key, cached] of this.memoryCache.entries()) {
        if (key.startsWith(requestType) && !this.isExpired(cached, strategy.ttl)) {
          const similarity = this.calculateSimilarity(content, cached.originalContent);
          if (similarity >= strategy.similarity) {
            this.lastSimilarityScore = similarity; // 記錄相似度評分
            console.log(`🎯 Cache similarity hit: ${(similarity * 100).toFixed(1)}% for ${requestType}`);
            return cached.data;
          }
        }
      }
      
      // 搜索文件快取中的相似項目（限制搜索範圍以避免性能問題）
      const files = await fs.readdir(this.cacheDir);
      const relevantFiles = files
        .filter(file => file.startsWith(requestType) && file.endsWith('.json'))
        .slice(0, strategy.maxVariations); // 限制搜索範圍
      
      for (const file of relevantFiles) {
        try {
          const filePath = path.join(this.cacheDir, file);
          const fileData = await fs.readFile(filePath, 'utf8');
          const cached = JSON.parse(fileData);
          
          if (!this.isExpired(cached, strategy.ttl)) {
            const similarity = this.calculateSimilarity(content, cached.originalContent);
            if (similarity >= strategy.similarity) {
              this.lastSimilarityScore = similarity; // 記錄相似度評分
              console.log(`🎯 File cache similarity hit: ${(similarity * 100).toFixed(1)}% for ${requestType}`);
              
              // 加載到內存快取
              const cacheKey = file.replace('.json', '');
              this.setMemoryCache(cacheKey, cached);
              
              return cached.data;
            }
          }
        } catch (parseError) {
          console.warn(`⚠️ Failed to parse cache file ${file}:`, parseError);
        }
      }
      
      this.lastSimilarityScore = 0; // 沒有找到匹配，重置評分
      return null;
    } catch (error) {
      console.error(`❌ Similarity search error for ${requestType}:`, error);
      this.lastSimilarityScore = 0;
      return null;
    }
  }

  /**
   * 智能快取保存
   */
  async set(requestType, content, data, options = {}) {
    try {
      const strategy = this.cacheStrategies[requestType] || this.cacheStrategies['learning-plan'];
      const cacheKey = this.generateCacheKey(requestType, content, options);
      
      const cacheEntry = {
        data,
        originalContent: content,
        timestamp: Date.now(),
        requestType,
        language: options.language || 'zh',
        metadata: {
          tokenCount: this.estimateTokenCount(content, data),
          requestCost: this.estimateRequestCost(requestType, content, data),
          createdAt: new Date().toISOString()
        }
      };
      
      // 保存到內存快取
      this.setMemoryCache(cacheKey, cacheEntry);
      
      // 保存到文件快取
      await this.saveToFile(cacheKey, cacheEntry);
      
      // 更新統計
      this.stats.saves++;
      this.stats.totalRequestsSaved++;
      this.stats.estimatedCostSaved += cacheEntry.metadata.requestCost;
      
      // 異步保存統計
      this.saveStats();
      
      console.log(`💾 Cached ${requestType} - Estimated cost saved: $${(cacheEntry.metadata.requestCost / 100).toFixed(4)}`);
      
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Cache save error for ${requestType}:`, error);
    }
  }

  /**
   * 設置內存快取
   */
  setMemoryCache(key, value) {
    // 如果內存快取超過限制，移除最舊的條目
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
      this.stats.evictions++;
    }
    
    this.memoryCache.set(key, value);
  }

  /**
   * 保存到文件快取
   */
  async saveToFile(cacheKey, cacheEntry) {
    try {
      const filePath = path.join(this.cacheDir, `${cacheKey}.json`);
      const jsonData = JSON.stringify(cacheEntry, null, 2);
      
      // 檢查文件大小
      if (jsonData.length > this.maxFileSize) {
        console.warn(`⚠️ Cache entry too large, skipping file save: ${cacheKey}`);
        return;
      }
      
      await fs.writeFile(filePath, jsonData, 'utf8');
    } catch (error) {
      console.error(`❌ Failed to save cache file ${cacheKey}:`, error);
    }
  }

  /**
   * 檢查快取是否過期
   */
  isExpired(cached, ttl) {
    return (Date.now() - cached.timestamp) > ttl;
  }

  /**
   * 估算 token 數量
   */
  estimateTokenCount(content, data) {
    const contentStr = JSON.stringify(content);
    const dataStr = JSON.stringify(data);
    
    // 粗略估算：英文 1 token ≈ 4 字符，中文 1 token ≈ 1.5 字符
    const contentTokens = contentStr.length / (contentStr.match(/[\u4e00-\u9fff]/g) ? 1.5 : 4);
    const dataTokens = dataStr.length / (dataStr.match(/[\u4e00-\u9fff]/g) ? 1.5 : 4);
    
    return Math.ceil(contentTokens + dataTokens);
  }

  /**
   * 估算請求成本（以美分為單位）
   */
  estimateRequestCost(requestType, content, data) {
    const tokenCount = this.estimateTokenCount(content, data);
    
    // Gemini 2.5 Flash 定價（每1K tokens）
    const inputCostPer1K = 0.075; // $0.000075 per token
    const outputCostPer1K = 0.30;  // $0.0003 per token
    
    // 估算輸入和輸出 token 比例
    const inputTokens = this.estimateTokenCount(content, {});
    const outputTokens = tokenCount - inputTokens;
    
    const inputCost = (inputTokens / 1000) * inputCostPer1K;
    const outputCost = (outputTokens / 1000) * outputCostPer1K;
    
    // 返回以美分為單位的成本
    return Math.ceil((inputCost + outputCost) * 100);
  }

  /**
   * 獲取快取版本（用於快取失效）
   */
  getCacheVersion(requestType) {
    // 可以根據模型更新或算法改進來增加版本號
    const versions = {
      'personalization-questions': 'v1.0',
      'subtasks-generation': 'v1.2',
      'learning-plan': 'v1.1',
      'productivity-tips': 'v1.0',
      'commercial-tasks': 'v1.0'
    };
    
    return versions[requestType] || 'v1.0';
  }

  /**
   * 清理過期快取
   */
  async cleanup() {
    console.log('🧹 Starting cache cleanup...');
    
    try {
      let cleanedCount = 0;
      
      // 清理內存快取
      for (const [key, cached] of this.memoryCache.entries()) {
        const requestType = key.split('_')[0];
        const strategy = this.cacheStrategies[requestType] || this.cacheStrategies['learning-plan'];
        
        if (this.isExpired(cached, strategy.ttl)) {
          this.memoryCache.delete(key);
          cleanedCount++;
        }
      }
      
      // 清理文件快取
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.cacheDir, file);
            const fileData = await fs.readFile(filePath, 'utf8');
            const cached = JSON.parse(fileData);
            
            const requestType = cached.requestType || file.split('_')[0];
            const strategy = this.cacheStrategies[requestType] || this.cacheStrategies['learning-plan'];
            
            if (this.isExpired(cached, strategy.ttl)) {
              await fs.unlink(filePath);
              cleanedCount++;
            }
          } catch (error) {
            console.warn(`⚠️ Failed to clean cache file ${file}:`, error);
          }
        }
      }
      
      console.log(`✅ Cache cleanup completed: ${cleanedCount} expired entries removed`);
    } catch (error) {
      console.error('❌ Cache cleanup failed:', error);
    }
  }

  /**
   * 獲取快取統計
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : '0.00';
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      memoryCacheSize: this.memoryCache.size,
      estimatedCostSavedUSD: (this.stats.estimatedCostSaved / 100).toFixed(4)
    };
  }

  /**
   * 記錄快取命中
   */
  logCacheHit(requestType, source, duration) {
    console.log(`🎯 Cache HIT [${source}] ${requestType} (${duration}ms)`);
  }

  /**
   * 記錄快取未命中
   */
  logCacheMiss(requestType, duration) {
    console.log(`❌ Cache MISS ${requestType} (${duration}ms)`);
  }

  /**
   * 加載統計數據
   */
  async loadStats() {
    try {
      const statsPath = path.join(this.cacheDir, 'cache-stats.json');
      const statsData = await fs.readFile(statsPath, 'utf8');
      const savedStats = JSON.parse(statsData);
      
      // 合併保存的統計數據（保留累計值）
      this.stats.totalRequestsSaved = savedStats.totalRequestsSaved || 0;
      this.stats.estimatedCostSaved = savedStats.estimatedCostSaved || 0;
    } catch (error) {
      // 統計文件不存在或讀取失敗，使用預設值
      console.log('📊 Initializing new cache statistics');
    }
  }

  /**
   * 保存統計數據
   */
  async saveStats() {
    try {
      const statsPath = path.join(this.cacheDir, 'cache-stats.json');
      await fs.writeFile(statsPath, JSON.stringify(this.stats, null, 2), 'utf8');
    } catch (error) {
      console.error('❌ Failed to save cache statistics:', error);
    }
  }

  /**
   * 重置快取
   */
  async reset() {
    console.log('🗑️ Resetting cache...');
    
    try {
      // 清空內存快取
      this.memoryCache.clear();
      
      // 刪除所有快取文件
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }
      
      // 重置統計
      this.stats = {
        hits: 0,
        misses: 0,
        saves: 0,
        evictions: 0,
        errors: 0,
        totalRequestsSaved: 0,
        estimatedCostSaved: 0
      };
      
      console.log('✅ Cache reset completed');
    } catch (error) {
      console.error('❌ Cache reset failed:', error);
    }
  }
}

// 導出類和單例實例
const cacheService = new IntelligentCacheService();

module.exports = {
  // 導出類
  IntelligentCacheService,
  
  // 導出實例方法（向後相容）
  get: cacheService.get.bind(cacheService),
  set: cacheService.set.bind(cacheService),
  cleanup: cacheService.cleanup.bind(cacheService),
  getStats: cacheService.getStats.bind(cacheService),
  reset: cacheService.reset.bind(cacheService)
}; 