const { PRIORITIES, LABELS, STATUS, ...PROJECT_CONFIG } = require('../../../../scripts/prioritization/project-config');

/**
 * Creates a mock PR with specified properties
 */
exports.createMockPR = ({
  number = 123,
  node_id = 'PR_123',
  draft = false,
  labels = [],
  updatedAt = new Date().toISOString(),
  reviews = [],
  checksState = 'SUCCESS'
}) => ({
  number,
  node_id,
  draft,
  labels: labels.map(name => ({ name })),
  updatedAt,
  reviews: { nodes: reviews },
  commits: {
    nodes: [{
      commit: {
        statusCheckRollup: { state: checksState }
      }
    }]
  }
});

const OPTION_IDS = {
  [PRIORITIES.R1]: 'r1-option-id',
  [PRIORITIES.R2]: 'r2-option-id',
  [PRIORITIES.R3]: 'r3-option-id',
  [PRIORITIES.R4]: 'r4-option-id',
  [PRIORITIES.R5]: 'r5-option-id',
  [STATUS.READY]: 'ready-status-id',
  [STATUS.IN_PROGRESS]: 'in_progress-status-id',
  [STATUS.PAUSED]: 'paused-status-id',
  [STATUS.ASSIGNED]: 'assigned-status-id',
  [STATUS.DONE]: 'done-status-id'
};

exports.createMockProjectItemResponse = ({ 
  itemId = 'new-item-id', 
  priority = null, 
  status = null,
  exists = true 
}) => {
  console.log('Creating mock response with:', { priority, status, exists });  // Add debug log
  return {
    node: {
      projectItems: {
        nodes: exists ? [{
          id: itemId,
          fieldValues: {
            nodes: [
              {
                field: { name: 'Priority' },
                name: priority
              },
              {
                field: { name: 'Status' },
                name: status
              }
            ]
          }
        }] : []
      }
    }
  };
};


/**
 * Creates mock GitHub GraphQL client with predefined responses
 */
exports.createMockGithub = () => {
  const graphql = jest.fn();

  graphql
    // First call - fetch project fields
    .mockResolvedValueOnce({
      viewer: {
        projectV2: {
          fields: {
            nodes: [
              {
                id: PROJECT_CONFIG.priorityFieldId,
                name: 'Priority',
                options: Object.values(PRIORITIES).map(priority => ({
                  id: OPTION_IDS[priority],
                  name: priority
                }))
              },
              {
                id: PROJECT_CONFIG.statusFieldId,
                name: 'Status',
                options: [
                  { id: OPTION_IDS[STATUS.READY], name: 'Ready' }
                ]
              }
            ]
          }
        }
      }
    })
    // Second call - add item to project
    .mockResolvedValueOnce({
      addProjectV2ItemById: {
        item: { id: 'new-item-id' }
      }
    })
    // Third call - update priority
    .mockResolvedValueOnce({
      updateProjectV2ItemFieldValue: {
        projectV2Item: { id: 'new-item-id' }
      }
    })
    // Fourth call - update status
    .mockResolvedValueOnce({
      updateProjectV2ItemFieldValue: {
        projectV2Item: { id: 'new-item-id' }
      }
    });

  return { graphql };
};

/**
 * Creates mock GitHub GraphQL client with predefined responses for R5 priority
 */
exports.createMockGithubForR5 = ({ 
  draft = false, 
  labels = [], 
  updatedAt = new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
  existingPriority = null 
}) => {
  const graphql = jest.fn();

  // Common responses
  const projectFields = {
    viewer: {
      projectV2: {
        fields: {
          nodes: [
            {
              id: PROJECT_CONFIG.priorityFieldId,
              name: 'Priority',
              options: Object.values(PRIORITIES).map(priority => ({
                id: OPTION_IDS[priority],
                name: priority
              }))
            },
            {
              id: PROJECT_CONFIG.statusFieldId,
              name: 'Status',
              options: Object.values(STATUS).map(status => ({
                id: OPTION_IDS[status],
                name: status
            }))
            }
          ]
        }
      }
    }
  };

  // Set up mock responses in sequence
  graphql
    // First call - fetch open PRs
    .mockResolvedValueOnce({
      repository: {
        pullRequests: {
          nodes: [{
            id: 'PR_123',
            number: 123,
            draft,
            updatedAt,
            labels: {
              nodes: labels.map(label => ({ name: label }))
            }
          }],
          pageInfo: {
            hasNextPage: false,
            endCursor: null
          }
        }
      }
    })
    // Second call - fetch project fields
    .mockResolvedValueOnce(projectFields)
    // Third call - fetchProjectItem (check if PR is in project)
    .mockResolvedValueOnce({
      node: {
        projectItems: {
            nodes: existingPriority ? [{
                id: 'existing-item-id',
                project: {
                    id: PROJECT_CONFIG.projectId
                },
                fieldValues: {
                    nodes: [{
                        field: { name: 'Priority' },
                        name: existingPriority
                    }]
                }
            }] : []
        }
      }
    })
    // Fourth call - add item to project
    .mockResolvedValueOnce({
      addProjectV2ItemById: {
        item: { id: 'new-item-id' }
      }
    })
    // Fifth and Sixth calls - update priority and status
    .mockResolvedValueOnce({
      updateProjectV2ItemFieldValue: {
        projectV2Item: { id: 'new-item-id' }
      }
    })
    .mockResolvedValueOnce({
      updateProjectV2ItemFieldValue: {
        projectV2Item: { id: 'new-item-id' }
      }
    });

  return { graphql };
};

/**
 * Creates mock GitHub GraphQL client with predefined responses for R2 priority
 */
exports.createMockGithubForR2 = ({ 
  approved = false,
  checksState = 'SUCCESS',
  existingPriority = null,
  existingStatus = STATUS.READY
}) => {
  const graphql = jest.fn();

  // Common project fields response
  const projectFields = {
      viewer: {
          projectV2: {
              fields: {
                  nodes: [
                      {
                          id: PROJECT_CONFIG.priorityFieldId,
                          name: 'Priority',
                          options: Object.values(PRIORITIES).map(priority => ({
                              id: OPTION_IDS[priority],
                              name: priority
                          }))
                      },
                      {
                          id: PROJECT_CONFIG.statusFieldId,
                          name: 'Status',
                          options: Object.values(STATUS).map(status => ({
                            id: OPTION_IDS[status],
                            name: status
                        }))
                      }
                  ]
              }
          }
      }
  };

  // Set up mock responses in sequence
  graphql
      // First call - fetch open PRs
      .mockResolvedValueOnce({
          repository: {
              pullRequests: {
                  nodes: [{
                      id: 'PR_123',
                      number: 123,
                      reviews: {
                          nodes: approved ? [
                              { state: 'APPROVED' }
                          ] : []
                      },
                      commits: {
                          nodes: [{
                              commit: {
                                  statusCheckRollup: {
                                      state: checksState
                                  }
                              }
                          }]
                      }
                  }],
                  pageInfo: {
                      hasNextPage: false,
                      endCursor: null
                  }
              }
          }
      })
      // Second call - fetch project fields
      .mockResolvedValueOnce(projectFields)
      // Third call - check if PR is in project
      .mockResolvedValueOnce({
          node: {
              projectItems: {
                  nodes: existingPriority ? [{
                      id: 'existing-item-id',
                      project: {
                          id: PROJECT_CONFIG.projectId
                      },
                      fieldValues: {
                          nodes: [
                              {
                                  field: { name: 'Priority' },
                                  name: existingPriority
                              },
                              {
                                  field: { name: 'Status' },
                                  name: existingStatus
                              }
                          ]
                      }
                  }] : []
              }
          }
      });

  // If PR exists and needs priority update
  if (existingPriority && existingPriority !== PRIORITIES.R2) {
      // Fourth call - update priority only
      graphql.mockResolvedValueOnce({
          updateProjectV2ItemFieldValue: {
              projectV2Item: { id: 'existing-item-id' }
          }
      });
  }
  // If PR doesn't exist in project
  else if (!existingPriority) {
      // Fourth call - add to project
      graphql.mockResolvedValueOnce({
          addProjectV2ItemById: {
              item: { id: 'new-item-id' }
          }
      })
      // Fifth and Sixth calls - update both priority and status
      .mockResolvedValueOnce({
          updateProjectV2ItemFieldValue: {
              projectV2Item: { id: 'new-item-id' }
          }
      })
      .mockResolvedValueOnce({
          updateProjectV2ItemFieldValue: {
              projectV2Item: { id: 'new-item-id' }
          }
      });
  }

  return { graphql };
};

exports.OPTION_IDS = OPTION_IDS;