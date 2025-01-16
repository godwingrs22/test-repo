// File: scripts/manage-project-items.js
const PROJECT_CONFIG = {
    org: 'godwingrs22',
    projectNumber: 1,
    projectId: 'PVT_kwHOAD1EYc4AwI4d',
    priorityFieldId: 'PVTSSF_lAHOAD1EYc4AwI4dzgmdOIA',
    statusFieldId: 'PVTSSF_lAHOAD1EYc4AwI4dzgmdOFc'
  };
  
  const updateProjectField = async ({github, projectId, itemId, fieldId, value}) => {
    return github.graphql(`
      mutation($input: UpdateProjectV2ItemFieldValueInput!) {
        updateProjectV2ItemFieldValue(input: $input) {
          projectV2Item {
            id
          }
        }
      }
    `, {
      input: {
        projectId,
        itemId,
        fieldId,
        value
      }
    });
  };
  
  module.exports = async ({github, context}) => {
    const getPriority = (labels) => {
      if (labels.includes('contribution/core')) return 'R1';
      if (labels.includes('pr/approved')) return 'R2';
      if (labels.includes('pr/needs-maintainer-review')) return 'R3';
      if (labels.includes('pr/reviewer-clarification-requested') || 
          labels.includes('pr-linter/exemption-requested')) return 'R4';
      if (labels.includes('pr/needs-community-review')) return 'R5';
      return null;
    };
  
    async function addToProject(pr) {
      // Get project ID
    //   const project = await github.graphql(`
    //     query($org: String!, $number: Int!) {
    //       organization(login: $org) {
    //         projectV2(number: $number) {
    //           id
    //           fields(first: 20) {
    //             nodes {
    //               ... on ProjectV2Field {
    //                 id
    //                 name
    //               }
    //               ... on ProjectV2SingleSelectField {
    //                 id
    //                 name
    //                 options {
    //                   id
    //                   name
    //                 }
    //               }
    //             }
    //           }
    //         }
    //       }
    //     }
    //   `, {
    //     org: PROJECT_CONFIG.org,
    //     number: PROJECT_CONFIG.projectNumber
    //   });
        
      const project = await github.graphql(`
        query($number: Int!) {
          viewer {
            projectV2(number: $number) {
              id
              fields(first: 20) {
                nodes {
                  ... on ProjectV2Field {
                    id
                    name
                  }
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        number: PROJECT_CONFIG.projectNumber
      });
  
      // Add PR to project
      const addToProjectMutation = await github.graphql(`
        mutation($input: AddProjectV2ItemByIdInput!) {
          addProjectV2ItemById(input: $input) {
            item {
              id
            }
          }
        }
      `, {
        input: {
            //   projectId: project.organization.projectV2.id,
              projectId: project.viewer.projectV2.id,
          contentId: pr.node_id
        }
      });
  
      // Set priority and status
      const priority = getPriority(pr.labels.map(l => l.name));
      if (priority) {
        await updateProjectField({
          github,
            // projectId: project.organization.projectV2.id,
            projectId: project.viewer.projectV2.id,

          itemId: addToProjectMutation.addProjectV2ItemById.item.id,
          fieldId: PROJECT_CONFIG.priorityFieldId,
          value: priority
        });
      }
  
      // Set initial status to Ready
      await updateProjectField({
        github,
        //   projectId: project.organization.projectV2.id,
          projectId: project.viewer.projectV2.id,

        itemId: addToProjectMutation.addProjectV2ItemById.item.id,
        fieldId: PROJECT_CONFIG.statusFieldId,
        value: 'Ready'
      });
    }
  
    const pr = context.payload.pull_request;
    await addToProject(pr);
  };
  