/**
 * Focus screen utility functions
 */

/**
 * Calculate timer progress percentage
 * @param currentTime Current time remaining in seconds
 * @param targetTime Target time in seconds
 * @returns Progress percentage (0-100)
 */
export const getTimerProgress = (currentTime: number, targetTime: number): number => {
  if (targetTime === 0) return 0;
  return ((targetTime - currentTime) / targetTime) * 100;
};

/**
 * Format seconds to MM:SS display format for focus timer
 * @param seconds Total seconds
 * @returns Formatted time string (MM:SS)
 */
export const formatTimerDisplay = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
};
