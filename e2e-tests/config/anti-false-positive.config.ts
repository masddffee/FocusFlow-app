/**
 * 防假陽性測試配置
 * 
 * 這個配置文件定義了嚴格的測試標準，防止測試出現假陽性結果
 */

export const ANTI_FALSE_POSITIVE_CONFIG = {
  // 測試超時設定
  timeouts: {
    apiCall: 30000,          // API 調用超時：30秒
    uiInteraction: 10000,    // UI 互動超時：10秒
    dataLoad: 60000,         // 數據載入超時：60秒
    pageLoad: 15000          // 頁面載入超時：15秒
  },

  // 重試設定
  retries: {
    apiCall: 2,              // API 調用最多重試 2 次
    uiElement: 3,            // UI 元素查找最多重試 3 次
    dataVerification: 1      // 數據驗證最多重試 1 次
  },

  // 一致性檢查閾值
  thresholds: {
    consistencyScore: 85,     // 最小一致性分數：85%
    dataCompleteness: 90,     // 數據完整性：90%
    contentQuality: 80,       // 內容質量：80%
    performanceAcceptable: 3000, // 可接受的載入時間：3秒
    uiResponseTime: 2000      // UI 回應時間：2秒
  },

  // 嚴格驗證規則
  validation: {
    // 子任務驗證規則
    subtask: {
      requiredFields: ['title', 'text', 'aiEstimatedDuration', 'difficulty', 'order'],
      titleMinLength: 5,
      textMinLength: 10,
      durationMin: 1,
      durationMax: 480, // 8小時
      validDifficulties: ['easy', 'medium', 'hard'],
      dateFormat: /^\d{4}-\d{2}-\d{2}$/
    },

    // 個人化問題驗證規則
    personalizationQuestion: {
      requiredFields: ['id', 'question', 'type', 'required'],
      questionMinLength: 10,
      validTypes: ['text', 'choice'],
      maxQuestions: 10
    },

    // UI 元素驗證規則
    uiElements: {
      // 真實內容檢測，避免只檢查標題文字
      subtaskContent: {
        selectors: [
          '[class*="subtask"] h3:not(:empty)',
          '[data-testid*="subtask"] .title:not(:empty)',
          '.subtask-title:not(:empty)'
        ],
        contentMinLength: 8,
        excludePatterns: [
          /^子任務$/i,
          /^subtasks?$/i,
          /^第\s*\d+\s*階段$/,
          /^step\s*\d+$/i
        ]
      },

      // 載入狀態檢測
      loadingStates: [
        '[class*="loading"]',
        '[class*="spinner"]',
        '.loading-indicator',
        '[aria-label*="loading"]'
      ],

      // 錯誤訊息檢測
      errorIndicators: [
        '[class*="error"]',
        '[class*="failed"]',
        '.error-message',
        '[role="alert"]'
      ]
    }
  },

  // 測試場景定義
  testScenarios: [
    {
      id: 'realistic-programming-task',
      name: '真實程式設計學習任務',
      data: {
        title: '學習 React Native 移動應用開發',
        description: '從基礎到進階，掌握 React Native 開發技能，能夠獨立開發移動應用',
        dueDate: '2025-09-30',
        priority: 'medium',
        estimatedHours: 60
      },
      expectations: {
        personalizeQuestions: { min: 3, max: 7 },
        subtasks: { min: 8, max: 15 },
        avgDuration: { min: 20, max: 60 }
      }
    },
    {
      id: 'language-learning-scenario',
      name: '語言學習場景',
      data: {
        title: '英語會話能力提升',
        description: '提升英語口語和聽力，能夠進行流利的日常對話',
        dueDate: '2025-08-31',
        priority: 'high',
        estimatedHours: 40
      },
      expectations: {
        personalizeQuestions: { min: 4, max: 6 },
        subtasks: { min: 6, max: 12 },
        avgDuration: { min: 15, max: 45 }
      }
    },
    {
      id: 'skill-certification-prep',
      name: '技能認證準備',
      data: {
        title: 'AWS 雲端架構師認證準備',
        description: '準備 AWS Solutions Architect 認證考試，掌握雲端架構設計',
        dueDate: '2025-10-15',
        priority: 'high',
        estimatedHours: 80
      },
      expectations: {
        personalizeQuestions: { min: 5, max: 8 },
        subtasks: { min: 10, max: 20 },
        avgDuration: { min: 30, max: 90 }
      }
    }
  ],

  // 防假陽性檢查清單
  antiFalsePositiveChecklist: {
    api: [
      '驗證 API 實際返回數據，不只是檢查狀態碼',
      '確認數據結構完整性，檢查所有必需字段',
      '驗證數據內容質量，不只是數量',
      '檢查數據類型正確性',
      '驗證日期格式和範圍合理性'
    ],
    ui: [
      '檢查實際內容顯示，不只是元素存在',
      '驗證用戶可以看到和理解的內容',
      '確認互動元素可點擊和響應',
      '檢查載入狀態和錯誤處理',
      '驗證響應式設計在不同螢幕尺寸下的表現'
    ],
    workflow: [
      '模擬真實用戶操作流程',
      '驗證每個步驟的輸出與輸入的關聯性',
      '檢查異常情況的處理',
      '確認用戶體驗流暢性',
      '驗證數據持久化和狀態維護'
    ],
    integration: [
      '檢查前後端數據一致性',
      '驗證 API 調用與 UI 更新同步',
      '確認錯誤處理在各層級正確傳遞',
      '檢查並發操作的處理',
      '驗證不同用戶場景下的行為一致性'
    ]
  },

  // 報告生成設定
  reporting: {
    generateScreenshots: true,
    captureNetworkLogs: true,
    includePerformanceMetrics: true,
    detailedErrorLogging: true,
    consistencyScoreThreshold: 85,
    
    // 報告分類
    categories: {
      critical: {
        description: '影響核心功能的問題',
        color: 'red',
        requiresImmediateFix: true
      },
      warning: {
        description: '可能影響用戶體驗的問題',
        color: 'orange',
        requiresAttention: true
      },
      info: {
        description: '建議改進的項目',
        color: 'blue',
        requiresConsideration: false
      }
    }
  },

  // 測試環境要求
  environment: {
    requiredServices: ['frontend', 'backend'],
    healthCheckEndpoints: [
      { url: 'http://localhost:8081', name: 'Frontend' },
      { url: 'http://127.0.0.1:3000/health', name: 'Backend' }
    ],
    browserSettings: {
      headless: false, // 顯示瀏覽器以便觀察測試過程
      slowMo: 100,     // 減慢操作速度以便觀察
      devtools: true   // 開啟開發者工具
    }
  }
};

// 驗證器函數
export class AntiFalsePositiveValidator {
  
  /**
   * 驗證子任務數據結構
   */
  static validateSubtaskStructure(subtask: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const rules = ANTI_FALSE_POSITIVE_CONFIG.validation.subtask;

    // 檢查必需字段
    for (const field of rules.requiredFields) {
      if (!subtask[field] && subtask[field] !== 0) {
        errors.push(`缺少必需字段: ${field}`);
      }
    }

    // 檢查字段內容質量
    if (subtask.title && subtask.title.length < rules.titleMinLength) {
      errors.push(`標題長度不足: ${subtask.title.length} < ${rules.titleMinLength}`);
    }

    if (subtask.text && subtask.text.length < rules.textMinLength) {
      errors.push(`描述長度不足: ${subtask.text.length} < ${rules.textMinLength}`);
    }

    // 檢查時長合理性
    if (subtask.aiEstimatedDuration) {
      if (subtask.aiEstimatedDuration < rules.durationMin) {
        errors.push(`時長過短: ${subtask.aiEstimatedDuration} < ${rules.durationMin}`);
      }
      if (subtask.aiEstimatedDuration > rules.durationMax) {
        errors.push(`時長過長: ${subtask.aiEstimatedDuration} > ${rules.durationMax}`);
      }
    }

    // 檢查難度級別
    if (subtask.difficulty && !rules.validDifficulties.includes(subtask.difficulty)) {
      errors.push(`無效的難度級別: ${subtask.difficulty}`);
    }

    // 檢查日期格式
    if (subtask.startDate && !rules.dateFormat.test(subtask.startDate)) {
      errors.push(`無效的開始日期格式: ${subtask.startDate}`);
    }

    if (subtask.endDate && !rules.dateFormat.test(subtask.endDate)) {
      errors.push(`無效的結束日期格式: ${subtask.endDate}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 驗證 UI 內容真實性
   */
  static validateUIContent(content: string[], elementType: string): { valid: boolean; realContent: string[] } {
    const rules = ANTI_FALSE_POSITIVE_CONFIG.validation.uiElements.subtaskContent;
    const realContent: string[] = [];

    for (const item of content) {
      if (!item || item.length < rules.contentMinLength) {
        continue; // 內容太短，跳過
      }

      // 檢查是否匹配排除模式
      const isExcluded = rules.excludePatterns.some(pattern => pattern.test(item));
      if (isExcluded) {
        continue; // 匹配排除模式，跳過
      }

      realContent.push(item);
    }

    return {
      valid: realContent.length > 0,
      realContent
    };
  }

  /**
   * 生成防假陽性檢查清單報告
   */
  static generateChecklistReport(results: Record<string, boolean>): string {
    const checklist = ANTI_FALSE_POSITIVE_CONFIG.antiFalsePositiveChecklist;
    let report = '# 防假陽性檢查清單報告\n\n';

    Object.keys(checklist).forEach(category => {
      report += `## ${category.toUpperCase()}\n\n`;
      
      checklist[category].forEach((item: string) => {
        const status = results[item] ? '✅' : '❌';
        report += `${status} ${item}\n`;
      });
      
      report += '\n';
    });

    return report;
  }
}

export default ANTI_FALSE_POSITIVE_CONFIG;