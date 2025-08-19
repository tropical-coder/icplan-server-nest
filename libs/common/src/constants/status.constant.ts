
// structure: { databaseKey: displayName }
const defaultPlanStatuses = {
  planned: "Planned",
  in_progress: "In Progress",
  complete: "Complete",
  cancelled: "Cancelled",
  archived: "Archived",
};

const tflPlanStatuses = {
  planned: "Planning",
  in_progress: "Communications in progress",
  complete: "Complete",
  paused: "Paused",
  cancelled: "Cancelled",
  archived: "Archived",
};

const defaultCommunicationStatuses = {
  planned: "Planned",
  in_progress: "In Progress",
  complete: "Complete",
  cancelled: "Cancelled",
  archived: "Archived",
};

const tflCommunicationStatuses = {
  planned: "Planning",
  channel_awaiting_approval: "Channel - awaiting approval",
  copy_awaiting_approval: "Copy - awaiting approval",
  channel_approved: "Channel - approved",
  copy_approved: "Copy - approved",
  query_not_approved: "Query/Not approved",
  in_progress: "Communication in progress",
  complete: "Complete",
  paused: "Paused",
  cancelled: "Cancelled",
  archived: "Archived",
};

export const statusConfig = {
  plan: {
    default: defaultPlanStatuses,
    tfl: tflPlanStatuses,
  },
  communication: {
    default: defaultCommunicationStatuses,
    tfl: tflCommunicationStatuses,
  },
};
