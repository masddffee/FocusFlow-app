import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, Linking, Modal, ScrollView } from 'react-native';
import { Plus, Trash2, Clock, Edit3, BookOpen, ExternalLink, ChevronDown, ChevronUp, Play, CheckCircle2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/colors';
import { EnhancedSubtask, LearningPhase } from '@/types/task';

interface SubtaskDisplayProps {
  subtasks: EnhancedSubtask[];
  newSubtask: string;
  onNewSubtaskChange: (text: string) => void;
  onAddSubtask: () => void;
  onRemoveSubtask: (id: string) => void;
  
  // Duration editing
  editingSubtaskId: string | null;
  tempDuration: string;
  onStartEditDuration: (subtask: EnhancedSubtask) => void;
  onDurationChange: (duration: string) => void;
  onSaveDuration: (subtaskId: string) => void;
  onCancelEditDuration: () => void;
  
  // Display options
  showTimeEstimate?: boolean;
  showPhaseDistribution?: boolean;
  
  // 🎯 Phase 3: 增強的展示控制
  allowExpansion?: boolean;
  showActionButtons?: boolean;
  onSubtaskAction?: (subtaskId: string, action: 'start' | 'complete' | 'resources') => void;
}

const SubtaskDisplay: React.FC<SubtaskDisplayProps> = ({
  subtasks,
  newSubtask,
  onNewSubtaskChange,
  onAddSubtask,
  onRemoveSubtask,
  editingSubtaskId,
  tempDuration,
  onStartEditDuration,
  onDurationChange,
  onSaveDuration,
  onCancelEditDuration,
  showTimeEstimate = true,
  showPhaseDistribution = true,
  // 🎯 Phase 3: 默認啟用增強功能
  allowExpansion = true,
  showActionButtons = true,
  onSubtaskAction
}) => {
  const { t } = useTranslation();
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [selectedResource, setSelectedResource] = useState<{ subtask: EnhancedSubtask; resources: string[] } | null>(null);

  const getPhaseIcon = (phase?: LearningPhase) => {
    const icons = {
      'introduction': '📖',
      'practice': '✏️',
      'application': '🚀',
      'review': '🔄',
      'assessment': '📝'
    };
    return phase ? icons[phase] || '📋' : '📋';
  };

  const getPhaseLabel = (phase?: LearningPhase) => {
    const labels = {
      'introduction': '入門',
      'practice': '練習',
      'application': '應用',
      'review': '復習',
      'assessment': '評估'
    };
    return phase ? labels[phase] || '一般' : '一般';
  };

  const getPhaseColor = (phase?: LearningPhase) => {
    const colors = {
      'introduction': '#3b82f6',
      'practice': '#10b981',
      'application': '#f59e0b',
      'review': '#8b5cf6',
      'assessment': '#ef4444'
    };
    return phase ? colors[phase] || Colors.light.primary : Colors.light.primary;
  };

  const getPhaseStats = () => {
    const stats: Record<string, number> = {};
    subtasks.forEach(subtask => {
      const phase = subtask.phase || 'general';
      stats[phase] = (stats[phase] || 0) + 1;
    });
    return stats;
  };

  const getTotalEstimatedTime = () => {
    return subtasks.reduce((total, subtask) => total + (subtask.estimatedDuration || 30), 0);
  };

  if (subtasks.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('addTask.subtasks')}</Text>
          <View style={styles.addSubtaskContainer}>
            <TextInput
              style={styles.subtaskInput}
              value={newSubtask}
              onChangeText={onNewSubtaskChange}
              placeholder={t('addTask.addSubtask')}
              placeholderTextColor={Colors.light.subtext}
            />
            <TouchableOpacity 
              style={styles.addButton}
              onPress={onAddSubtask}
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
              Total estimated time: {getTotalEstimatedTime()} minutes ({Math.round(getTotalEstimatedTime() / 60 * 10) / 10} hours)
            </Text>
          </View>
        )}

        {/* Phase Distribution */}
        {showPhaseDistribution && subtasks.some(s => s.phase) && (
          <View style={styles.phaseDistributionContainer}>
            <Text style={styles.phaseDistributionTitle}>Learning Phase Distribution</Text>
            <View style={styles.phaseDistribution}>
              {Object.entries(getPhaseStats()).map(([phase, count]) => (
                count > 0 && (
                  <View key={phase} style={styles.phaseDistributionItem}>
                    <View style={[
                      styles.phaseDistributionDot,
                      { backgroundColor: getPhaseColor(phase as LearningPhase) }
                    ]} />
                    <Text style={styles.phaseDistributionText}>
                      {getPhaseLabel(phase as LearningPhase)}: {count}
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
                    <Play size={12} color={Colors.primary} />
                    <Text style={styles.actionButtonText}>開始</Text>
                  </TouchableOpacity>
                  
                  {subtask.recommendedResources && subtask.recommendedResources.length > 0 && (
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => setSelectedResource({ subtask, resources: subtask.recommendedResources })}
                    >
                      <BookOpen size={12} color={Colors.primary} />
                      <Text style={styles.actionButtonText}>資源</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => onSubtaskAction?.(subtask.id, 'complete')}
                  >
                    <CheckCircle2 size={12} color={Colors.success} />
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
                        onChangeText={onDurationChange}
                        keyboardType="numeric"
                        placeholder="60"
                        autoFocus
                      />
                      <TouchableOpacity
                        onPress={() => onSaveDuration(subtask.id)}
                        style={styles.durationSaveButton}
                      >
                        <Text style={styles.durationSaveText}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={onCancelEditDuration}
                        style={styles.durationCancelButton}
                      >
                        <Text style={styles.durationCancelText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => onStartEditDuration(subtask)}
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
                  onPress={() => onRemoveSubtask(subtask.id)}
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
            onChangeText={onNewSubtaskChange}
            placeholder={t('addTask.addSubtask')}
            placeholderTextColor={Colors.light.subtext}
          />
          <TouchableOpacity 
            style={styles.addButton}
            onPress={onAddSubtask}
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
                  <ExternalLink size={16} color={Colors.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%'
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8
  },
  timeEstimateContainer: {
    backgroundColor: '#f0f9ff',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12
  },
  timeEstimateText: {
    fontSize: 12,
    color: '#0369a1',
    textAlign: 'center'
  },
  phaseDistributionContainer: {
    marginBottom: 16
  },
  phaseDistributionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 8
  },
  phaseDistribution: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  phaseDistributionItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  phaseDistributionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4
  },
  phaseDistributionText: {
    fontSize: 12,
    color: Colors.light.subtext
  },
  subtaskCard: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.light.background
  },
  subtaskContent: {
    padding: 12
  },
  subtaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  subtaskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1
  },
  examBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8
  },
  examBadgeText: {
    fontSize: 10,
    color: '#92400e',
    fontWeight: '500'
  },
  reviewBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8
  },
  reviewBadgeText: {
    fontSize: 10,
    color: '#3730a3',
    fontWeight: '500'
  },
  subtaskText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: 8
  },
  resourcesContainer: {
    marginBottom: 8
  },
  resourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  resourcesTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.primary,
    marginLeft: 4
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    marginLeft: 16
  },
  resourceText: {
    fontSize: 11,
    color: Colors.light.subtext,
    marginLeft: 4,
    flex: 1
  },
  moreResourcesText: {
    fontSize: 11,
    color: Colors.light.subtext,
    fontStyle: 'italic',
    marginLeft: 16
  },
  subtaskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  subtaskDuration: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  durationEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4
  },
  durationInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 12,
    width: 50,
    textAlign: 'center'
  },
  durationSaveButton: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: Colors.light.success,
    borderRadius: 4
  },
  durationSaveText: {
    color: 'white',
    fontSize: 12
  },
  durationCancelButton: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: Colors.light.error,
    borderRadius: 4
  },
  durationCancelText: {
    color: 'white',
    fontSize: 12
  },
  durationDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4
  },
  subtaskDurationText: {
    fontSize: 12,
    color: Colors.light.subtext,
    marginRight: 4
  },
  removeButton: {
    padding: 4
  },
  addSubtaskContainer: {
    flexDirection: 'row',
    marginTop: 8
  },
  subtaskInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.light.text
  },
  addButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  // 🎯 Phase 3: 增強的標題行樣式
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4
  },
  expandButton: {
    padding: 4,
    marginLeft: 8
  },
  
  // 🎯 Phase 3: 操作按鈕樣式
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4
  },
  actionButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500'
  },
  
  // 🎯 Phase 3: 資源查看按鈕
  viewAllResourcesButton: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  viewAllResourcesText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500'
  },
  
  // 🎯 Phase 3: 資源 Modal 樣式
  resourceModalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background
  },
  resourceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border
  },
  resourceModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1
  },
  resourceModalClose: {
    padding: 4
  },
  resourceModalCloseText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500'
  },
  resourceModalContent: {
    flex: 1,
    padding: 20
  },
  resourceModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border
  },
  resourceModalItemContent: {
    flex: 1
  },
  resourceModalItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4
  },
  resourceModalItemText: {
    fontSize: 13,
    color: Colors.light.subtext,
    lineHeight: 18
  },
  
  // 🆕 Guidance styles
  guidanceContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.primary
  },
  guidanceItem: {
    marginBottom: 8
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  guidanceIcon: {
    fontSize: 12,
    marginRight: 6
  },
  guidanceTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary
  },
  guidanceText: {
    fontSize: 12,
    color: Colors.light.text,
    lineHeight: 16,
    marginLeft: 18
  }
});

export default SubtaskDisplay;