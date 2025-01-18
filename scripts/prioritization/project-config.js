const LABELS = {
  CORE: 'contribution/core',
  MAINTAINER_REVIEW: 'pr/needs-maintainer-review',
  COMMUNITY_REVIEW: 'pr/needs-community-review',
  CLARIFICATION_REQUESTED: 'pr/reviewer-clarification-requested',
  EXEMPTION_REQUESTED: 'pr-linter/exemption-requested'
};

const PRIORITIES = {
  R1: 'R1',
  R2: 'R2',
  R3: 'R3',
  R4: 'R4',
  R5: 'R5'
};

// Time threshold for R5
const DAYS_THRESHOLD = 1;

const ATTENTION_STATUS = {
  STALLED: {
    name: 'Stalled',
    threshold: 21,
    description: 'Critical attention required'
  },
  AGING: {
    name: 'Aging',
    threshold: 14,
    description: 'Requires immediate attention'
  },
  EXTENDED: {
    name: 'Extended',
    threshold: 7,
    description: 'Taking longer than expected'
  }
};

module.exports = {
  owner: "godwingrs22",
  repo: 'test-repo',
  projectNumber: 1,
  projectId: "PVT_kwHOAD1EYc4AwI4d",
  priorityFieldId: "PVTSSF_lAHOAD1EYc4AwI4dzgmdOIA",
  statusFieldId: "PVTSSF_lAHOAD1EYc4AwI4dzgmdOFc",
  attentionFieldId: "PVTSSF_lAHOAD1EYc4AwI4dzgmdOb0",
  LABELS,
  PRIORITIES,
  ATTENTION_STATUS,
  DAYS_THRESHOLD
};
