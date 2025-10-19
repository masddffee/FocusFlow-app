import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { X, ArrowRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
// 🔧 緊急修復：移除有問題的 logger 導入
import Colors from '@/constants/colors';
import Theme from '@/constants/theme';
import Button from '@/components/Button';
import { ClarifyingQuestion } from '@/types/task';

interface PersonalizationModalProps {
  visible: boolean;
  questions: ClarifyingQuestion[];
  responses: Record<string, string>;
  isAnalyzing: boolean;
  onClose: () => void;
  onResponseChange: (questionId: string, response: string) => void;
  onComplete: () => void;
  // 🆕 透明度提升屬性
  diagnosticInsight?: string; // AI的初始診斷洞察
  questioningStrategy?: string; // 提問策略說明
  sufficiencyReasoning?: string; // 判斷邏輯說明
}

export default function PersonalizationModal({
  visible,
  questions,
  responses,
  isAnalyzing,
  onClose,
  onResponseChange,
  onComplete,
  diagnosticInsight,
  questioningStrategy,
  sufficiencyReasoning
}: PersonalizationModalProps) {
  const { t } = useTranslation();

  const isComplete = questions.every(q => 
    !q.required || (responses[q.id] && responses[q.id].trim().length > 0)
  );

  const handleComplete = () => {
    onComplete();
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
            {t('addTask.personalizationTitle')}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.light.subtext} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.modalDescription}>
            {t('addTask.personalizationDescription')}
          </Text>
          
          {/* 🆕 AI 診斷洞察 */}
          {diagnosticInsight && (
            <View style={styles.insightContainer}>
              <View style={styles.insightHeader}>
                <Text style={styles.insightIcon}>🤖</Text>
                <Text style={styles.insightTitle}>AI Analysis:</Text>
              </View>
              <Text style={styles.insightText}>{diagnosticInsight}</Text>
            </View>
          )}
          
          {/* 🆕 提問策略說明 */}
          {questioningStrategy && (
            <View style={styles.strategyContainer}>
              <View style={styles.strategyHeader}>
                <Text style={styles.strategyIcon}>🎯</Text>
                <Text style={styles.strategyTitle}>Why these questions:</Text>
              </View>
              <Text style={styles.strategyText}>{questioningStrategy}</Text>
            </View>
          )}

          {questions.map((question, index) => (
            <View key={question.id} style={styles.questionContainer}>
              <Text style={styles.questionTitle}>
                {index + 1}. {question.question}
                {question.required && <Text style={styles.required}> *</Text>}
              </Text>
              
              {/* 🆕 問題原因說明 */}
              {question.rationale && (
                <View style={styles.rationaleContainer}>
                  <Text style={styles.rationaleText}>
                    💡 {question.rationale}
                  </Text>
                </View>
              )}
              
              {question.type === 'choice' && question.options ? (
                <View style={styles.optionsContainer}>
                  {question.options.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionButton,
                        responses[question.id] === option && styles.optionButtonSelected
                      ]}
                      onPress={() => onResponseChange(question.id, option)}
                    >
                      <Text style={[
                        styles.optionText,
                        responses[question.id] === option && styles.optionTextSelected
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <TextInput
                  style={styles.responseInput}
                  placeholder={t('addTask.personalizationPlaceholder')}
                  value={responses[question.id] || ''}
                  onChangeText={(text) => onResponseChange(question.id, text)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button
            title={isAnalyzing ? t('addTask.analyzing') : t('addTask.generateSubtasks')}
            onPress={handleComplete}
            disabled={!isComplete || isAnalyzing}
            icon={isAnalyzing ? undefined : ArrowRight}
            style={styles.completeButton}
          />
          {isAnalyzing && (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.analyzingText}>
                {t('addTask.analyzingYourNeeds')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: Colors.light.subtext,
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 12,
    lineHeight: 22,
  },
  required: {
    color: Colors.danger,
  },
  responseInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
    minHeight: 80,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  optionButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  optionText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  completeButton: {
    marginBottom: 12,
  },
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  analyzingText: {
    fontSize: 14,
    color: Colors.light.subtext,
  },
  // 🆕 透明度 UI 樣式
  insightContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6'
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  insightIcon: {
    fontSize: 16,
    marginRight: 8
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af'
  },
  insightText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20
  },
  strategyContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  strategyIcon: {
    fontSize: 14,
    marginRight: 6
  },
  strategyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563'
  },
  strategyText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16
  },
  rationaleContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
    marginBottom: 8
  },
  rationaleText: {
    fontSize: 11,
    color: '#92400e',
    lineHeight: 14,
    fontStyle: 'italic'
  },
});