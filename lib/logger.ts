/**
 * FocusFlow 統一日誌管理系統
 * 
 * 提供統一的日誌介面，支援不同環境的日誌層級控制
 * 替代專案中的 console.log/console.error 調用
 * 
 * @version 1.0.0
 * @author FocusFlow Team
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1, 
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  context?: string;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private currentLevel: LogLevel;
  private context: string = 'FocusFlow';
  private logs: LogEntry[] = [];
  private maxLogSize: number = 1000; // 最大保存日誌數量

  private constructor() {
    // 🔧 修復：React Native 環境兼容性
    let envLevel = 'DEBUG'; // 默認值
    
    try {
      // 檢測運行環境
      if (typeof process !== 'undefined' && process.env) {
        // Node.js 環境 (後端)
        envLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'ERROR' : 'DEBUG');
      } else if (typeof global !== 'undefined' && (global as any).__DEV__ !== undefined) {
        // React Native 環境 (前端)
        envLevel = (global as any).__DEV__ ? 'DEBUG' : 'ERROR';
      } else if (typeof window !== 'undefined') {
        // Web 環境 (Expo Web)
        envLevel = process.env.NODE_ENV === 'production' ? 'ERROR' : 'DEBUG';
      }
    } catch (error) {
      // 安全後備：任何環境檢測失敗都使用默認值
      envLevel = 'DEBUG';
    }
    
    this.currentLevel = this.parseLogLevel(envLevel);
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toUpperCase()) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': case 'WARNING': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'SILENT': case 'NONE': return LogLevel.SILENT;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  private createLogEntry(level: LogLevel, message: string, data?: any, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      context: this.context,
      error
    };
  }

  private writeLog(entry: LogEntry): void {
    // 保存到內存日誌
    this.logs.push(entry);
    if (this.logs.length > this.maxLogSize) {
      this.logs.shift(); // 移除最舊的日誌
    }

    // 根據層級輸出到不同位置
    const logMessage = this.formatLogMessage(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        if (typeof console.debug === 'function') {
          console.debug(logMessage, entry.data || '');
        } else {
          console.log(`[DEBUG] ${logMessage}`, entry.data || '');
        }
        break;
      case LogLevel.INFO:
        console.log(logMessage, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(logMessage, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(logMessage, entry.error || entry.data || '');
        break;
    }
  }

  private formatLogMessage(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.substring(11, 23); // HH:MM:SS.mmm
    return `[${timestamp}] [${levelName}] [${entry.context}] ${entry.message}`;
  }

  // 公開方法
  public debug(message: string, data?: any, context?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, data);
    if (context) entry.context = context;
    this.writeLog(entry);
  }

  public info(message: string, data?: any, context?: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry = this.createLogEntry(LogLevel.INFO, message, data);
    if (context) entry.context = context;
    this.writeLog(entry);
  }

  public warn(message: string, data?: any, context?: string): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry = this.createLogEntry(LogLevel.WARN, message, data);
    if (context) entry.context = context;
    this.writeLog(entry);
  }

  public error(message: string, error?: Error | any, context?: string): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry = this.createLogEntry(LogLevel.ERROR, message, undefined, error instanceof Error ? error : undefined);
    if (context) entry.context = context;
    if (!(error instanceof Error) && error !== undefined) {
      entry.data = error;
    }
    this.writeLog(entry);
  }

  // 設定方法
  public setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  public setContext(context: string): void {
    this.context = context;
  }

  // 日誌查詢方法
  public getLogs(count?: number): LogEntry[] {
    if (count && count > 0) {
      return this.logs.slice(-count);
    }
    return [...this.logs];
  }

  public getLogsByLevel(level: LogLevel, count?: number): LogEntry[] {
    const filtered = this.logs.filter(log => log.level === level);
    if (count && count > 0) {
      return filtered.slice(-count);
    }
    return filtered;
  }

  public clearLogs(): void {
    this.logs = [];
  }

  // 性能監控方法
  public timeStart(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(`[${this.context}] ${label}`);
    }
  }

  public timeEnd(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(`[${this.context}] ${label}`);
    }
  }

  // 統計方法
  public getStats(): { total: number; byLevel: Record<string, number> } {
    const byLevel: Record<string, number> = {};
    
    this.logs.forEach(log => {
      const levelName = LogLevel[log.level];
      byLevel[levelName] = (byLevel[levelName] || 0) + 1;
    });

    return {
      total: this.logs.length,
      byLevel
    };
  }
}

// 創建全域實例 (安全模式)
let logger: Logger;
try {
  logger = Logger.getInstance();
} catch (error) {
  console.warn('[LOGGER] Initialization failed, using console fallback:', error);
  // 創建一個安全的後備對象
  logger = {
    debug: (message: string, data?: any, context?: string) => console.log(`[DEBUG] [${context || 'App'}] ${message}`, data || ''),
    info: (message: string, data?: any, context?: string) => console.log(`[INFO] [${context || 'App'}] ${message}`, data || ''),
    warn: (message: string, data?: any, context?: string) => console.warn(`[WARN] [${context || 'App'}] ${message}`, data || ''),
    error: (message: string, error?: Error | any, context?: string) => console.error(`[ERROR] [${context || 'App'}] ${message}`, error || ''),
    timeStart: (label: string) => console.time(label),
    timeEnd: (label: string) => console.timeEnd(label),
    setLevel: () => {},
    setContext: () => {},
    getLogs: () => [],
    getLogsByLevel: () => [],
    clearLogs: () => {},
    getStats: () => ({ total: 0, byLevel: {} })
  } as any;
}

// 導出便捷函數 (安全模式)
export const log = {
  debug: (message: string, data?: any, context?: string) => {
    try {
      logger.debug(message, data, context);
    } catch (error) {
      console.log(`[DEBUG] [${context || 'App'}] ${message}`, data || '');
    }
  },
  info: (message: string, data?: any, context?: string) => {
    try {
      logger.info(message, data, context);
    } catch (error) {
      console.log(`[INFO] [${context || 'App'}] ${message}`, data || '');
    }
  },
  warn: (message: string, data?: any, context?: string) => {
    try {
      logger.warn(message, data, context);
    } catch (error) {
      console.warn(`[WARN] [${context || 'App'}] ${message}`, data || '');
    }
  },
  error: (message: string, error?: Error | any, context?: string) => {
    try {
      logger.error(message, error, context);
    } catch (err) {
      console.error(`[ERROR] [${context || 'App'}] ${message}`, error || '');
    }
  },
  
  // 效能監控 (安全模式)
  timeStart: (label: string) => {
    try {
      logger.timeStart(label);
    } catch (error) {
      console.time(label);
    }
  },
  timeEnd: (label: string) => {
    try {
      logger.timeEnd(label);
    } catch (error) {
      console.timeEnd(label);
    }
  },
  
  // 配置方法 (安全模式)
  setLevel: (level: LogLevel) => {
    try {
      logger.setLevel(level);
    } catch (error) {
      // Silent fail for React Native compatibility
    }
  },
  setContext: (context: string) => {
    try {
      logger.setContext(context);
    } catch (error) {
      // Silent fail for React Native compatibility
    }
  },
  
  // 查詢方法 (安全模式)
  getLogs: (count?: number) => {
    try {
      return logger.getLogs(count);
    } catch (error) {
      return [];
    }
  },
  getLogsByLevel: (level: LogLevel, count?: number) => {
    try {
      return logger.getLogsByLevel(level, count);
    } catch (error) {
      return [];
    }
  },
  clearLogs: () => {
    try {
      logger.clearLogs();
    } catch (error) {
      // Silent fail for React Native compatibility
    }
  },
  getStats: () => {
    try {
      return logger.getStats();
    } catch (error) {
      return { total: 0, byLevel: {} };
    }
  }
};

// 向後兼容的全域方法 (用於逐步遷移)
export const debugLog = log.debug;
export const infoLog = log.info; 
export const warnLog = log.warn;
export const errorLog = log.error;

export default logger;

// 使用範例:
/*
import { log, LogLevel } from '@/lib/logger';

// 基本使用
log.info('用戶登入成功', { userId: '123', timestamp: Date.now() });
log.error('API 調用失敗', new Error('Network timeout'), 'APIService');
log.warn('緩存失效', { cacheKey: 'user_profile' });
log.debug('調試資訊', { state: currentState });

// 效能監控
log.timeStart('data-processing');
// ... 執行代碼 ...
log.timeEnd('data-processing');

// 設定日誌層級 (通常在應用啟動時)
log.setLevel(LogLevel.ERROR); // 只顯示錯誤

// 查詢日誌
const recentLogs = log.getLogs(50); // 最近50條
const errorLogs = log.getLogsByLevel(LogLevel.ERROR); // 所有錯誤日誌
const stats = log.getStats(); // 統計資訊

// 環境變數配置範例:
// LOG_LEVEL=DEBUG   (開發環境 - 顯示所有日誌)
// LOG_LEVEL=ERROR   (生產環境 - 只顯示錯誤)
// LOG_LEVEL=SILENT  (完全關閉日誌)
*/