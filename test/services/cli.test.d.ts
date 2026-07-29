import { ConfigFacade } from "../../src/modules/config";
import type { PullRequest, SemverNumber } from "../../src/shared-types";
import { Repo } from "../../src/utils/repo";
import type { LoggerMockParams } from "../shared";
export type CliFactoryParams = {
  ensureCleanLocalGitState: (githubRepo: Repo) => Promise<void>;
  getMergedPullRequests: (githubRepo: Repo) => Promise<Array<PullRequest>>;
  createChangelog: (
    newVersionNumber: SemverNumber,
    pullRequests: Array<PullRequest>,
    githubRepo: Repo,
  ) => Promise<string>;
  prependFile: (filePath: string, content: string) => Promise<void>;
  config: ConfigFacade;
} & LoggerMockParams;
