/**
 * Updates a field value for an item in a GitHub Project.
 * @param {Object} params - The parameters for updating the project field
 * @param {Object} params.github - The GitHub API client
 * @param {string} params.projectId - The ID of the project
 * @param {string} params.itemId - The ID of the item to update
 * @param {string} params.fieldId - The ID of the field to update
 * @param {string} params.value - The new value for the field
 * @returns {Promise<Object>} The GraphQL mutation response
 */
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
  
/**
 * Adds an item (PR) to a GitHub Project.
 * @param {Object} params - The parameters for adding an item to the project
 * @param {Object} params.github - The GitHub API client
 * @param {string} params.projectId - The ID of the project
 * @param {string} params.contentId - The node ID of the PR to add
 * @returns {Promise<Object>} The GraphQL mutation response with the new item's ID
 */
  const addItemToProject = async ({ github, projectId, contentId }) => {
    return github.graphql(
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
          projectId,
          contentId,
        },
      }
    );
  };
  
/**
 * Fetches fields configuration for a GitHub Project.
 * @param {Object} params - The parameters for fetching project fields
 * @param {Object} params.github - The GitHub API client
 * @param {number} params.number - The project number
 * @returns {Promise<Object>} The project fields data including field IDs and options
 */
  const fetchProjectFields = async ({ github, number }) => {
    return github.graphql(
      `
      query($number: Int!) {
        viewer {
          projectV2(number: $number) {
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
      { number }
    );
  };
  

/**
 * Fetches open pull requests from a repository with pagination support.
 * Includes data needed for both R2 and R5 priority processing.
 * @param {Object} params - The parameters for fetching pull requests
 * @param {Object} params.github - The GitHub API client
 * @param {string} params.owner - The repository owner
 * @param {string} params.repo - The repository name
 * @param {string} [params.cursor] - The pagination cursor
 * @returns {Promise<Object>} The GraphQL mutation response
 */
  const fetchOpenPullRequests = async ({ github, owner, repo, cursor }) => {
    return github.graphql(
      `
      query($owner: String!, $repo: String!, $cursor: String) {
        repository(owner: $owner, name: $repo) {
          pullRequests(first: 100, after: $cursor, states: OPEN) {
            nodes {
              id
              number
              updatedAt
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
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
      `,
      { owner, repo, cursor }
    );
  };

  /**
   * Fetches project item details for a specific PR
   * @param {Object} params - The parameters for fetching project item
   * @param {Object} params.github - The GitHub API client
   * @param {string} params.projectId - Project ID
   * @param {string} params.contentId - PR node ID
   * @returns {Promise<Object>} Project item details if PR is in project
   */
  const fetchProjectItem = async ({ github, projectId, contentId }) => {
    return github.graphql(
      `
      query($projectId: ID!, $contentId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            items(first: 1, filterBy: {contentId: $contentId}) {
              nodes {
                id
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
      { projectId, contentId }
    );
  };

  module.exports = {
    updateProjectField,
    addItemToProject,
    fetchProjectFields,
    fetchOpenPullRequests,
    fetchProjectItem
  };