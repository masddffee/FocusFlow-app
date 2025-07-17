/**
 * 成本監控與速率限制服務 - 企業級成本優化系統
 * 實現智能成本追蹤、預算控制、使用配額管理和異常監控
 */

const fs = require('fs').promises;
const path = require('path');

class CostMonitoringService {
  constructor() {
    this.dataDir = path.join(__dirname, '../../monitoring');
    
    // 成本追蹤配置
    this.costConfig = {
      // Gemini 2.5 Flash 定價（每1K tokens）
      gemini_2_5_flash: {
        input: 0.075,    // $0.000075 per token
        output: 0.30     // $0.0003 per token
      },
      
      // 預算限制（美分）
      budgetLimits: {
        daily: 500,      // $5.00 per day
        weekly: 2000,    // $20.00 per week
        monthly: 7500    // $75.00 per month
      },
      
      // 警告閾值
      warningThresholds: {
        daily: 0.8,      // 80% 預算使用時警告
        weekly: 0.8,
        monthly: 0.9     // 90% 月預算使用時警告
      }
    };

    // 速率限制配置
    this.rateLimits = {
      // 每用戶速率限制
      perUser: {
        requestsPerMinute: 10,
        requestsPerHour: 200,
        requestsPerDay: 1000
      },
      
      // 全局速率限制
      global: {
        requestsPerMinute: 100,
        requestsPerHour: 2000,
        requestsPerDay: 10000
      },
      
      // 請求類型限制
      perType: {
        'learning-plan': { requestsPerMinute: 3, requestsPerHour: 50 },
        'subtasks-generation': { requestsPerMinute: 5, requestsPerHour: 100 },
        'productivity-tips': { requestsPerMinute: 8, requestsPerHour: 150 },
        'learning-questions': { requestsPerMinute: 6, requestsPerHour: 120 },
        'personalization-questions': { requestsPerMinute: 4, requestsPerHour: 80 }
      }
    };

    // 內存中的追蹤數據
    this.tracking = {
      costs: {
        daily: new Map(),    // date -> cost
        weekly: new Map(),   // week -> cost
        monthly: new Map()   // month -> cost
      },
      
      usage: {
        perUser: new Map(),      // userId -> usage data
        perType: new Map(),      // requestType -> usage data
        global: {
          requestsPerMinute: [],
          requestsPerHour: [],
          requestsPerDay: []
        }
      },
      
      requests: [],  // 最近的請求記錄
      alerts: []     // 警告記錄
    };

    this.initialize();
  }

  async initialize() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await this.loadHistoricalData();
      
      // 啟動清理任務
      this.startCleanupTasks();
      
      console.log('💰 Cost Monitoring Service initialized');
      console.log(`📊 Current daily cost: $${(this.getDailyCost() / 100).toFixed(4)}`);
    } catch (error) {
      console.error('❌ Cost monitoring service initialization failed:', error);
    }
  }

  /**
   * 記錄 API 請求和成本
   */
  async recordRequest(requestData) {
    const {
      requestType,
      userId = 'anonymous',
      inputTokens,
      outputTokens,
      processingTime,
      cached = false,
      batchSize = 1
    } = requestData;

    const timestamp = Date.now();
    const cost = this.calculateCost(inputTokens, outputTokens);
    
    // 如果是快取命中，成本為0
    const actualCost = cached ? 0 : cost;

    const requestRecord = {
      id: this.generateRequestId(),
      timestamp,
      requestType,
      userId,
      inputTokens: inputTokens || 0,
      outputTokens: outputTokens || 0,
      cost: actualCost,
      processingTime: processingTime || 0,
      cached,
      batchSize,
      date: this.getDateKey(timestamp),
      hour: this.getHourKey(timestamp),
      minute: this.getMinuteKey(timestamp)
    };

    // 記錄請求
    this.tracking.requests.push(requestRecord);
    
    // 限制內存中的請求記錄數量
    if (this.tracking.requests.length > 10000) {
      this.tracking.requests = this.tracking.requests.slice(-5000);
    }

    // 更新成本追蹤
    this.updateCostTracking(requestRecord);
    
    // 更新使用量追蹤
    this.updateUsageTracking(requestRecord);
    
    // 檢查預算和速率限制
    await this.checkLimitsAndAlerts(requestRecord);
    
    // 異步保存數據
    this.saveTrackingData();

    console.log(`💰 Request recorded: ${requestType} - $${(actualCost / 100).toFixed(4)} (cached: ${cached})`);
    
    return requestRecord;
  }

  /**
   * 計算請求成本
   */
  calculateCost(inputTokens = 0, outputTokens = 0) {
    const pricing = this.costConfig.gemini_2_5_flash;
    
    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    
    // 返回以美分為單位的成本
    return Math.ceil((inputCost + outputCost) * 100);
  }

  /**
   * 更新成本追蹤
   */
  updateCostTracking(requestRecord) {
    const { cost, timestamp } = requestRecord;
    
    // 日成本
    const dateKey = this.getDateKey(timestamp);
    const currentDailyCost = this.tracking.costs.daily.get(dateKey) || 0;
    this.tracking.costs.daily.set(dateKey, currentDailyCost + cost);
    
    // 週成本
    const weekKey = this.getWeekKey(timestamp);
    const currentWeeklyCost = this.tracking.costs.weekly.get(weekKey) || 0;
    this.tracking.costs.weekly.set(weekKey, currentWeeklyCost + cost);
    
    // 月成本
    const monthKey = this.getMonthKey(timestamp);
    const currentMonthlyCost = this.tracking.costs.monthly.get(monthKey) || 0;
    this.tracking.costs.monthly.set(monthKey, currentMonthlyCost + cost);
  }

  /**
   * 更新使用量追蹤
   */
  updateUsageTracking(requestRecord) {
    const { userId, requestType, timestamp } = requestRecord;
    
    // 用戶使用量
    if (!this.tracking.usage.perUser.has(userId)) {
      this.tracking.usage.perUser.set(userId, {
        requestsPerMinute: [],
        requestsPerHour: [],
        requestsPerDay: []
      });
    }
    
    const userUsage = this.tracking.usage.perUser.get(userId);
    userUsage.requestsPerMinute.push(timestamp);
    userUsage.requestsPerHour.push(timestamp);
    userUsage.requestsPerDay.push(timestamp);
    
    // 請求類型使用量
    if (!this.tracking.usage.perType.has(requestType)) {
      this.tracking.usage.perType.set(requestType, {
        requestsPerMinute: [],
        requestsPerHour: [],
        requestsPerDay: []
      });
    }
    
    const typeUsage = this.tracking.usage.perType.get(requestType);
    typeUsage.requestsPerMinute.push(timestamp);
    typeUsage.requestsPerHour.push(timestamp);
    typeUsage.requestsPerDay.push(timestamp);
    
    // 全局使用量
    this.tracking.usage.global.requestsPerMinute.push(timestamp);
    this.tracking.usage.global.requestsPerHour.push(timestamp);
    this.tracking.usage.global.requestsPerDay.push(timestamp);
    
    // 清理過期的時間戳
    this.cleanupUsageData();
  }

  /**
   * 檢查限制和警告
   */
  async checkLimitsAndAlerts(requestRecord) {
    const { userId, requestType } = requestRecord;
    
    // 檢查預算警告
    await this.checkBudgetAlerts();
    
    // 檢查速率限制
    const rateLimitCheck = this.checkRateLimits(userId, requestType);
    if (!rateLimitCheck.allowed) {
      throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
    }
    
    // 檢查異常使用模式
    this.checkAnomalyAlerts(requestRecord);
  }

  /**
   * 檢查預算警告
   */
  async checkBudgetAlerts() {
    const now = Date.now();
    const dailyCost = this.getDailyCost();
    const weeklyCost = this.getWeeklyCost();
    const monthlyCost = this.getMonthlyCost();
    
    const limits = this.costConfig.budgetLimits;
    const thresholds = this.costConfig.warningThresholds;
    
    // 日預算檢查
    if (dailyCost >= limits.daily * thresholds.daily) {
      await this.createAlert({
        type: 'budget_warning',
        level: dailyCost >= limits.daily ? 'critical' : 'warning',
        message: `Daily budget ${dailyCost >= limits.daily ? 'exceeded' : 'threshold reached'}: $${(dailyCost / 100).toFixed(2)} / $${(limits.daily / 100).toFixed(2)}`,
        cost: dailyCost,
        limit: limits.daily,
        period: 'daily'
      });
    }
    
    // 週預算檢查
    if (weeklyCost >= limits.weekly * thresholds.weekly) {
      await this.createAlert({
        type: 'budget_warning',
        level: weeklyCost >= limits.weekly ? 'critical' : 'warning',
        message: `Weekly budget ${weeklyCost >= limits.weekly ? 'exceeded' : 'threshold reached'}: $${(weeklyCost / 100).toFixed(2)} / $${(limits.weekly / 100).toFixed(2)}`,
        cost: weeklyCost,
        limit: limits.weekly,
        period: 'weekly'
      });
    }
    
    // 月預算檢查
    if (monthlyCost >= limits.monthly * thresholds.monthly) {
      await this.createAlert({
        type: 'budget_warning',
        level: monthlyCost >= limits.monthly ? 'critical' : 'warning',
        message: `Monthly budget ${monthlyCost >= limits.monthly ? 'exceeded' : 'threshold reached'}: $${(monthlyCost / 100).toFixed(2)} / $${(limits.monthly / 100).toFixed(2)}`,
        cost: monthlyCost,
        limit: limits.monthly,
        period: 'monthly'
      });
    }
  }

  /**
   * 檢查速率限制
   */
  checkRateLimits(userId, requestType) {
    const now = Date.now();
    
    // 🆕 智能速率限制增強 - 檢查用戶行為模式
    const userBehavior = this.analyzeUserBehavior(userId);
    const adjustedLimits = this.adjustLimitsBasedOnBehavior(userBehavior, requestType);
    
    // 檢查全局速率限制
    const globalLimits = this.rateLimits.global;
    const globalUsage = this.tracking.usage.global;
    
    if (this.countRequestsInTimeWindow(globalUsage.requestsPerMinute, 60 * 1000) >= globalLimits.requestsPerMinute) {
      return { 
        allowed: false, 
        reason: 'Global rate limit exceeded (per minute)',
        retryAfter: this.calculateRetryAfter(globalUsage.requestsPerMinute, globalLimits.requestsPerMinute, 60 * 1000),
        severity: 'high'
      };
    }
    
    if (this.countRequestsInTimeWindow(globalUsage.requestsPerHour, 60 * 60 * 1000) >= globalLimits.requestsPerHour) {
      return { 
        allowed: false, 
        reason: 'Global rate limit exceeded (per hour)',
        retryAfter: this.calculateRetryAfter(globalUsage.requestsPerHour, globalLimits.requestsPerHour, 60 * 60 * 1000),
        severity: 'medium'
      };
    }
    
    if (this.countRequestsInTimeWindow(globalUsage.requestsPerDay, 24 * 60 * 60 * 1000) >= globalLimits.requestsPerDay) {
      return { 
        allowed: false, 
        reason: 'Global rate limit exceeded (per day)',
        retryAfter: this.calculateRetryAfter(globalUsage.requestsPerDay, globalLimits.requestsPerDay, 24 * 60 * 60 * 1000),
        severity: 'critical'
      };
    }
    
    // 檢查用戶速率限制（使用調整後的限制）
    const userUsage = this.tracking.usage.perUser.get(userId);
    
    if (userUsage) {
      if (this.countRequestsInTimeWindow(userUsage.requestsPerMinute, 60 * 1000) >= adjustedLimits.requestsPerMinute) {
        return { 
          allowed: false, 
          reason: 'User rate limit exceeded (per minute)',
          retryAfter: this.calculateRetryAfter(userUsage.requestsPerMinute, adjustedLimits.requestsPerMinute, 60 * 1000),
          adjustedLimit: adjustedLimits.requestsPerMinute,
          originalLimit: this.rateLimits.perUser.requestsPerMinute,
          behaviorScore: userBehavior.trustScore
        };
      }
      
      if (this.countRequestsInTimeWindow(userUsage.requestsPerHour, 60 * 60 * 1000) >= adjustedLimits.requestsPerHour) {
        return { 
          allowed: false, 
          reason: 'User rate limit exceeded (per hour)',
          retryAfter: this.calculateRetryAfter(userUsage.requestsPerHour, adjustedLimits.requestsPerHour, 60 * 60 * 1000),
          adjustedLimit: adjustedLimits.requestsPerHour,
          originalLimit: this.rateLimits.perUser.requestsPerHour
        };
      }
      
      if (this.countRequestsInTimeWindow(userUsage.requestsPerDay, 24 * 60 * 60 * 1000) >= adjustedLimits.requestsPerDay) {
        return { 
          allowed: false, 
          reason: 'User rate limit exceeded (per day)',
          retryAfter: this.calculateRetryAfter(userUsage.requestsPerDay, adjustedLimits.requestsPerDay, 24 * 60 * 60 * 1000),
          adjustedLimit: adjustedLimits.requestsPerDay,
          originalLimit: this.rateLimits.perUser.requestsPerDay
        };
      }
    }
    
    // 檢查請求類型速率限制
    const typeLimits = this.rateLimits.perType[requestType];
    const typeUsage = this.tracking.usage.perType.get(requestType);
    
    if (typeLimits && typeUsage) {
      if (this.countRequestsInTimeWindow(typeUsage.requestsPerMinute, 60 * 1000) >= typeLimits.requestsPerMinute) {
        return { 
          allowed: false, 
          reason: `${requestType} rate limit exceeded (per minute)`,
          retryAfter: this.calculateRetryAfter(typeUsage.requestsPerMinute, typeLimits.requestsPerMinute, 60 * 1000)
        };
      }
      
      if (this.countRequestsInTimeWindow(typeUsage.requestsPerHour, 60 * 60 * 1000) >= typeLimits.requestsPerHour) {
        return { 
          allowed: false, 
          reason: `${requestType} rate limit exceeded (per hour)`,
          retryAfter: this.calculateRetryAfter(typeUsage.requestsPerHour, typeLimits.requestsPerHour, 60 * 60 * 1000)
        };
      }
    }
    
    // 🆕 漸進式警告系統
    const warnings = this.checkProgressiveWarnings(userId, requestType, userUsage, adjustedLimits);
    
    return { 
      allowed: true,
      warnings,
      behaviorScore: userBehavior.trustScore,
      adjustedLimits
    };
  }

  /**
   * 🆕 分析用戶行為模式
   */
  analyzeUserBehavior(userId) {
    const userRequests = this.tracking.requests
      .filter(req => req.userId === userId)
      .slice(-200); // 分析最近200個請求
    
    if (userRequests.length < 10) {
      return {
        trustScore: 0.5, // 新用戶的基準信任分數
        pattern: 'new',
        avgCost: 0,
        requestVariety: 0,
        timeSpread: 0
      };
    }
    
    // 計算各種行為指標
    const avgCost = userRequests.reduce((sum, req) => sum + req.cost, 0) / userRequests.length;
    const requestTypes = new Set(userRequests.map(req => req.requestType));
    const requestVariety = requestTypes.size;
    
    // 計算時間分佈
    const timeStamps = userRequests.map(req => req.timestamp);
    const timeSpread = this.calculateTimeSpread(timeStamps);
    
    // 檢查異常行為
    const hasHighCostSpikes = userRequests.some(req => req.cost > 50);
    const hasBurstActivity = this.detectBurstActivity(timeStamps);
    
    // 計算信任分數 (0-1)
    let trustScore = 0.5; // 基準分數
    
    // 正面行為加分
    if (avgCost < 15) trustScore += 0.2; // 低成本使用
    if (requestVariety > 2) trustScore += 0.15; // 多樣化使用
    if (timeSpread > 0.3) trustScore += 0.15; // 分散的時間使用
    if (!hasHighCostSpikes) trustScore += 0.1; // 沒有成本異常
    
    // 負面行為扣分
    if (hasBurstActivity) trustScore -= 0.3; // 突發性大量請求
    if (avgCost > 30) trustScore -= 0.2; // 高成本使用
    if (hasHighCostSpikes) trustScore -= 0.1; // 成本異常
    
    trustScore = Math.max(0, Math.min(1, trustScore));
    
    return {
      trustScore,
      pattern: this.classifyUserPattern(trustScore, requestVariety, timeSpread),
      avgCost,
      requestVariety,
      timeSpread,
      hasHighCostSpikes,
      hasBurstActivity
    };
  }

  /**
   * 🆕 基於行為調整速率限制
   */
  adjustLimitsBasedOnBehavior(userBehavior, requestType) {
    const baseLimits = this.rateLimits.perUser;
    const trustScore = userBehavior.trustScore;
    
    // 信任分數調整因子 (0.5 - 2.0)
    const adjustmentFactor = 0.5 + (trustScore * 1.5);
    
    // 針對請求類型的特殊調整
    let typeAdjustment = 1.0;
    if (requestType === 'learning-plan' || requestType === 'subtasks-generation') {
      typeAdjustment = 0.8; // 複雜請求更嚴格
    } else if (requestType === 'productivity-tips') {
      typeAdjustment = 1.2; // 簡單請求更寬鬆
    }
    
    const finalFactor = adjustmentFactor * typeAdjustment;
    
    return {
      requestsPerMinute: Math.floor(baseLimits.requestsPerMinute * finalFactor),
      requestsPerHour: Math.floor(baseLimits.requestsPerHour * finalFactor),
      requestsPerDay: Math.floor(baseLimits.requestsPerDay * finalFactor)
    };
  }

  /**
   * 🆕 計算重試時間
   */
  calculateRetryAfter(timestamps, limit, windowMs) {
    if (timestamps.length === 0) return 0;
    
    const now = Date.now();
    const oldestRelevantTimestamp = timestamps
      .filter(ts => ts > now - windowMs)
      .sort((a, b) => a - b)[0];
    
    if (!oldestRelevantTimestamp) return 0;
    
    // 計算到時間窗口結束的時間 + 小緩衝
    const retryAfter = Math.max(0, oldestRelevantTimestamp + windowMs - now + 1000);
    return Math.ceil(retryAfter / 1000); // 返回秒數
  }

  /**
   * 🆕 漸進式警告檢查
   */
  checkProgressiveWarnings(userId, requestType, userUsage, adjustedLimits) {
    if (!userUsage) return [];
    
    const warnings = [];
    const now = Date.now();
    
    // 檢查分鐘級使用率
    const minuteUsage = this.countRequestsInTimeWindow(userUsage.requestsPerMinute, 60 * 1000);
    const minuteUsageRate = minuteUsage / adjustedLimits.requestsPerMinute;
    
    if (minuteUsageRate > 0.8) {
      warnings.push({
        type: 'approaching_limit',
        level: 'warning',
        timeWindow: 'minute',
        current: minuteUsage,
        limit: adjustedLimits.requestsPerMinute,
        usageRate: Math.round(minuteUsageRate * 100)
      });
    }
    
    // 檢查小時級使用率
    const hourUsage = this.countRequestsInTimeWindow(userUsage.requestsPerHour, 60 * 60 * 1000);
    const hourUsageRate = hourUsage / adjustedLimits.requestsPerHour;
    
    if (hourUsageRate > 0.7) {
      warnings.push({
        type: 'approaching_limit',
        level: 'info',
        timeWindow: 'hour',
        current: hourUsage,
        limit: adjustedLimits.requestsPerHour,
        usageRate: Math.round(hourUsageRate * 100)
      });
    }
    
    return warnings;
  }

  /**
   * 🆕 計算時間分佈
   */
  calculateTimeSpread(timeStamps) {
    if (timeStamps.length < 2) return 0;
    
    const sorted = timeStamps.sort((a, b) => a - b);
    const totalSpan = sorted[sorted.length - 1] - sorted[0];
    const avgGap = totalSpan / (sorted.length - 1);
    
    // 計算間隔的標準差
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(sorted[i] - sorted[i - 1]);
    }
    
    const variance = gaps.reduce((sum, gap) => {
      const diff = gap - avgGap;
      return sum + diff * diff;
    }, 0) / gaps.length;
    
    const stdDev = Math.sqrt(variance);
    
    // 標準化分數 (0-1)，分佈越均勻分數越高
    return Math.min(1, stdDev / avgGap);
  }

  /**
   * 🆕 檢測突發活動
   */
  detectBurstActivity(timeStamps) {
    if (timeStamps.length < 5) return false;
    
    const sorted = timeStamps.sort((a, b) => b - a); // 最新的在前
    const recent5min = sorted.filter(ts => ts > Date.now() - 5 * 60 * 1000);
    
    // 如果5分鐘內有超過20個請求，認為是突發活動
    return recent5min.length > 20;
  }

  /**
   * 🆕 用戶模式分類
   */
  classifyUserPattern(trustScore, requestVariety, timeSpread) {
    if (trustScore > 0.8 && requestVariety > 3 && timeSpread > 0.4) {
      return 'trusted_power_user';
    } else if (trustScore > 0.6 && requestVariety > 2) {
      return 'regular_user';
    } else if (trustScore < 0.3) {
      return 'suspicious';
    } else {
      return 'casual_user';
    }
  }

  /**
   * 檢查異常使用警告
   */
  async checkAnomalyAlerts(requestRecord) {
    const { userId, requestType, cost } = requestRecord;
    
    // 檢查單次請求成本異常
    if (cost > 50) { // 超過 $0.50 的單次請求
      await this.createAlert({
        type: 'high_cost_request',
        level: 'warning',
        message: `High cost request detected: $${(cost / 100).toFixed(4)} for ${requestType}`,
        userId,
        requestType,
        cost
      });
    }
    
    // 檢查用戶使用模式異常
    const userRequests = this.tracking.requests
      .filter(req => req.userId === userId)
      .slice(-100); // 最近100個請求
    
    if (userRequests.length >= 50) {
      const recentRequests = userRequests.slice(-10);
      const avgCost = recentRequests.reduce((sum, req) => sum + req.cost, 0) / recentRequests.length;
      
      if (avgCost > 20) { // 平均請求成本超過 $0.20
        await this.createAlert({
          type: 'high_usage_pattern',
          level: 'info',
          message: `High average cost pattern detected for user ${userId}: $${(avgCost / 100).toFixed(4)} per request`,
          userId,
          averageCost: avgCost
        });
      }
    }
  }

  /**
   * 創建警告
   */
  async createAlert(alertData) {
    const alert = {
      id: this.generateAlertId(),
      timestamp: Date.now(),
      ...alertData
    };
    
    this.tracking.alerts.push(alert);
    
    // 限制警告記錄數量
    if (this.tracking.alerts.length > 1000) {
      this.tracking.alerts = this.tracking.alerts.slice(-500);
    }
    
    console.log(`🚨 Alert created [${alert.level}]: ${alert.message}`);
    
    // 保存警告到文件
    await this.saveAlert(alert);
    
    return alert;
  }

  /**
   * 計算時間窗口內的請求數量
   */
  countRequestsInTimeWindow(timestamps, windowMs) {
    const now = Date.now();
    const cutoff = now - windowMs;
    
    return timestamps.filter(timestamp => timestamp > cutoff).length;
  }

  /**
   * 清理過期的使用數據
   */
  cleanupUsageData() {
    const now = Date.now();
    
    // 清理分鐘級數據（保留2分鐘）
    const minuteCutoff = now - 2 * 60 * 1000;
    
    // 清理小時級數據（保留2小時）
    const hourCutoff = now - 2 * 60 * 60 * 1000;
    
    // 清理日級數據（保留2天）
    const dayCutoff = now - 2 * 24 * 60 * 60 * 1000;
    
    // 清理全局使用數據
    this.tracking.usage.global.requestsPerMinute = 
      this.tracking.usage.global.requestsPerMinute.filter(ts => ts > minuteCutoff);
    this.tracking.usage.global.requestsPerHour = 
      this.tracking.usage.global.requestsPerHour.filter(ts => ts > hourCutoff);
    this.tracking.usage.global.requestsPerDay = 
      this.tracking.usage.global.requestsPerDay.filter(ts => ts > dayCutoff);
    
    // 清理用戶使用數據
    for (const [userId, usage] of this.tracking.usage.perUser.entries()) {
      usage.requestsPerMinute = usage.requestsPerMinute.filter(ts => ts > minuteCutoff);
      usage.requestsPerHour = usage.requestsPerHour.filter(ts => ts > hourCutoff);
      usage.requestsPerDay = usage.requestsPerDay.filter(ts => ts > dayCutoff);
      
      // 如果用戶沒有近期活動，刪除記錄
      if (usage.requestsPerDay.length === 0) {
        this.tracking.usage.perUser.delete(userId);
      }
    }
    
    // 清理請求類型使用數據
    for (const [requestType, usage] of this.tracking.usage.perType.entries()) {
      usage.requestsPerMinute = usage.requestsPerMinute.filter(ts => ts > minuteCutoff);
      usage.requestsPerHour = usage.requestsPerHour.filter(ts => ts > hourCutoff);
      usage.requestsPerDay = usage.requestsPerDay.filter(ts => ts > dayCutoff);
    }
  }

  /**
   * 獲取當前成本統計
   */
  getDailyCost() {
    const dateKey = this.getDateKey(Date.now());
    return this.tracking.costs.daily.get(dateKey) || 0;
  }

  getWeeklyCost() {
    const weekKey = this.getWeekKey(Date.now());
    return this.tracking.costs.weekly.get(weekKey) || 0;
  }

  getMonthlyCost() {
    const monthKey = this.getMonthKey(Date.now());
    return this.tracking.costs.monthly.get(monthKey) || 0;
  }

  /**
   * 獲取詳細的成本和使用統計
   */
  getDetailedStats() {
    const now = Date.now();
    
    // 計算快取效率
    const recentRequests = this.tracking.requests.slice(-1000);
    const cachedCount = recentRequests.filter(req => req.cached).length;
    const cacheHitRate = recentRequests.length > 0 
      ? (cachedCount / recentRequests.length * 100).toFixed(2)
      : '0.00';
    
    // 計算平均成本
    const nonCachedRequests = recentRequests.filter(req => !req.cached);
    const avgCostPerRequest = nonCachedRequests.length > 0
      ? nonCachedRequests.reduce((sum, req) => sum + req.cost, 0) / nonCachedRequests.length
      : 0;
    
    // 計算節省的成本
    const totalCachedCost = recentRequests
      .filter(req => req.cached)
      .reduce((sum, req) => sum + (avgCostPerRequest || 8), 0); // 假設平均成本
    
    return {
      costs: {
        daily: this.getDailyCost(),
        weekly: this.getWeeklyCost(),
        monthly: this.getMonthlyCost(),
        dailyUSD: (this.getDailyCost() / 100).toFixed(4),
        weeklyUSD: (this.getWeeklyCost() / 100).toFixed(4),
        monthlyUSD: (this.getMonthlyCost() / 100).toFixed(4)
      },
      
      budgets: {
        daily: {
          used: this.getDailyCost(),
          limit: this.costConfig.budgetLimits.daily,
          percentage: ((this.getDailyCost() / this.costConfig.budgetLimits.daily) * 100).toFixed(1),
          remaining: this.costConfig.budgetLimits.daily - this.getDailyCost()
        },
        weekly: {
          used: this.getWeeklyCost(),
          limit: this.costConfig.budgetLimits.weekly,
          percentage: ((this.getWeeklyCost() / this.costConfig.budgetLimits.weekly) * 100).toFixed(1),
          remaining: this.costConfig.budgetLimits.weekly - this.getWeeklyCost()
        },
        monthly: {
          used: this.getMonthlyCost(),
          limit: this.costConfig.budgetLimits.monthly,
          percentage: ((this.getMonthlyCost() / this.costConfig.budgetLimits.monthly) * 100).toFixed(1),
          remaining: this.costConfig.budgetLimits.monthly - this.getMonthlyCost()
        }
      },
      
      efficiency: {
        cacheHitRate: `${cacheHitRate}%`,
        averageCostPerRequest: (avgCostPerRequest / 100).toFixed(4),
        totalCachedSavings: (totalCachedCost / 100).toFixed(4),
        totalRequests: recentRequests.length,
        cachedRequests: cachedCount
      },
      
      rateLimits: {
        global: {
          perMinute: `${this.countRequestsInTimeWindow(this.tracking.usage.global.requestsPerMinute, 60 * 1000)}/${this.rateLimits.global.requestsPerMinute}`,
          perHour: `${this.countRequestsInTimeWindow(this.tracking.usage.global.requestsPerHour, 60 * 60 * 1000)}/${this.rateLimits.global.requestsPerHour}`,
          perDay: `${this.countRequestsInTimeWindow(this.tracking.usage.global.requestsPerDay, 24 * 60 * 60 * 1000)}/${this.rateLimits.global.requestsPerDay}`
        }
      },
      
      alerts: {
        total: this.tracking.alerts.length,
        recent: this.tracking.alerts.filter(alert => alert.timestamp > now - 24 * 60 * 60 * 1000).length,
        critical: this.tracking.alerts.filter(alert => alert.level === 'critical').length
      }
    };
  }

  /**
   * 時間鍵生成函數
   */
  getDateKey(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getWeekKey(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const week = Math.ceil((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  getMonthKey(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  getHourKey(timestamp) {
    const date = new Date(timestamp);
    return `${this.getDateKey(timestamp)}-${String(date.getHours()).padStart(2, '0')}`;
  }

  getMinuteKey(timestamp) {
    const date = new Date(timestamp);
    return `${this.getHourKey(timestamp)}-${String(date.getMinutes()).padStart(2, '0')}`;
  }

  /**
   * ID 生成函數
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 數據持久化
   */
  async saveTrackingData() {
    try {
      const dataPath = path.join(this.dataDir, 'tracking-data.json');
      const data = {
        costs: {
          daily: Array.from(this.tracking.costs.daily.entries()),
          weekly: Array.from(this.tracking.costs.weekly.entries()),
          monthly: Array.from(this.tracking.costs.monthly.entries())
        },
        lastSaved: Date.now()
      };
      
      await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Failed to save tracking data:', error);
    }
  }

  async saveAlert(alert) {
    try {
      const alertPath = path.join(this.dataDir, 'alerts.jsonl');
      const alertLine = JSON.stringify(alert) + '\n';
      await fs.appendFile(alertPath, alertLine);
    } catch (error) {
      console.error('❌ Failed to save alert:', error);
    }
  }

  async loadHistoricalData() {
    try {
      const dataPath = path.join(this.dataDir, 'tracking-data.json');
      const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
      
      // 重載成本數據
      this.tracking.costs.daily = new Map(data.costs.daily);
      this.tracking.costs.weekly = new Map(data.costs.weekly);
      this.tracking.costs.monthly = new Map(data.costs.monthly);
      
      console.log('📊 Historical cost data loaded');
    } catch (error) {
      console.log('📊 No historical data found, starting fresh');
    }
  }

  /**
   * 清理任務
   */
  startCleanupTasks() {
    // 每小時清理一次過期數據
    setInterval(() => {
      this.cleanupUsageData();
    }, 60 * 60 * 1000);
    
    // 每天保存一次數據
    setInterval(() => {
      this.saveTrackingData();
    }, 24 * 60 * 60 * 1000);
    
    console.log('🧹 Cleanup tasks started');
  }

  /**
   * 重置所有追蹤數據
   */
  async reset() {
    this.tracking = {
      costs: {
        daily: new Map(),
        weekly: new Map(),
        monthly: new Map()
      },
      usage: {
        perUser: new Map(),
        perType: new Map(),
        global: {
          requestsPerMinute: [],
          requestsPerHour: [],
          requestsPerDay: []
        }
      },
      requests: [],
      alerts: []
    };
    
    await this.saveTrackingData();
    console.log('🗑️ All tracking data reset');
  }
}

// 導出類和單例實例
const costMonitor = new CostMonitoringService();

module.exports = {
  // 導出類
  CostMonitoringService,
  
  // 導出實例方法（向後相容）
  recordRequest: costMonitor.recordRequest.bind(costMonitor),
  checkRateLimits: costMonitor.checkRateLimits.bind(costMonitor),
  getDetailedStats: costMonitor.getDetailedStats.bind(costMonitor),
  getDailyCost: costMonitor.getDailyCost.bind(costMonitor),
  getWeeklyCost: costMonitor.getWeeklyCost.bind(costMonitor),
  getMonthlyCost: costMonitor.getMonthlyCost.bind(costMonitor),
  reset: costMonitor.reset.bind(costMonitor)
}; 