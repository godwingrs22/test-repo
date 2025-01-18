const { PRIORITIES, LABELS } = require('../../../scripts/prioritization/project-config');
const { 
    createMockPR, 
    createMockGithub,
    createMockProjectItemResponse
} = require('./helpers/mock-data');

const assignPriority = require('../../../scripts/prioritization/assign-priority');


describe('Priority Assignment (R1, R3, R4)', () => {
    let mockGithub;
    let mockContext;
  
    beforeEach(() => {
        mockGithub = createMockGithub();
        jest.clearAllMocks();
    });

    async function verifyProjectState(pr, expectedPriority, expectedStatus = 'Ready') {
        const shouldExistInProject = expectedPriority !== null;

        mockGithub.graphql.mockResolvedValueOnce(
            createMockProjectItemResponse({
            priority: expectedPriority,
            status: expectedStatus,
            exists: shouldExistInProject
            })
        );

        const result = await mockGithub.graphql(`
            query($contentId: ID!) {
            node(id: $contentId) {
                ... on PullRequest {
                projectItems(first: 1) {
                    nodes {
                    id
                    fieldValues(first: 8) {
                        nodes {
                        ... on ProjectV2ItemFieldSingleSelectValue {
                            name
                            field {
                            name
                            }
                        }
                        }
                    }
                    }
                }
                }
            }
            }
        `, { contentId: pr.node_id });
        
        const projectItems = result?.node?.projectItems?.nodes ?? [];
        
        if (!shouldExistInProject) {
            // Verify PR is not in project
            expect(projectItems).toHaveLength(0);
            return;
        }

        // PR should be in project, verify values
        expect(projectItems).toHaveLength(1);
        const projectItem = projectItems[0];

        const priorityField = projectItem.fieldValues.nodes
        .find(fv => fv.field.name === 'Priority');
        const statusField = projectItem.fieldValues.nodes
        .find(fv => fv.field.name === 'Status');

        expect(priorityField?.name).toBe(expectedPriority);
        expect(statusField?.name).toBe(expectedStatus);
    }
  
    describe('R1 Priority Tests', () => {
      test('should assign R1 and Ready status to non-draft PR with contribution/core label', async () => {
        const pr = createMockPR({
          draft: false,
          labels: [LABELS.CORE]
        });
  
        mockContext = { payload: { pull_request: pr } };
                  
        await assignPriority({ github: mockGithub, context: mockContext });
        await verifyProjectState(pr, PRIORITIES.R1, 'Ready');
      });
  
      test('should not add draft PR with contribution/core label to project', async () => {
        const pr = createMockPR({
          draft: true,
          labels: [LABELS.CORE]
        });
  
        mockContext = { payload: { pull_request: pr } };
        
        await assignPriority({ github: mockGithub, context: mockContext });
        await verifyProjectState(pr, null);
      });
    });
  
    describe('R3 Priority Tests', () => {
      test('should assign R3 and Ready status to non-draft PR with needs-maintainer-review label', async () => {
        const pr = createMockPR({
          draft: false,
          labels: [LABELS.MAINTAINER_REVIEW]
        });
  
        mockContext = { payload: { pull_request: pr } };
        
        await assignPriority({ github: mockGithub, context: mockContext });
        await verifyProjectState(pr, PRIORITIES.R3, 'Ready');
      });
  
      test('should not assign R3 if PR has pr/reviewer-clarification-requested or pr-linter/exemption-requested labels', async () => {
        const pr = createMockPR({
          draft: false,
          labels: [
            LABELS.MAINTAINER_REVIEW,
            LABELS.EXEMPTION_REQUESTED
          ]
        });
  
        mockContext = { payload: { pull_request: pr } };
        
        await assignPriority({ github: mockGithub, context: mockContext });
        await verifyProjectState(pr, null);
      });

      test('should not assign R3 to draft PR with needs-maintainer-review label', async () => {
        const pr = createMockPR({
          draft: true,
          labels: [LABELS.MAINTAINER_REVIEW]
        });
  
        mockContext = { payload: { pull_request: pr } };
        
        await assignPriority({ github: mockGithub, context: mockContext });
        await verifyProjectState(pr, null);
      });
    });
  
    describe('R4 Priority Tests', () => {
      test('should assign R4 and Ready status to PR with clarification and community review labels', async () => {
        const pr = createMockPR({
          draft: true,
          labels: [
            LABELS.CLARIFICATION_REQUESTED,
            LABELS.COMMUNITY_REVIEW
          ]
        });
  
        mockContext = { payload: { pull_request: pr } };
        
        await assignPriority({ github: mockGithub, context: mockContext });
        await verifyProjectState(pr, PRIORITIES.R4, 'Ready');
      });
  
      test('should assign R4 and Ready status to PR with pr-linter/exemption-requested and needs-maintainer-review labels', async () => {
        const pr = createMockPR({
          labels: [
            LABELS.EXEMPTION_REQUESTED,
            LABELS.MAINTAINER_REVIEW
          ]
        });
  
        mockContext = { payload: { pull_request: pr } };
        
        await assignPriority({ github: mockGithub, context: mockContext });
        await verifyProjectState(pr, PRIORITIES.R4, 'Ready');
      });

      test('should assign R4 to PR with pr/reviewer-clarification-requested label and no review labels', async () => {
        const pr = createMockPR({
          labels: [LABELS.CLARIFICATION_REQUESTED]
        });
  
        mockContext = { payload: { pull_request: pr } };
        
        await assignPriority({ github: mockGithub, context: mockContext });
        await verifyProjectState(pr, PRIORITIES.R4, 'Ready');
      });

      test('should assign R4 to PR with pr-linter/exemption-requested label and no review labels', async () => {
        const pr = createMockPR({
          labels: [LABELS.EXEMPTION_REQUESTED]
        });
  
        mockContext = { payload: { pull_request: pr } };
        
        await assignPriority({ github: mockGithub, context: mockContext });
        await verifyProjectState(pr, PRIORITIES.R4, 'Ready');
      });
    });

    describe('Priority Precedence Tests', () => {
      test('should assign R1 over R3 when PR has both contribution/core and needs-maintainer-review labels', async () => {
        const pr = createMockPR({
          draft: false,
          labels: [
            LABELS.CORE,
            LABELS.MAINTAINER_REVIEW
          ]
        });
  
        mockContext = { payload: { pull_request: pr } };
        
        await assignPriority({ github: mockGithub, context: mockContext });
        await verifyProjectState(pr, PRIORITIES.R1, 'Ready');
      });

      test('should not assign any priority when no matching labels', async () => {
        const pr = createMockPR({
          draft: false,
          labels: []
        });
  
        mockContext = { payload: { pull_request: pr } };
        
        await assignPriority({ github: mockGithub, context: mockContext });
        await verifyProjectState(pr, null);
      });
    });
});