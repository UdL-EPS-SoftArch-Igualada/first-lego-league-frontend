const fs = require("node:fs");
const path = require("node:path");

const TEAMS_FILE = path.join(process.cwd(), ".github", "teams.txt");

const IN_PROGRESS_TASKS_LIMIT = 3

const STORY_POINTS_RE =
	/time estimation:?\r?\n+(0\.25|0\.5|1|2|3|4) story points?/;

const STORY_POINTS_LABELS = new Map([
	["0.25", "story-points-0_25"],
	["0.5", "story-points-0_5"],
	["1", "story-points-1"],
	["2", "story-points-2"],
	["3", "story-points-3"],
	["4", "story-points-4"],
]);

const INVALID_STORY_POINTS_LABEL = "invalid-story-points"

const ALL_STORY_POINTS_LABELS = Array.from(STORY_POINTS_LABELS.values());

function requireTeamsFile(core) {
	if (!fs.existsSync(TEAMS_FILE)) {
		core.setFailed(
			`Missing required file: ${TEAMS_FILE}\n` +
			`Create it with one team per line, GitHub usernames separated by spaces.`
		);
		return null;
	}
	return fs.readFileSync(TEAMS_FILE, "utf8");
}

/** 
 * @param {string} teamsTxt
 */
function parseTeams(teamsTxt) {
	/** @type {Map<string, string[]>} */
	const userToTeam = new Map();
	/** @type {string[][]} */
	const teams = [];

	/** @type {string[]} */
	const lines = teamsTxt
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith("#"));

	for (const line of lines) {
		/** @type {string[]} */
		const members = line.split(/\s+/).filter(Boolean);
		if (members.length === 0) continue;

		teams.push(members);

		for (const u of members) {
			const key = u.toLowerCase();
			// First occurrence wins to avoid accidental reshuffles.
			if (!userToTeam.has(key)) userToTeam.set(key, members);
		}
	}

	return { userToTeam, teams };
}

/**
 * @param {{ userToTeam: Map<string, string[]> }} teamsIndex
 * @param {string} login
 */
function getTeamMembersOrNull(teamsIndex, login) {
	if (!login) return null;
	return teamsIndex.userToTeam.get(login.toLowerCase()) || null;
}

/**
 * @param {string} issueBody
 */
function extractStoryPointsOrNull(issueBody) {
	const bodyLc = (issueBody || "").toLowerCase();
	const m = STORY_POINTS_RE.exec(bodyLc);
	if (!m) return null;
	return m[1]; // capturing group (0.25|0.5|1|2|3|4)
}

/**
 * @param {string} points
 */
function storyPointsLabel(points) {
	return STORY_POINTS_LABELS.get(points) || null;
}

async function addComment(github, context, body) {
	await github.rest.issues.createComment({
		owner: context.repo.owner,
		repo: context.repo.repo,
		issue_number: context.payload.issue.number,
		body,
	});
}

async function closeIssue(github, context) {
	await github.rest.issues.update({
		owner: context.repo.owner,
		repo: context.repo.repo,
		issue_number: context.payload.issue.number,
		state: "closed",
		state_reason: "not_planned"
	});
}

async function addLabels(github, context, labels) {
	const wanted = labels.filter(Boolean);
	if (wanted.length === 0) return;

	const existing = new Set(
		(context.payload.issue.labels || []).map((l) => l.name)
	);
	const toAdd = wanted.filter((l) => !existing.has(l));
	if (toAdd.length === 0) return;

	await github.rest.issues.addLabels({
		owner: context.repo.owner,
		repo: context.repo.repo,
		issue_number: context.payload.issue.number,
		labels: toAdd,
	});
}

/**
 * @param {string} label
 */
async function removeLabelSafe(github, context, label) {
	try {
		await github.rest.issues.removeLabel({
			owner: context.repo.owner,
			repo: context.repo.repo,
			issue_number: context.payload.issue.number,
			name: label,
		});
		return true
	} catch (e) {
		// ignore missing label (404) and other non-critical failures
		console.warn(e);
		return false
	}
}

function hasLabel(issue, labelName) {
	const labels = issue.labels || [];
	return labels.some((l) => (l.name || "").toLowerCase() === labelName.toLowerCase());
}

/**
 * Projects v2 helpers (GraphQL)
 */

async function getSingleRepoProjectV2(github, context) {
	const { owner, repo } = context.repo;

	const q = `
    query($owner:String!, $repo:String!) {
      repository(owner:$owner, name:$repo) {
        projectsV2(first: 10) {
          nodes { id title }
        }
      }
    }
  `;

	const res = await github.graphql(q, { owner, repo });
	const nodes = res.repository.projectsV2.nodes || [];

	if (nodes.length !== 1) {
		throw new Error(
			`Repository must have exactly 1 linked Projects v2 project, found ${nodes.length}.`
		);
	}
	return nodes[0];
}

async function getStatusFieldConfig(github, projectId) {
	const q = `
    query($projectId:ID!) {
      node(id:$projectId) {
        ... on ProjectV2 {
          fields(first: 100) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options { id name }
              }
              ... on ProjectV2Field {
                id
                name
              }
            }
          }
        }
      }
    }
  `;
	const res = await github.graphql(q, { projectId });
	const fields = res.node.fields.nodes || [];

	const status = fields.find((f) => f.name === "Status" && f.options);
	if (!status) throw new Error(`Project is missing a single-select field named "Status".`);

	return {
		fieldId: status.id,
		options: status.options || [],
	};
}

function findSingleStatusOptionId(options, needleLower) {
	const matches = options.filter((o) =>
		(o.name || "").toLowerCase().includes(needleLower)
	);
	if (matches.length !== 1) {
		throw new Error(
			`Expected exactly 1 Status option containing "${needleLower}", found ${matches.length}.`
		);
	}
	return matches[0].id;
}

async function getProjectItemIdForIssue(github, issueId, projectId) {
	const q = `
    query($issueId:ID!) {
      node(id:$issueId) {
        ... on Issue {
          projectItems(first: 50) {
            nodes {
              id
              project { id }
            }
          }
        }
      }
    }
  `;
	const res = await github.graphql(q, { issueId });
	const nodes = res.node.projectItems.nodes || [];
	const match = nodes.find((n) => n.project.id === projectId);
	return match ? match.id : null;
}

async function addIssueToProject(github, projectId, issueNodeId) {
	const m = `
    mutation($projectId:ID!, $contentId:ID!) {
      addProjectV2ItemById(input:{ projectId:$projectId, contentId:$contentId }) {
        item { id }
      }
    }
  `;
	const res = await github.graphql(m, { projectId, contentId: issueNodeId });
	return res.addProjectV2ItemById.item.id;
}

async function setProjectItemSingleSelect(github, projectId, itemId, fieldId, optionId) {
	const m = `
    mutation($projectId:ID!, $itemId:ID!, $fieldId:ID!, $optionId:String!) {
      updateProjectV2ItemFieldValue(input:{
        projectId:$projectId,
        itemId:$itemId,
        fieldId:$fieldId,
        value:{ singleSelectOptionId:$optionId }
      }) {
        projectV2Item { id }
      }
    }
  `;
	await github.graphql(m, {
		projectId,
		itemId,
		fieldId,
		optionId,
	});
}

async function deleteProjectItem(github, projectId, itemId) {
	const m = `
    mutation($projectId:ID!, $itemId:ID!) {
      deleteProjectV2Item(input:{ projectId:$projectId, itemId:$itemId }) {
        deletedItemId
      }
    }
  `;
	await github.graphql(m, { projectId, itemId });
}

async function listProjectItemsWithStatusAndAssignees(github, projectId) {
	const items = [];
	let cursor = '';

	const q = `
    query($projectId:ID!, $cursor:String) {
		node(id:$projectId) {
			... on ProjectV2 {
				items(first: 100, after: $cursor) {
					pageInfo { hasNextPage endCursor }
					nodes {
						id
						status: fieldValueByName(name: "Status") {
							... on ProjectV2ItemFieldSingleSelectValue { name }
						}
						content {
							... on Issue {
								id
								number
								assignees(first: 50) { nodes { login } }
							}
						}
					}
				}
			}
		}
	}
  	`;

	while (true) {
		const res = await github.graphql(q, { projectId, cursor });
		const conn = res.node.items;
		items.push(...(conn.nodes || []));
		if (!conn.pageInfo.hasNextPage) break;
		cursor = conn.pageInfo.endCursor;
	}

	// Only return items that are Issues.
	return items.filter((it) => it.content && it.content.number);
}

module.exports = {
	IN_PROGRESS_TASKS_LIMIT,

	// teams + story points
	requireTeamsFile,
	parseTeams,
	getTeamMembersOrNull,
	extractStoryPointsOrNull,
	storyPointsLabel,
	ALL_STORY_POINTS_LABELS,
	INVALID_STORY_POINTS_LABEL,

	// issues
	addComment,
	closeIssue,
	addLabels,
	removeLabelSafe,
	hasLabel,

	// projects v2
	getSingleRepoProjectV2,
	getStatusFieldConfig,
	findSingleStatusOptionId,
	getProjectItemIdForIssue,
	addIssueToProject,
	setProjectItemSingleSelect,
	deleteProjectItem,
	listProjectItemsWithStatusAndAssignees,
};
