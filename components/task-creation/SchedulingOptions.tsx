import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch
} from 'react-native';
import { Calendar, Clock, Settings, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { log } from '@/lib/logger';
import Colors from '@/constants/colors';
import Theme from '@/constants/theme';
import { SchedulingMode, SCHEDULING_MODES } from '@/utils/scheduling';

interface SchedulingOptionsProps {
  autoSchedule: boolean;
  schedulingMode: SchedulingMode;
  startNextDay: boolean;
  showOptions: boolean;
  onAutoScheduleChange: (enabled: boolean) => void;
  onSchedulingModeChange: (mode: SchedulingMode) => void;
  onStartNextDayChange: (enabled: boolean) => void;
  onToggleOptions: () => void;
}

export default function SchedulingOptions({
  autoSchedule,
  schedulingMode,
  startNextDay,
  showOptions,
  onAutoScheduleChange,
  onSchedulingModeChange,
  onStartNextDayChange,
  onToggleOptions
}: SchedulingOptionsProps) {
  const { t } = useTranslation();

  const handleAutoScheduleToggle = (enabled: boolean) => {
    log.info('Auto-schedule toggled', { enabled });
    onAutoScheduleChange(enabled);
  };

  const handleSchedulingModeChange = (mode: SchedulingMode) => {
    log.info('Scheduling mode changed', { mode });
    onSchedulingModeChange(mode);
  };

  const handleStartNextDayToggle = (enabled: boolean) => {
    log.info('Start next day toggled', { enabled });
    onStartNextDayChange(enabled);
  };

  const getSchedulingModeLabel = (mode: SchedulingMode) => {
    switch (mode) {
      case 'flexible':
        return t('addTask.schedulingFlexible');
      case 'strict':
        return t('addTask.schedulingStrict');
      case 'balanced':
        return t('addTask.schedulingBalanced');
      default:
        return mode;
    }
  };

  const getSchedulingModeDescription = (mode: SchedulingMode) => {
    switch (mode) {
      case 'flexible':
        return t('addTask.schedulingFlexibleDesc');
      case 'strict':
        return t('addTask.schedulingStrictDesc');
      case 'balanced':
        return t('addTask.schedulingBalancedDesc');
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header}
        onPress={onToggleOptions}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Settings size={20} color={Colors.primary} />
          <Text style={styles.title}>{t('addTask.schedulingOptions')}</Text>
        </View>
        {showOptions ? (
          <ChevronUp size={20} color={Colors.text.secondary} />
        ) : (
          <ChevronDown size={20} color={Colors.text.secondary} />
        )}
      </TouchableOpacity>

      {showOptions && (
        <View style={styles.optionsContainer}>
          {/* 自動排程開關 */}
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <View style={styles.optionHeader}>
                <Calendar size={18} color={Colors.text.primary} />
                <Text style={styles.optionLabel}>
                  {t('addTask.autoSchedule')}
                </Text>
              </View>
              <Text style={styles.optionDescription}>
                {t('addTask.autoScheduleDescription')}
              </Text>
            </View>
            <Switch
              value={autoSchedule}
              onValueChange={handleAutoScheduleToggle}
              trackColor={{ false: Colors.border.default, true: Colors.primary + '40' }}
              thumbColor={autoSchedule ? Colors.primary : Colors.text.secondary}
            />
          </View>

          {/* 排程模式選擇 */}
          {autoSchedule && (
            <>
              <View style={styles.divider} />
              
              <View style={styles.optionSection}>
                <View style={styles.sectionHeader}>
                  <Clock size={18} color={Colors.text.primary} />
                  <Text style={styles.sectionTitle}>
                    {t('addTask.schedulingMode')}
                  </Text>
                </View>

                <View style={styles.schedulingModes}>
                  {SCHEDULING_MODES.map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.modeOption,
                        schedulingMode === mode && styles.modeOptionSelected
                      ]}
                      onPress={() => handleSchedulingModeChange(mode)}
                    >
                      <View style={styles.modeHeader}>
                        <Text style={[
                          styles.modeLabel,
                          schedulingMode === mode && styles.modeLabelSelected
                        ]}>
                          {getSchedulingModeLabel(mode)}
                        </Text>
                        {schedulingMode === mode && (
                          <View style={styles.selectedIndicator} />
                        )}
                      </View>
                      <Text style={[
                        styles.modeDescription,
                        schedulingMode === mode && styles.modeDescriptionSelected
                      ]}>
                        {getSchedulingModeDescription(mode)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.divider} />

              {/* 明天開始選項 */}
              <View style={styles.optionRow}>
                <View style={styles.optionInfo}>
                  <View style={styles.optionHeader}>
                    <Calendar size={18} color={Colors.text.primary} />
                    <Text style={styles.optionLabel}>
                      {t('addTask.startNextDay')}
                    </Text>
                  </View>
                  <Text style={styles.optionDescription}>
                    {t('addTask.startNextDayDescription')}
                  </Text>
                </View>
                <Switch
                  value={startNextDay}
                  onValueChange={handleStartNextDayToggle}
                  trackColor={{ false: Colors.border.default, true: Colors.primary + '40' }}
                  thumbColor={startNextDay ? Colors.primary : Colors.text.secondary}
                />
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  optionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 12,
  },
  optionSection: {
    paddingVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  schedulingModes: {
    gap: 12,
  },
  modeOption: {
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 8,
    padding: 12,
    backgroundColor: Colors.background.primary,
  },
  modeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  modeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modeLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  modeLabelSelected: {
    color: Colors.primary,
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  modeDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  modeDescriptionSelected: {
    color: Colors.text.primary,
  },
});