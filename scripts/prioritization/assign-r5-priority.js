const { PRIORITIES, ...PROJECT_CONFIG } = require("./project-config");

const MS_PER_HOUR = 1000 * 60 * 60;  // milliseconds in an hour
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
  // Get open PRs
  const result = await github.graphql(
    `
      query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequests(first: 100, states: OPEN) {
          nodes {
            id
            number
            updatedAt
            labels(first: 10) {
              nodes {
                name
              }
            }
          }
        }
      }
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
        }
      }
    }
    `,
    {
      owner: PROJECT_CONFIG.owner,
      repo: PROJECT_CONFIG.repo,
      number: PROJECT_CONFIG.projectNumber
    }
  );

  const priorityField = result.viewer.projectV2.fields.nodes.find(
    (field) => field.id === PROJECT_CONFIG.priorityFieldId
  );

  const statusField = result.viewer.projectV2.fields.nodes.find(
    (field) => field.id === PROJECT_CONFIG.statusFieldId
  );

  const r5OptionId = priorityField.options.find(
    (option) => option.name === PRIORITIES.R5.name
  )?.id;

  const readyStatusId = statusField.options.find(
    (option) => option.name === "Ready"
  )?.id;

  for (const pr of result.repository.pullRequests.nodes) {

    console.log(`Processing PR #${pr.number}`);

    const labels = pr.labels.nodes.map((l) => l.name);
    const lastUpdated = new Date(pr.updatedAt);
    const daysSinceUpdate = (Date.now() - lastUpdated) / MS_PER_HOUR;

    if (
      labels.includes(PRIORITIES.R5.label) &&
      daysSinceUpdate > PRIORITIES.R5.daysThreshold
    ) {
      console.log(
        `Updating PR #${pr.number} to ${
          PRIORITIES.R5.name
        } priority. Last updated ${daysSinceUpdate.toFixed(1)} days ago.`
      );

      // Add PR to project if not already added
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
            projectId: PROJECT_CONFIG.projectId,
            contentId: pr.id,
          },
        }
      );

      const itemId = addToProjectMutation.addProjectV2ItemById.item.id;
      
      // Update Priority to R5
      await updateProjectField({
        github,
        projectId: PROJECT_CONFIG.projectId,
        itemId: itemId,
        fieldId: PROJECT_CONFIG.priorityFieldId,
        value: r5OptionId,
      });

      // Update Status to Ready
      await updateProjectField({
        github,
        projectId: PROJECT_CONFIG.projectId,
        itemId: itemId,
        fieldId: PROJECT_CONFIG.statusFieldId,
        value: readyStatusId,
      });
    }
  }
};
