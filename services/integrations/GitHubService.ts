import { db, DBInstance } from "@/db";
import { tables } from "@/db/tables";
import { eq, and } from "drizzle-orm";

export class GitHubService {
  /**
   * Retrieves the GitHub access token for a user from the account table.
   */
  async getGitHubToken(userId: string, tx: DBInstance = db): Promise<string | null> {
    const [acc] = await tx
      .select({ accessToken: tables.account.accessToken })
      .from(tables.account)
      .where(and(eq(tables.account.userId, userId), eq(tables.account.providerId, "github")))
      .limit(1);
    return acc?.accessToken || null;
  }

  /**
   * Fetches repositories the user has access to.
   */
  async getRepos(userId: string): Promise<any[]> {
    const token = await this.getGitHubToken(userId);
    if (!token) return [];

    const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Aika-Time-Tracker",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("GitHub integration unauthorized. Please log in with GitHub again.");
      }
      throw new Error(`GitHub API Error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.map((repo: any) => ({
      id: repo.id.toString(),
      name: repo.full_name,
      url: repo.html_url,
    }));
  }

  /**
   * Fetches recent commits in a repository.
   */
  async getCommits(userId: string, repoFullName: string): Promise<any[]> {
    const token = await this.getGitHubToken(userId);
    if (!token) throw new Error("GitHub integration not connected");

    const res = await fetch(`https://api.github.com/repos/${repoFullName}/commits?per_page=30`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Aika-Time-Tracker",
      },
    });

    if (!res.ok) {
      throw new Error(`GitHub API Error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.map((item: any) => ({
      sha: item.sha,
      message: item.commit.message,
      url: item.html_url,
      author: item.commit.author.name,
      date: item.commit.author.date,
    }));
  }

  /**
   * Fetches recent pull requests in a repository.
   */
  async getPullRequests(userId: string, repoFullName: string): Promise<any[]> {
    const token = await this.getGitHubToken(userId);
    if (!token) throw new Error("GitHub integration not connected");

    const res = await fetch(`https://api.github.com/repos/${repoFullName}/pulls?state=all&per_page=30`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Aika-Time-Tracker",
      },
    });

    if (!res.ok) {
      throw new Error(`GitHub API Error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.map((pr: any) => ({
      number: pr.number.toString(),
      title: pr.title,
      url: pr.html_url,
      state: pr.state,
      user: pr.user.login,
      date: pr.created_at,
    }));
  }
}

export const githubService = new GitHubService();
