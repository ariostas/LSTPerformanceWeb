const REPO_OWNER = 'SegmentLinking';
const BASE_API_URL = `https://api.github.com/repos/${REPO_OWNER}`;
const RAW_URL = `https://raw.githubusercontent.com/${REPO_OWNER}`;

export interface GitHubContent {
  name: string;
  path: string;
  type: 'dir' | 'file';
  download_url: string | null;
  repo: string;
}

export async function fetchDirectories(repoName: string): Promise<GitHubContent[]> {
  const response = await fetch(`${BASE_API_URL}/${repoName}/contents`);
  if (!response.ok) {
    throw new Error(`Failed to fetch directories for ${repoName}: ${response.statusText}`);
  }
  const data: GitHubContent[] = await response.json();
  return data
    .filter(item => item.type === 'dir')
    .map(item => ({ ...item, repo: repoName }))
    .reverse();
}

export async function fetchTarball(
  repoName: string,
  dirPath: string,
  branch: string = 'main',
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const url = `${RAW_URL}/${repoName}/${branch}/${dirPath}/plots.tar.gz`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch tarball from ${repoName} (${branch}): ${response.statusText}`);
  }
  return await response.arrayBuffer();
}
