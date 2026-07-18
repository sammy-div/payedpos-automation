import "server-only";

interface GithubEnv {
  token: string;
  owner: string;
  repo: string;
  workflowFile: string;
  ref: string;
}

function getGithubEnv(): GithubEnv {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    throw new Error(
      "GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO must all be set to trigger the automation workflow."
    );
  }

  return {
    token,
    owner,
    repo,
    workflowFile: process.env.GITHUB_WORKFLOW_FILE || "automation.yml",
    ref: process.env.GITHUB_WORKFLOW_REF || "main",
  };
}

async function githubRequest(path: string, init?: RequestInit): Promise<Response> {
  const env = getGithubEnv();
  const url = `https://api.github.com/repos/${env.owner}/${env.repo}${path}`;

  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...init?.headers,
    },
    // This is a control-plane call (start a workflow), not a page render -
    // never cache it.
    cache: "no-store",
  });
}

export function isGithubActionsConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO);
}

export interface WorkflowRun {
  id: number;
  status: string; // 'queued' | 'in_progress' | 'completed' | ...
  conclusion: string | null;
  html_url: string;
  created_at: string;
}

/**
 * True if the workflow already has a queued or in-progress run. Used as
 * a practical guard against duplicate/concurrent triggers (e.g. someone
 * clicking "Refresh" repeatedly) - not a security boundary by itself,
 * just avoids piling up redundant runs against the real site.
 */
export async function hasActiveRun(): Promise<boolean> {
  const env = getGithubEnv();
  const response = await githubRequest(
    `/actions/workflows/${env.workflowFile}/runs?per_page=5`
  );

  if (!response.ok) {
    // If we can't check, fail open on the *check* (not on auth) - err
    // toward allowing the trigger rather than blocking all refreshes
    // because of a transient GitHub API hiccup.
    return false;
  }

  const data = (await response.json()) as { workflow_runs: WorkflowRun[] };
  return data.workflow_runs.some((run) => run.status === "queued" || run.status === "in_progress");
}

export interface DispatchParams {
  route: string;
  triggeredBy: "manual" | "api";
}

export async function dispatchWorkflow(params: DispatchParams): Promise<void> {
  const env = getGithubEnv();

  const response = await githubRequest(`/actions/workflows/${env.workflowFile}/dispatches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ref: env.ref,
      inputs: {
        route: params.route,
        triggered_by: params.triggeredBy,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub workflow dispatch failed (${response.status}): ${body.slice(0, 500)}`);
  }
}
