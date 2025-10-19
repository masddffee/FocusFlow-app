import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet
} from 'react-native';
import { AlertCircle, X, Lightbulb, ArrowRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
// 🔧 緊急修復：移除有問題的 logger 導入
import Colors from '@/constants/colors';
import Theme from '@/constants/theme';
import Button from '@/components/Button';

interface QualityAlertProps {
  visible: boolean;
  issues: string[];
  onClose: () => void;
  onContinue: () => void;
  onImprove: () => void;
}

export default function QualityAlert({
  visible,
  issues,
  onClose,
  onContinue,
  onImprove
}: QualityAlertProps) {
  const { t } = useTranslation();

  const handleContinue = () => {
    onContinue();
  };

  const handleImprove = () => {
    onImprove();
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
          <View style={styles.headerLeft}>
            <AlertCircle size={24} color={Colors.warning} />
            <Text style={styles.modalTitle}>
              {t('addTask.qualityAlertTitle')}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.alertContainer}>
            <View style={styles.alertIcon}>
              <Lightbulb size={32} color={Colors.warning} />
            </View>
            
            <Text style={styles.alertMessage}>
              {t('addTask.qualityAlertMessage')}
            </Text>

            <View style={styles.issuesContainer}>
              <Text style={styles.issuesTitle}>
                {t('addTask.detectedIssues')}:
              </Text>
              {issues.map((issue, index) => (
                <View key={index} style={styles.issueItem}>
                  <View style={styles.issueBullet} />
                  <Text style={styles.issueText}>{issue}</Text>
                </View>
              ))}
            </View>

            <View style={styles.suggestionContainer}>
              <Text style={styles.suggestionTitle}>
                {t('addTask.suggestions')}:
              </Text>
              <View style={styles.suggestionList}>
                <View style={styles.suggestionItem}>
                  <Text style={styles.suggestionText}>
                    • {t('addTask.suggestion1')}
                  </Text>
                </View>
                <View style={styles.suggestionItem}>
                  <Text style={styles.suggestionText}>
                    • {t('addTask.suggestion2')}
                  </Text>
                </View>
                <View style={styles.suggestionItem}>
                  <Text style={styles.suggestionText}>
                    • {t('addTask.suggestion3')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button
            title={t('addTask.improveDescription')}
            onPress={handleImprove}
            style={styles.improveButton}
            icon={Lightbulb}
          />
          <TouchableOpacity onPress={handleContinue} style={styles.continueButton}>
            <Text style={styles.continueButtonText}>
              {t('addTask.continueAnyway')}
            </Text>
            <ArrowRight size={16} color={Colors.text.secondary} />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  alertContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  alertIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  alertMessage: {
    fontSize: 18,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  issuesContainer: {
    width: '100%',
    backgroundColor: Colors.warning + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  issuesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  issueBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
    marginTop: 8,
  },
  issueText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  suggestionContainer: {
    width: '100%',
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  suggestionList: {
    gap: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  suggestionText: {
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    gap: 12,
  },
  improveButton: {
    backgroundColor: Colors.primary,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
});