import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { X, BookOpen, Clock, Target, Tool, CheckCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { log } from '@/lib/logger';
import Colors from '@/constants/colors';
import Theme from '@/constants/theme';
import Button from '@/components/Button';
import { LearningPlan } from '@/types/task';

interface LearningPlanModalProps {
  visible: boolean;
  plan: LearningPlan | null;
  onClose: () => void;
  onAccept: () => void;
}

export default function LearningPlanModal({
  visible,
  plan,
  onClose,
  onAccept
}: LearningPlanModalProps) {
  const { t } = useTranslation();

  if (!plan) return null;

  const handleAccept = () => {
    log.info('Learning plan accepted', { 
      goalLength: plan.achievableGoal?.length,
      toolsCount: plan.recommendedTools?.length,
      checkpointsCount: plan.checkpoints?.length
    });
    onAccept();
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} ${t('common.minutes')}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} ${t('common.hours')}`;
    }
    return `${hours}${t('common.hoursShort')} ${remainingMinutes}${t('common.minutesShort')}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {t('addTask.learningPlanTitle')}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* 學習目標 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Target size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>
                {t('addTask.achievableGoal')}
              </Text>
            </View>
            <Text style={styles.goalText}>{plan.achievableGoal}</Text>
          </View>

          {/* 預估完成時間 */}
          {plan.estimatedTimeToCompletion && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Clock size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>
                  {t('addTask.estimatedTime')}
                </Text>
              </View>
              <Text style={styles.timeText}>
                {formatTime(plan.estimatedTimeToCompletion)}
              </Text>
            </View>
          )}

          {/* 推薦工具 */}
          {plan.recommendedTools && plan.recommendedTools.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Tool size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>
                  {t('addTask.recommendedTools')}
                </Text>
              </View>
              <View style={styles.toolsContainer}>
                {plan.recommendedTools.map((tool, index) => (
                  <View key={index} style={styles.toolItem}>
                    <Text style={styles.toolText}>{tool}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 學習檢查點 */}
          {plan.checkpoints && plan.checkpoints.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <CheckCircle size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>
                  {t('addTask.checkpoints')}
                </Text>
              </View>
              <View style={styles.checkpointsContainer}>
                {plan.checkpoints.map((checkpoint, index) => (
                  <View key={index} style={styles.checkpointItem}>
                    <View style={styles.checkpointNumber}>
                      <Text style={styles.checkpointNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.checkpointText}>{checkpoint}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button
            title={t('addTask.acceptPlan')}
            onPress={handleAccept}
            style={styles.acceptButton}
          />
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  goalText: {
    fontSize: 16,
    color: Colors.text.primary,
    lineHeight: 24,
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    backgroundColor: Colors.primary + '10',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
  },
  toolsContainer: {
    gap: 8,
  },
  toolItem: {
    backgroundColor: Colors.background.secondary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  toolText: {
    fontSize: 16,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  checkpointsContainer: {
    gap: 12,
  },
  checkpointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkpointNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkpointNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background.primary,
  },
  checkpointText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    gap: 12,
  },
  acceptButton: {
    marginBottom: 0,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
});