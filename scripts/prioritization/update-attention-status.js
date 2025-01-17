const { ATTENTION_STATUS, ...PROJECT_CONFIG } = require('./project-config');

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
        value: value ? { singleSelectOptionId: value } : null,
      },
    }
  );
};

module.exports = async ({ github }) => {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const getAttentionStatus = (days) => {
    if (days > ATTENTION_STATUS.STALLED.threshold) return ATTENTION_STATUS.STALLED.name;
    if (days > ATTENTION_STATUS.AGING.threshold) return ATTENTION_STATUS.AGING.name;
    if (days > ATTENTION_STATUS.EXTENDED.threshold) return ATTENTION_STATUS.EXTENDED.name;
    return null;
  };

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
