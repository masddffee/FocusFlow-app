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
import { log } from '@/lib/logger';
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
}

export default function PersonalizationModal({
  visible,
  questions,
  responses,
  isAnalyzing,
  onClose,
  onResponseChange,
  onComplete
}: PersonalizationModalProps) {
  const { t } = useTranslation();

  const isComplete = questions.every(q => 
    !q.required || (responses[q.id] && responses[q.id].trim().length > 0)
  );

  const handleComplete = () => {
    log.info('Personalization questions completed', { 
      questionCount: questions.length,
      responseCount: Object.keys(responses).length 
    });
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
            <X size={24} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.modalDescription}>
            {t('addTask.personalizationDescription')}
          </Text>

          {questions.map((question, index) => (
            <View key={question.id} style={styles.questionContainer}>
              <Text style={styles.questionTitle}>
                {index + 1}. {question.question}
                {question.required && <Text style={styles.required}> *</Text>}
              </Text>
              
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
  modalDescription: {
    fontSize: 16,
    color: Colors.text.secondary,
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
    color: Colors.text.primary,
    marginBottom: 12,
    lineHeight: 22,
  },
  required: {
    color: Colors.danger,
  },
  responseInput: {
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text.primary,
    backgroundColor: Colors.background.secondary,
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
    borderColor: Colors.border.default,
    backgroundColor: Colors.background.secondary,
  },
  optionButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  optionText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
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
    color: Colors.text.secondary,
  },
});