const { PRIORITIES, ...PROJECT_CONFIG } = require("./project-config");

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
  // Get project items with PR data
  const project = await github.graphql(
    `
      query($number: Int!) {
        viewer {
          projectV2(number: $number) {
            id
            fields(first: 20) {
              nodes {
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
            items(first: 100) {
              nodes {
                id
                content {
                  ... on PullRequest {
                    number
                    state
                    reviews(last: 100) {
                      nodes {
                        state
                      }
                    }
                    commits(last: 1) {
                      nodes {
                        commit {
                          statusCheckRollup {
                            state
                          }
                        }
                      }
                    }
                    labels(first: 10) {
                      nodes {
                        name
                      }
                    }
                  }
                }
                fieldValues(first: 8) {
                  nodes {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field {
                        ... on ProjectV2SingleSelectField {
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
      }
    `,
    {
      number: PROJECT_CONFIG.projectNumber,
    }
  );

  const priorityField = project.viewer.projectV2.fields.nodes.find(
    (field) => field.id === PROJECT_CONFIG.priorityFieldId
  );

  const statusField = project.viewer.projectV2.fields.nodes.find(
    (field) => field.id === PROJECT_CONFIG.statusFieldId
  );

  const r2OptionId = priorityField.options.find(
    (option) => option.name === PRIORITIES.R2.name
  )?.id;

  const readyStatusId = statusField.options.find(
    (option) => option.name === "Ready"
  )?.id;

  for (const item of project.viewer.projectV2.items.nodes) {
    try {
      const pr = item.content;
      if (!pr || pr.state !== "OPEN") continue;

      // Skip if PR has R1 label (higher priority)
      const labels = pr.labels.nodes.map((l) => l.name);
      if (labels.includes(PRIORITIES.R1.label)) continue;

      // Check if PR is approved
      const isApproved = pr.reviews.nodes.some(
        (review) => review.state === "APPROVED"
      );

      // Check status of checks
      const checksState = pr.commits.nodes[0]?.commit.statusCheckRollup?.state;
      const checksNotPassing = checksState !== "SUCCESS";

      const currentPriority = item.fieldValues.nodes.find(
        (fv) => fv.field.name === "Priority"
      )?.name;

      if (isApproved && checksNotPassing) {
        // Update to R2 if not already set
        if (currentPriority !== PRIORITIES.R2.name) {
          console.log(
            `Updating PR #${pr.number} to ${PRIORITIES.R2.name} priority. Approved but checks not passing.`
          );

          // Update Priority to R2
          await updateProjectField({
            github,
            projectId: PROJECT_CONFIG.projectId,
            itemId: item.id,
            fieldId: PROJECT_CONFIG.priorityFieldId,
            value: r2OptionId,
          });

          // Update Status to Ready
          await updateProjectField({
            github,
            projectId: PROJECT_CONFIG.projectId,
            itemId: item.id,
            fieldId: PROJECT_CONFIG.statusFieldId,
            value: readyStatusId,
          });
        }
      }
    } catch (error) {
      console.error(`Error processing item:`, error);
      continue;
    }
  }
};
