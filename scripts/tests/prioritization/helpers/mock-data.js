const { PRIORITIES, LABELS, ...PROJECT_CONFIG } = require('../../../../scripts/prioritization/project-config');

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

const FIELD_IDS = {
  PRIORITY: 'r1-option-id',
  STATUS: 'ready-status-id'
};

exports.createMockProjectItemResponse = ({ 
  itemId = 'new-item-id', 
  priority = null, 
  status = null,
  exists = true 
}) => ({
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
});

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
                  id: `${priority.toLowerCase()}-option-id`,
                  name: priority
                }))
              },
              {
                id: PROJECT_CONFIG.statusFieldId,
                name: 'Status',
                options: [
                  { id: FIELD_IDS.STATUS, name: 'Ready' }
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

exports.FIELD_IDS = FIELD_IDS;