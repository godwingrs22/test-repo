const { PRIORITIES, ...PROJECT_CONFIG } = require('./project-config');

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

module.exports = async ({ github, context }) => {
  const getPriority = (labels) => {
    if (labels.includes(PRIORITIES.R1.label)) return PRIORITIES.R1.name;
    if (labels.includes(PRIORITIES.R3.label)) return PRIORITIES.R3.name;
    if (PRIORITIES.R4.labels.some(label => labels.includes(label))) return PRIORITIES.R4.name;
    return null;
  };

  async function addToProject(pr) {
    const project = await github.graphql(
      `
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
      `,
      {
        number: PROJECT_CONFIG.projectNumber,
      }
    );

    // Get field options
    const priorityField = project.viewer.projectV2.fields.nodes.find(
      (field) => field.id === PROJECT_CONFIG.priorityFieldId
    );

    const statusField = project.viewer.projectV2.fields.nodes.find(
      (field) => field.id === PROJECT_CONFIG.statusFieldId
    );

    // Add PR to project
    const addToProjectMutation = await github.graphql(
      `
        mutation($input: AddProjectV2ItemByIdInput!) {
          addProjectV2ItemById(input: $input) {
            item {
              id
            }
          }
        }
      `,
      {
        input: {
          projectId: project.viewer.projectV2.id,
          contentId: pr.node_id,
        },
      }
    );

    // Set priority and status
    const priority = getPriority(pr.labels.map((l) => l.name));
    if (priority) {
      const priorityOptionId = priorityField.options.find(
        (option) => option.name === priority
      )?.id;

      if (priorityOptionId) {
        await updateProjectField({
          github,
          projectId: project.viewer.projectV2.id,
          itemId: addToProjectMutation.addProjectV2ItemById.item.id,
          fieldId: PROJECT_CONFIG.priorityFieldId,
          value: priorityOptionId,
        });
      }
    }

    // Set initial status to Ready
    const readyOptionId = statusField.options.find(
      (option) => option.name === "Ready"
    )?.id;

    if (readyOptionId) {
      await updateProjectField({
        github,
        projectId: project.viewer.projectV2.id,
        itemId: addToProjectMutation.addProjectV2ItemById.item.id,
        fieldId: PROJECT_CONFIG.statusFieldId,
        value: readyOptionId,
      });
    }
  }

  const pr = context.payload.pull_request;
  await addToProject(pr);
};
