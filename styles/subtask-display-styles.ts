import { StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

export const subtaskDisplayStyles = StyleSheet.create({
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
  // Phase 3: Enhanced title row styles
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

  // Phase 3: Action button styles
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary + '10',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4
  },
  actionButtonText: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '500'
  },

  // Phase 3: Resource view button
  viewAllResourcesButton: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  viewAllResourcesText: {
    fontSize: 11,
    color: Colors.light.primary,
    fontWeight: '500'
  },

  // Phase 3: Resource modal styles
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
    color: Colors.light.primary,
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

  // Guidance styles
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
