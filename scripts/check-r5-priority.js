const PROJECT_CONFIG = {
  owner: "godwingrs22",
  projectNumber: 1,
  projectId: "PVT_kwHOAD1EYc4AwI4d",
  priorityFieldId: "PVTSSF_lAHOAD1EYc4AwI4dzgmdOIA",
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

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
  // Get project fields and options
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
                    updatedAt
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

  const r5OptionId = priorityField.options.find(
    (option) => option.name === "R5"
  )?.id;

  for (const item of project.viewer.projectV2.items.nodes) {
    const pr = item.content;
    if (!pr) continue;

    const labels = pr.labels.nodes.map((l) => l.name);
    const lastUpdated = new Date(pr.updatedAt);
    const daysSinceUpdate = (Date.now() - lastUpdated) / MS_PER_DAY;

    const currentPriority = item.fieldValues.nodes.find(
      (fv) => fv.field.name === "Priority"
    )?.name;

    if (
      labels.includes("pr/needs-community-review") &&
      daysSinceUpdate > 21 &&
      currentPriority !== "R5"
    ) {
      console.log(
        `Updating PR #${
          pr.number
        } to R5 priority. Last updated ${daysSinceUpdate.toFixed(1)} days ago.`
      );

      await updateProjectField({
        github,
        projectId: PROJECT_CONFIG.projectId,
        itemId: item.id,
        fieldId: PROJECT_CONFIG.priorityFieldId,
        value: r5OptionId,
      });
    }
  }
};
