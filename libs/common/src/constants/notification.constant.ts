export const NotificationConstants = {
  Custom: {
    title: '',
    body: '',
    notification_type: 0,
  },
  PlanStartDateComing: {
    title: 'Plan Start Alert',
    body: 'The plan "{{title}}" starts in {{days}} day(s)',
    notification_type: 10,
  },
  PlanOwnerAssigned: {
    title: 'Plan Owner Added',
    body: 'You have been added as owner to "{{title}}" plan',
    notification_type: 11,
  },
  PlanTeamAssigned: {
    title: 'Plan Team Added',
    body: 'You have been added to "{{title}}" plan team',
    notification_type: 12,
  },
  PlanOwnerRemoved: {
    title: 'Plan Owner Removed',
    body: 'You have been removed as owner of "{{title}}" plan',
    notification_type: 13,
  },
  PlanTeamRemoved: {
    title: 'Plan Team Removed',
    body: 'You have been removed from "{{title}}" plan team',
    notification_type: 14,
  },
  PlanStatusChanged: {
    title: 'Plan Status Changed',
    body: '"{{title}}" plan status has changed to "{{status}}"',
    notification_type: 15,
  },
  PlanDuplicated: {
    title: 'Plan Duplicated',
    body: 'A "{{newTitle}}" plan is created as a duplicate of "{{title}}"',
    notification_type: 16,
  },
  EntityAddedToPlan: {
    title: 'Plan Updated',
    body: '{{entity}} "{{entityName}}" has been added to the plan "{{planName}}"',
    notification_type: 17,
  },
  EntityRemovedFromPlan: {
    title: 'Plan Updated',
    body: '{{entity}} "{{entityName}}" has been removed from the plan "{{planName}}"',
    notification_type: 18,
  },
  PlanUpdated: {
    title: 'Plan Updated',
    body: 'Plan "{{title}}" has been updated',
    notification_type: 19,
  },
  CommunicationStartDateComing: {
    title: 'Communication Start Alert',
    body: 'The communication "{{title}}" starts in {{days}} day(s)',
    notification_type: 20,
  },
  CommunicationOwnerAssigned: {
    title: 'Communication Owner Added',
    body: 'You have been added as owner to "{{title}}" communication',
    notification_type: 21,
  },
  CommunicationTeamAssigned: {
    title: 'Communication Team Added',
    body: 'You have been added to "{{title}}" communication team',
    notification_type: 22,
  },
  CommunicationOwnerUnassigned: {
    title: 'Communication Owner Removed',
    body: 'You have been removed as owner of "{{title}}" communication',
    notification_type: 23,
  },
  CommunicationTeamUnassigned: {
    title: 'Communication Team Removed',
    body: 'You have been removed from "{{title}}" communication team',
    notification_type: 24,
  },
  CommunicationStatusChanged: {
    title: 'Communication Status Changed',
    body: 'Communication "{{title}}" status has changed to "{{status}}"',
    notification_type: 25,
  },
  CommunicationDuplicated: {
    title: 'Communication Duplicated',
    body: 'A "{{newTitle}}" communication is created as a duplicate of "{{title}}"',
    notification_type: 26,
  },
  EntityAddedToCommunication: {
    title: 'Communication Updated',
    body: '{{entity}} "{{entityName}}" has been added to the communication "{{communicationName}}"',
    notification_type: 27,
  },
  EntityRemovedFromCommunication: {
    title: 'Communication Updated',
    body: '{{entity}} "{{entityName}}" has been removed from the communication "{{communicationName}}"',
    notification_type: 28,
  },
  TaskDueDateComing: {
    title: 'Task Due Alert',
    body: 'The task "{{name}}" is due in {{days}} day(s)',
    notification_type: 30,
  },
  TaskAssigned: {
    title: 'Task Assigned',
    body: 'You have been assigned to task "{{name}}"',
    notification_type: 31,
  },
  TaskUnassigned: {
    title: 'Task Removed',
    body: 'You have been removed from task "{{name}}"',
    notification_type: 32,
  },
  TaskStatusChanged: {
    title: 'Task Status Changed',
    body: 'Task "{{name}}" status is changed to {{status}}',
    notification_type: 33,
  },
  TaskOverDue: {
    title: 'Task Overdue',
    body: 'The task "{{name}}" is overdue',
    notification_type: 34,
  },
  UserRoleChanged: {
    title: 'Permission Changed',
    body: 'Your permission type has been changed from {{old}} to {{new}}',
    notification_type: 40,
  },
  MediaContactAdded: {
    title: 'Media Contact Added',
    body: 'You have been added as a contact in the media contact information for {{location}}',
    notification_type: 50,
  },
  MediaContactRemoved: {
    title: 'Media Contact Removed',
    body: 'You have been removed as a contact in the media contact information for {{location}}',
    notification_type: 51,
  },
  MediaContactUpdated: {
    title: 'Media Contact Updated',
    body: 'Your area in media contact information has been updated from {{oldLocation}} to {{newLocation}}',
    notification_type: 52,
  },
  SubscriptionPaymentFailed: {
    title: "Subscription Payment Failed",
    body: "Your subscription payment{{cardInfo}} has failed. Please update your payment method.",
    notification_type: 60,
  },
  RiskAssigned: {
    title: 'Risk Assigned',
    body: 'You have been assigned to risk "{{title}}"',
    notification_type: 70,
  },
  RiskUnassigned: {
    title: 'Risk Unassigned',
    body: 'You have been removed from risk "{{title}}"',
    notification_type: 71,
  },
  TaggedInComment: {
    title: 'You are tagged in a comment',
    body: 'You have been tagged in a comment of {{entity}} "{{title}}"',
    notification_type: 80,
  }
};
export type NotificationConstant =
  (typeof NotificationConstants)[keyof typeof NotificationConstants];
