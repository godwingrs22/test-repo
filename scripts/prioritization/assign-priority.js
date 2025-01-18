/**
 * Handles the initial priority assignment for PRs when labels are added. This script
 * processes R1 (team PRs with contribution/core label), R3 (PRs needing maintainer review),
 * and R4 (PRs needing clarification or exemption) priorities. When a matching label
 * is detected, the PR is added to the project board with appropriate priority and
 * set to Ready status.
 */


const { PRIORITIES, ...PROJECT_CONFIG } = require('./project-config');
const {
  updateProjectField,
  addItemToProject,
  fetchProjectFields,
} = require('./project-api');

module.exports = async ({ github, context }) => {
  const getPriority = (labels) => {
    if (labels.includes(PRIORITIES.R1.label)) return PRIORITIES.R1.name;
    if (labels.includes(PRIORITIES.R3.label)) return PRIORITIES.R3.name;
    if (PRIORITIES.R4.labels.some(label => labels.includes(label))) return PRIORITIES.R4.name;
    return null;
  };

  async function addToProject(pr) {

     // Check if PR qualifies for any priority
     const priority = getPriority(pr.labels.map((l) => l.name));
     if (!priority) {
       console.log(`PR #${pr.number} doesn't qualify for any priority. Skipping.`);
       return;
     }
 
    console.log(`Processing PR #${pr.number} for ${priority} priority`);
    
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

    try {
      // Add PR to project
      const addResult = await addItemToProject({
        github,
        projectId: PROJECT_CONFIG.projectId,
        contentId: pr.node_id,
      });

      const itemId = addResult.addProjectV2ItemById.item.id;

      // Set priority
      const priorityOptionId = priorityField.options.find(
        (option) => option.name === priority
      )?.id;

      if (!priorityOptionId) {
        console.error(`Priority option ${priority} not found in project settings`);
        return;
      }

      // Set Ready status
      const readyOptionId = statusField.options.find(
        (option) => option.name === "Ready"
      )?.id;

      if (!readyOptionId) {
        console.error('Ready status option not found in project settings');
        return;
      }

      // Set Priority and Ready Status
      await Promise.all([
        updateProjectField({
          github,
          projectId: PROJECT_CONFIG.projectId,
          itemId: itemId,
          fieldId: PROJECT_CONFIG.priorityFieldId,
          value: priorityOptionId,
        }),
        updateProjectField({
          github,
          projectId: PROJECT_CONFIG.projectId,
          itemId: itemId,
          fieldId: PROJECT_CONFIG.statusFieldId,
          value: readyOptionId,
        })
      ]);

      console.log(`Successfully added PR #${pr.number} with ${priority} priority`);
    } catch (error) {
      console.error(`Error processing PR #${pr.number}:`, error);
    }
  }

  const pr = context.payload.pull_request;
  await addToProject(pr);
};
