// File: scripts/update-attention-status.js
const PROJECT_CONFIG = {
  org: "godwingrs22",
  projectNumber: 1,
  projectId: "PVT_kwHOAD1EYc4AwI4d",
  attentionFieldId: "PVTSSF_lAHOAD1EYc4AwI4dzgmdOb0",
};

const updateProjectField = async ({
  github,
  projectId,
  itemId,
  fieldId,
  value,
}) => {
  return github.graphql(
    `
      mutation($input: UpdateProjectV2ItemFieldValueInput!) {
        updateProjectV2ItemFieldValue(input: $input) {
          projectV2Item {
            id
          }
        }
      }
    `,
    {
      input: {
        projectId,
        itemId,
        fieldId,
        value,
      },
    }
  );
};

module.exports = async ({ github, context }) => {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const getAttentionStatus = (days) => {
    if (days > 21) return "Stalled";
    if (days > 14) return "Aging";
    if (days > 7) return "Extended";
    return null;
  };

  // Query project items with their status history
  // const items = await github.graphql(`
  //   query($org: String!, $number: Int!) {
  //     organization(login: $org) {
  //       projectV2(number: $number) {
  //         items(first: 100) {
  //           nodes {
  //             id
  //             fieldValues(first: 20) {
  //               nodes {
  //                 ... on ProjectV2ItemFieldSingleSelectValue {
  //                   name
  //                   field {
  //                     name
  //                   }
  //                   updatedAt
  //                 }
  //               }
  //             }
  //           }
  //         }
  //       }
  //     }
  //   }
  // `, {
  //   org: PROJECT_CONFIG.org,
  //   number: PROJECT_CONFIG.projectNumber
  // });

  const items = await github.graphql(
    `
        query($number: Int!) {
          viewer {
            projectV2(number: $number) {
              items(first: 100) {
                nodes {
                  id
                  fieldValues(first: 20) {
                    nodes {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field {
                          name
                        }
                        updatedAt
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
    {
      number: PROJECT_CONFIG.projectNumber,
    }
  );

  // Update attention status for each item
  //   for (const item of items.organization.projectV2.items.nodes) {
  for (const item of items.viewer.projectV2.items.nodes) {
    try {
      // Get current status and its last update time
      const statusField = item.fieldValues.nodes.find(
        (field) => field.field.name === "Status"
      );

      if (!statusField) continue;

      const currentStatus = statusField.name;
      const statusLastUpdated = new Date(statusField.updatedAt);

      // Skip if status is Done
      if (currentStatus === "Done") continue;

      // Calculate days in current status
      const daysInStatus = (Date.now() - statusLastUpdated) / MS_PER_DAY;
      const attentionStatus = getAttentionStatus(daysInStatus);

      if (attentionStatus) {
        console.log(
          `Updating item ${
            item.id
          }: ${currentStatus} for ${daysInStatus.toFixed(
            1
          )} days -> ${attentionStatus}`
        );

        await updateProjectField({
          github,
          projectId: PROJECT_CONFIG.projectId,
          itemId: item.id,
          fieldId: PROJECT_CONFIG.attentionFieldId,
          value: attentionStatus,
        });
      } else {
        // Clear attention status if item hasn't exceeded thresholds
        await updateProjectField({
          github,
          projectId: PROJECT_CONFIG.projectId,
          itemId: item.id,
          fieldId: PROJECT_CONFIG.attentionFieldId,
          value: null,
        });
      }
    } catch (error) {
      console.error(`Error processing item ${item.id}:`, error);
      continue;
    }
  }
};
