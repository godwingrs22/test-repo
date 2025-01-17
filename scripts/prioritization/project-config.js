const PRIORITIES = {
  R1: {
    name: "R1",
    description: "PRs from the team",
    label: "contribution/core",
  },
  R2: {
    name: "R2",
    description: "Already approved PRs but stuck in the automation",
    label: "pr/approved",
  },
  R3: {
    name: "R3",
    description: "PRs that needs maintainer review",
    label: "pr/needs-maintainer-review",
  },
  R4: {
    name: "R4",
    description: "PRs that needs clarification or exemption",
    labels: [
      "pr/reviewer-clarification-requested",
      "pr-linter/exemption-requested",
    ],
  },
  R5: {
    name: "R5",
    description: "PRs that are in needs-community-review more than 21 days",
    label: "pr/needs-community-review",
    daysThreshold: 1,
  },
};

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
  PRIORITIES,
  ATTENTION_STATUS
};
