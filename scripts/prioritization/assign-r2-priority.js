/**
 * Processes open PRs every 4 hours to identify and assign R2 priority. A PR qualifies
 * for R2 when it has received approval but has failing or pending checks. Qualifying PRs
 * are added to the project board with R2 priority and set to Ready status.
 */

const { PRIORITIES, ...PROJECT_CONFIG } = require("./project-config");

const {
  updateProjectField,
  addItemToProject,
  fetchProjectFields,
  fetchOpenPullRequests,
} = require('./project-api');

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

  const r2OptionId = priorityField.options.find(
    (option) => option.name === PRIORITIES.R2.name
  )?.id;

  const readyStatusId = statusField.options.find(
    (option) => option.name === "Ready"
  )?.id;

 for (const pr of allPRs) {
    try {
      console.log(`Processing PR #${pr.number}`);

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

      if (isApproved && checksNotPassing) {
        // Update to R2 if not already set
        console.log(
          `Updating PR #${pr.number} to ${PRIORITIES.R2.name} priority. Approved but checks not passing.`
        );

        // Add PR to project
        const addResult = await addItemToProject({
          github,
          projectId: PROJECT_CONFIG.projectId,
          contentId: pr.id,
        });

        const itemId = addResult.addProjectV2ItemById.item.id;

        // Update Priority to R2
        await updateProjectField({
          github,
          projectId: PROJECT_CONFIG.projectId,
          itemId: itemId,
          fieldId: PROJECT_CONFIG.priorityFieldId,
          value: r2OptionId,
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
    } catch (error) {
      console.error(`Error processing item:`, error);
      continue;
    }
  }
};
