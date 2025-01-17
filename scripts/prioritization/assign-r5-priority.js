/**
 * Monitors open PRs once daily during weekdays to identify stale community review requests. When a PR
 * with the community review label hasn't been updated for the specified threshold
 * period (default 21 days), it's assigned R5 priority. These PRs are added to the
 * project board and set to Ready status to ensure visibility of long-pending
 * community reviews.
 */

const { PRIORITIES, ...PROJECT_CONFIG } = require("./project-config");

const {
  updateProjectField,
  addItemToProject,
  fetchProjectFields,
  fetchOpenPullRequests,
} = require('./project-api');

//TODO change the PER_HOUR TO day
const MS_PER_HOUR = 1000 * 60 * 60; // milliseconds in an hour
const MS_PER_DAY = 1000 * 60 * 60 * 24;

module.exports = async ({ github }) => {
  let allPRs = [];
  let hasNextPage = true;
  let cursor = null;

  // Fetch all PRs using pagination
  while (hasNextPage) {
    const result = await fetchOpenPullRequests({
      github,
      owner: PROJECT_CONFIG.owner,
      repo: PROJECT_CONFIG.repo,
      cursor: cursor,
    });

    const pullRequests = result.repository.pullRequests;
    allPRs = allPRs.concat(pullRequests.nodes);

    // Update pagination info
    hasNextPage = pullRequests.pageInfo.hasNextPage;
    cursor = pullRequests.pageInfo.endCursor;
  }

  console.log(`Total PRs fetched: ${allPRs.length}`);

  // Get project fields
  const projectFields = await fetchProjectFields({ 
    github, 
    number: PROJECT_CONFIG.projectNumber 
  });

  const priorityField = projectFields.viewer.projectV2.fields.nodes.find(
    (field) => field.id === PROJECT_CONFIG.priorityFieldId
  );

  const statusField = projectFields.viewer.projectV2.fields.nodes.find(
    (field) => field.id === PROJECT_CONFIG.statusFieldId
  );

  const r5OptionId = priorityField.options.find(
    (option) => option.name === PRIORITIES.R5.name
  )?.id;

  const readyStatusId = statusField.options.find(
    (option) => option.name === "Ready"
  )?.id;

  for (const pr of allPRs) {
    const labels = pr.labels.nodes.map((l) => l.name);
    const lastUpdated = new Date(pr.updatedAt);
    const daysSinceUpdate = (Date.now() - lastUpdated) / MS_PER_HOUR;

    if (
      labels.includes(PRIORITIES.R5.label) &&
      daysSinceUpdate > PRIORITIES.R5.daysThreshold
    ) {
      console.log(`Updating PR #${pr.number} to ${PRIORITIES.R5.name} priority.`);

      // Add PR to project
      const addResult = await addItemToProject({
        github,
        projectId: PROJECT_CONFIG.projectId,
        contentId: pr.id,
      });

      const itemId = addResult.addProjectV2ItemById.item.id;

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
