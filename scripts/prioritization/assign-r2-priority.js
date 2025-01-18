/**
 * Processes open PRs every 6 hours during weekdays to identify and assign R2 priority. A PR qualifies
 * for R2 when it has received approval but has failing or pending checks, regardless of its current
 * priority or status. These PRs are either added to the project board with R2 priority and Ready status
 * (if not already in board) or updated to R2 priority (if already in board with different priority).
 */

const { PRIORITIES, LABELS, ...PROJECT_CONFIG } = require("./project-config");

const {
  updateProjectField,
  addItemToProject,
  fetchProjectFields,
  fetchOpenPullRequests,
  fetchProjectItem,
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
    (option) => option.name === PRIORITIES.R2
  )?.id;

  const readyStatusId = statusField.options.find(
    (option) => option.name === "Ready"
  )?.id;

 for (const pr of allPRs) {
   try {
     
      // Check PR status
      const isApproved = pr.reviews.nodes.some(
        (review) => review.state === "APPROVED"
      );

     // Skip if PR is not approved
      if (!isApproved) {
        continue;
      }
     
      // Check status of checks
      const checksState = pr.commits.nodes[0]?.commit.statusCheckRollup?.state;
      const checksNotPassing = checksState !== "SUCCESS";

     // Skip if PR checks is not passing
      if (!checksNotPassing) {
        continue;
      }
     
      console.log(`Processing PR #${pr.number} for ${PRIORITIES.R2} priority consideration`);

       // Get all projects the PR added to
      const result = await fetchProjectItem({
        github,
        contentId: pr.id
      });

      // Filter our specific project
      const projectItem = result.node.projectItems.nodes
        .find(item => item.project.id === PROJECT_CONFIG.projectId);
     
      if (projectItem) {
        // PR already in project
        const currentPriority = projectItem.fieldValues.nodes
          .find(fv => fv.field?.name === 'Priority')?.name;
  
        if (currentPriority === PRIORITIES.R2) {
          console.log(`PR #${pr.number} already has ${PRIORITIES.R2} priority. Skipping.`);
          continue;
        }
  
        // Update priority only, maintain existing status
        console.log(`Updating PR #${pr.number} from ${currentPriority} to ${PRIORITIES.R2} priority`);
        await updateProjectField({
          github,
          projectId: PROJECT_CONFIG.projectId,
          itemId: projectItem.id,
          fieldId: PROJECT_CONFIG.priorityFieldId,
          value: r2OptionId,
        });
      } else {
        // Add new PR to project with R2 priority and Ready status
        console.log(`Adding PR #${pr.number} to project with ${PRIORITIES.R2} priority`);
        const addResult = await addItemToProject({
          github,
          projectId: PROJECT_CONFIG.projectId,
          contentId: pr.id,
        });
        itemId = addResult.addProjectV2ItemById.item.id;

        // Set both priority and initial status for new items
        await Promise.all([
          updateProjectField({
            github,
            projectId: PROJECT_CONFIG.projectId,
            itemId: itemId,
            fieldId: PROJECT_CONFIG.priorityFieldId,
            value: r2OptionId,
          }),
          updateProjectField({
            github,
            projectId: PROJECT_CONFIG.projectId,
            itemId: itemId,
            fieldId: PROJECT_CONFIG.statusFieldId,
            value: readyStatusId,
          })
        ]);
      }
    } catch (error) {
      console.error(`Error processing PR #${pr.number}:`, error);
      continue;
    }
  }
};
