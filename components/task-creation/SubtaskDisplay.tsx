import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, Linking, Modal, ScrollView } from 'react-native';
import { Plus, Trash2, Clock, Edit3, BookOpen, ExternalLink, ChevronDown, ChevronUp, Play, CheckCircle2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/colors';
import { EnhancedSubtask, LearningPhase } from '@/types/task';

import { useTaskCreationStore } from '@/store/useTaskCreationStore';
import { getPhaseIcon, getPhaseLabel, getPhaseColor } from '@/utils/phaseUtils';
import { getPhaseStats, getTotalEstimatedTime } from '@/utils/subtaskUtils';
import { subtaskDisplayStyles as styles } from '@/styles/subtask-display-styles';
import { useSubtaskHandlers } from '@/hooks/useSubtaskHandlers';

interface SubtaskDisplayProps {
  // Display options
  showTimeEstimate?: boolean;
  showPhaseDistribution?: boolean;

  // 🎯 Phase 3: 增強的展示控制
  allowExpansion?: boolean;
  showActionButtons?: boolean;
  onSubtaskAction?: (subtaskId: string, action: 'start' | 'complete' | 'resources') => void;
}

const SubtaskDisplay: React.FC<SubtaskDisplayProps> = ({
  showTimeEstimate = true,
  showPhaseDistribution = true,
  // 🎯 Phase 3: 默認啟用增強功能
  allowExpansion = true,
  showActionButtons = true,
  onSubtaskAction
}) => {
  const { t } = useTranslation();
  const {
    subtasks,
    newSubtask,
    editingSubtaskId,
    setSubtasks,
    setNewSubtask,
    setEditingSubtaskId
  } = useTaskCreationStore();

  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [selectedResource, setSelectedResource] = useState<{ subtask: EnhancedSubtask; resources: string[] } | null>(null);

  const {
    tempDuration,
    setTempDuration,
    handleAddSubtask,
    handleRemoveSubtask,
    handleStartEditDuration,
    handleSaveDuration,
    handleCancelEditDuration
  } = useSubtaskHandlers({
    subtasks,
    newSubtask,
    setSubtasks,
    setNewSubtask,
    setEditingSubtaskId,
    t
  });

  if (subtasks.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('addTask.subtasks')}</Text>
          <View style={styles.addSubtaskContainer}>
            <TextInput
              style={styles.subtaskInput}
              value={newSubtask}
              onChangeText={setNewSubtask}
              placeholder={t('addTask.addSubtask')}
              placeholderTextColor={Colors.light.subtext}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddSubtask}
            >
              <Plus size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {t('addTask.generatedSubtasks')} ({subtasks.length})
        </Text>

        {/* Time Estimate */}
        {showTimeEstimate && (
          <View style={styles.timeEstimateContainer}>
            <Text style={styles.timeEstimateText}>
              Total estimated time: {getTotalEstimatedTime(subtasks)} minutes ({Math.round(getTotalEstimatedTime(subtasks) / 60 * 10) / 10} hours)
            </Text>
          </View>
        )}

        {/* Phase Distribution */}
        {showPhaseDistribution && subtasks.some(s => s.phase) && (
          <View style={styles.phaseDistributionContainer}>
            <Text style={styles.phaseDistributionTitle}>Learning Phase Distribution</Text>
            <View style={styles.phaseDistribution}>
              {Object.entries(getPhaseStats(subtasks)).map(([phase, count]) => (
                count > 0 && (
                  <View key={phase} style={styles.phaseDistributionItem}>
                    <View style={[
                      styles.phaseDistributionDot,
                      { backgroundColor: getPhaseColor(phase) }
                    ]} />
                    <Text style={styles.phaseDistributionText}>
                      {getPhaseLabel(phase, t)}: {count}
                    </Text>
                  </View>
                )
              ))}
            </View>
          </View>
        )}

        {/* 🎯 Phase 3: 增強的子任務列表 */}
        {subtasks.map((subtask) => {
          const isExpanded = expandedSubtasks.has(subtask.id);

          return (
            <View key={subtask.id} style={styles.subtaskCard}>
              <View style={styles.subtaskContent}>
                <View style={styles.subtaskHeader}>
                  <View style={styles.titleRow}>
                    {subtask.title && (
                      <Text style={styles.subtaskTitle}>
                        {getPhaseIcon(subtask.phase)} {subtask.title}
                      </Text>
                    )}
                    {allowExpansion && (
                      <TouchableOpacity
                        onPress={() => {
                          const newExpanded = new Set(expandedSubtasks);
                          if (isExpanded) {
                            newExpanded.delete(subtask.id);
                          } else {
                            newExpanded.add(subtask.id);
                          }
                          setExpandedSubtasks(newExpanded);
                        }}
                        style={styles.expandButton}
                      >
                        {isExpanded ?
                          <ChevronUp size={16} color={Colors.light.subtext} /> :
                          <ChevronDown size={16} color={Colors.light.subtext} />
                        }
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.badgeRow}>
                    {subtask.taskType === "exam_preparation" && (
                      <View style={styles.examBadge}>
                        <Text style={styles.examBadgeText}>Exam</Text>
                      </View>
                    )}
                    {subtask.isReviewTask && (
                      <View style={styles.reviewBadge}>
                        <Text style={styles.reviewBadgeText}>Review</Text>
                      </View>
                    )}
                  </View>
                </View>

                <Text style={styles.subtaskText} numberOfLines={isExpanded ? 0 : 3}>
                  {subtask.text}
                </Text>

                {/* 🎯 Phase 3: 快速操作按鈕 */}
                {showActionButtons && (
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => onSubtaskAction?.(subtask.id, 'start')}
                    >
                      <Play size={12} color={Colors.light.primary} />
                      <Text style={styles.actionButtonText}>開始</Text>
                    </TouchableOpacity>

                    {subtask.recommendedResources && subtask.recommendedResources.length > 0 && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setSelectedResource({ subtask, resources: subtask.recommendedResources })}
                      >
                        <BookOpen size={12} color={Colors.light.primary} />
                        <Text style={styles.actionButtonText}>資源</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => onSubtaskAction?.(subtask.id, 'complete')}
                    >
                      <CheckCircle2 size={12} color={Colors.light.success} />
                      <Text style={styles.actionButtonText}>完成</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* 🎯 Phase 3: 展開的操作指引 */}
                {isExpanded && (subtask.howToStart || subtask.successCriteria || subtask.nextSteps) && (
                  <View style={styles.guidanceContainer}>
                    {subtask.howToStart && (
                      <View style={styles.guidanceItem}>
                        <View style={styles.guidanceHeader}>
                          <Text style={styles.guidanceIcon}>🚀</Text>
                          <Text style={styles.guidanceTitle}>How to Start:</Text>
                        </View>
                        <Text style={styles.guidanceText}>{subtask.howToStart}</Text>
                      </View>
                    )}

                    {subtask.successCriteria && (
                      <View style={styles.guidanceItem}>
                        <View style={styles.guidanceHeader}>
                          <Text style={styles.guidanceIcon}>✅</Text>
                          <Text style={styles.guidanceTitle}>Success Criteria:</Text>
                        </View>
                        <Text style={styles.guidanceText}>{subtask.successCriteria}</Text>
                      </View>
                    )}

                    {subtask.nextSteps && (
                      <View style={styles.guidanceItem}>
                        <View style={styles.guidanceHeader}>
                          <Text style={styles.guidanceIcon}>➡️</Text>
                          <Text style={styles.guidanceTitle}>Next Steps:</Text>
                        </View>
                        <Text style={styles.guidanceText}>{subtask.nextSteps}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* 🎯 Phase 3: 展開的資源預覽 */}
                {isExpanded && subtask.recommendedResources && subtask.recommendedResources.length > 0 && (
                  <View style={styles.resourcesContainer}>
                    <View style={styles.resourcesHeader}>
                      <BookOpen size={12} color={Colors.light.primary} />
                      <Text style={styles.resourcesTitle}>推薦資源:</Text>
                      <TouchableOpacity
                        onPress={() => setSelectedResource({ subtask, resources: subtask.recommendedResources })}
                        style={styles.viewAllResourcesButton}
                      >
                        <Text style={styles.viewAllResourcesText}>查看全部</Text>
                      </TouchableOpacity>
                    </View>
                    {subtask.recommendedResources.slice(0, 3).map((resource, index) => (
                      <View key={`${subtask.id}-resource-${index}`} style={styles.resourceItem}>
                        <ExternalLink size={10} color={Colors.light.subtext} />
                        <Text style={styles.resourceText}>{resource}</Text>
                      </View>
                    ))}
                    {subtask.recommendedResources.length > 3 && (
                      <Text style={styles.moreResourcesText}>
                        +{subtask.recommendedResources.length - 3} more resources
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.subtaskMeta}>
                  <View style={styles.subtaskDuration}>
                    <Clock size={12} color={Colors.light.subtext} />
                    {editingSubtaskId === subtask.id ? (
                      <View style={styles.durationEditContainer}>
                        <TextInput
                          style={styles.durationInput}
                          value={tempDuration}
                          onChangeText={setTempDuration}
                          keyboardType="numeric"
                          placeholder="60"
                          autoFocus
                        />
                        <TouchableOpacity
                          onPress={() => handleSaveDuration(subtask.id)}
                          style={styles.durationSaveButton}
                        >
                          <Text style={styles.durationSaveText}>✓</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleCancelEditDuration}
                          style={styles.durationCancelButton}
                        >
                          <Text style={styles.durationCancelText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleStartEditDuration(subtask)}
                        style={styles.durationDisplayContainer}
                      >
                        <Text style={styles.subtaskDurationText}>
                          {subtask.estimatedDuration || 30} min
                        </Text>
                        <Edit3 size={10} color={Colors.light.subtext} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => handleRemoveSubtask(subtask.id)}
                    style={styles.removeButton}
                  >
                    <Trash2 size={16} color={Colors.light.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {/* Add New Subtask */}
        <View style={styles.addSubtaskContainer}>
          <TextInput
            style={styles.subtaskInput}
            value={newSubtask}
            onChangeText={setNewSubtask}
            placeholder={t('addTask.addSubtask')}
            placeholderTextColor={Colors.light.subtext}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddSubtask}
          >
            <Plus size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 🎯 Phase 3: 資源詳情 Modal */}
      <Modal
        visible={selectedResource !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedResource(null)}
      >
        {selectedResource && (
          <View style={styles.resourceModalContainer}>
            <View style={styles.resourceModalHeader}>
              <Text style={styles.resourceModalTitle}>
                學習資源 - {selectedResource.subtask.title || '子任務'}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedResource(null)}
                style={styles.resourceModalClose}
              >
                <Text style={styles.resourceModalCloseText}>完成</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.resourceModalContent}>
              {selectedResource.resources.map((resource, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.resourceModalItem}
                  onPress={() => {
                    // 嘗試開啟連結
                    const urlRegex = /https?:\/\/[^\s]+/;
                    const match = resource.match(urlRegex);
                    if (match) {
                      Linking.openURL(match[0]).catch(() => {
                        Alert.alert('錯誤', '無法開啟此連結');
                      });
                    }
                  }}
                >
                  <View style={styles.resourceModalItemContent}>
                    <Text style={styles.resourceModalItemTitle}>
                      資源 {index + 1}
                    </Text>
                    <Text style={styles.resourceModalItemText}>
                      {resource}
                    </Text>
                  </View>
                  <ExternalLink size={16} color={Colors.light.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
};

export default SubtaskDisplay;