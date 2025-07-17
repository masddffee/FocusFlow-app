import { Platform } from 'react-native';

/**
 * 重啟應用程式
 * 在語言切換後使用以確保所有內容正確翻譯
 */
export const restartApp = async () => {
  try {
    if (Platform.OS === 'web') {
      // Web 平台直接重新加載頁面
      window.location.reload();
    } else {
      // 原生平台提示用戶手動重啟
      console.log('請手動重啟應用程式以完成語言切換');
    }
  } catch (error) {
    console.warn('無法自動重啟應用程式，請手動重啟', error);
  }
};

/**
 * 檢查是否可以自動重啟
 */
export const canAutoRestart = (): boolean => {
  return Platform.OS === 'web';
}; 