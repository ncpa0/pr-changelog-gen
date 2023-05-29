import { describe, expect, it, jest } from "@jest/globals";
import { ConfigFacade } from "../../src/modules/config";
import { Filesystem } from "../../src/modules/filesystem";
import { Logger } from "../../src/modules/logger";
import { ChangelogGeneratorService } from "../../src/services/changelog-generator";
import { CliService } from "../../src/services/cli";
import { GitService } from "../../src/services/git";
import { PullRequestResolverService } from "../../src/services/pull-request-resolver";
import { Repo } from "../../src/utils/repo";
import type { LoggerMockParams } from "../shared";
import { LoggerMock, mockConfig } from "../shared";
import type { PullRequest, SemverNumber } from "../shared-types";

export type CliFactoryParams = {
  ensureCleanLocalGitState: (githubRepo: Repo) => Promise<void>;
  getMergedPullRequests: (githubRepo: Repo) => Promise<Array<PullRequest>>;
  createChangelog: (
    newVersionNumber: SemverNumber,
    pullRequests: Array<PullRequest>,
    githubRepo: Repo
  ) => Promise<string>;
  prependFile: (filePath: string, content: string) => Promise<void>;
  config: ConfigFacade;
} & LoggerMockParams;

function createCli(params: Partial<CliFactoryParams> = {}) {
  params.ensureCleanLocalGitState ??= jest.fn(async () => {});
  params.prependFile ??= jest.fn(async () => {});
  params.createChangelog ??= jest.fn(async () => "");
  params.config ??= mockConfig();

  params.getMergedPullRequests ??= jest.fn(async () => [
    { id: 1, title: "", mergedAt: new Date() } satisfies PullRequest,
  ]);

  const loggerMock = new LoggerMock(params);

  return CliService.init(
    [ConfigFacade, params.config],
    [ChangelogGeneratorService, { create: params.createChangelog }],
    [PullRequestResolverService, { getMerged: params.getMergedPullRequests }],
    [Filesystem, { prepend: params.prependFile }],
    [GitService, { ensureCleanLocalGitState: params.ensureCleanLocalGitState }],
    [Logger, loggerMock]
  );
}

jest.spyOn(process, "cwd").mockReturnValue("/foo");

const packageInfo = { repository: { url: "https://github.com/foo/bar.git" } };

describe("CliService", () => {
  it("throws if no version number was specified", async () => {
    const cli = createCli();

    await expect(() => cli.run(undefined, packageInfo)).rejects.toThrow(
      expect.objectContaining({ message: "version-number not specified" })
    );
  });

  it("throws if an invalid version number was specified", async () => {
    const cli = createCli();

    await expect(() => cli.run("a.b.c", packageInfo)).rejects.toThrow(
      expect.objectContaining({ message: "version-number is invalid" })
    );
  });

  it("throws if the repository is dirty", async () => {
    const ensureCleanLocalGitState = jest.fn(() => {
      throw new Error("Local copy is not clean");
    });
    const cli = createCli({ ensureCleanLocalGitState });

    await expect(() => cli.run("1.0.0", packageInfo)).rejects.toThrow(
      expect.objectContaining({ message: "Local copy is not clean" })
    );
  });

  it("does not throw if the repository is dirty", async () => {
    const ensureCleanLocalGitState = jest.fn(() => {
      throw new Error("Local copy is not clean");
    });
    const createChangelog = jest.fn(async () => "sloppy changelog");
    const prependFile = jest.fn(async () => {});
    const cli = createCli({
      prependFile,
      ensureCleanLocalGitState,
      createChangelog,
      config: mockConfig({ sloppy: true }),
    });

    await cli.run("1.0.0", packageInfo);

    expect(prependFile).toHaveBeenCalledTimes(1);
    expect(prependFile).toHaveBeenCalledWith("/foo/CHANGELOG.md", "sloppy changelog");
  });

  it("reports the generated changelog", async () => {
    const createChangelog = jest.fn(async () => "generated changelog");
    const ensureCleanLocalGitState = jest.fn(async () => {});
    const prependFile = jest.fn(async () => {});
    const getMergedPullRequests = jest.fn(async () => [
      { id: 1, title: "", mergedAt: new Date() } satisfies PullRequest,
    ]);

    const cli = createCli({
      createChangelog,
      getMergedPullRequests,
      ensureCleanLocalGitState,
      prependFile,
    });

    const expectedGithubRepo = new Repo("foo", "bar");

    await cli.run("1.0.0", packageInfo);

    expect(ensureCleanLocalGitState).toHaveBeenCalledTimes(1);
    expect(ensureCleanLocalGitState).toHaveBeenCalledWith(expectedGithubRepo);

    expect(getMergedPullRequests).toHaveBeenCalledTimes(1);
    expect(getMergedPullRequests).toHaveBeenCalledWith(expectedGithubRepo);

    expect(createChangelog).toHaveBeenCalledTimes(1);
    expect(createChangelog).toHaveBeenCalledWith(
      "1.0.0",
      expect.any(Array),
      expectedGithubRepo
    );

    expect(prependFile).toHaveBeenCalledTimes(1);
    expect(prependFile).toHaveBeenCalledWith("/foo/CHANGELOG.md", "generated changelog");
  });

  it("strips trailing empty lines from the generated changelog", async () => {
    const createChangelog = jest.fn(
      async () => "generated\nchangelog\nwith\n\na\nlot\n\nof\nempty\nlines\n\n"
    );
    const prependFile = jest.fn(async () => {});

    const cli = createCli({ createChangelog, prependFile });

    await cli.run("1.0.0", packageInfo);

    expect(prependFile).toHaveBeenCalledTimes(1);
    expect(prependFile).toHaveBeenCalledWith(
      "/foo/CHANGELOG.md",
      "generated\nchangelog\nwith\n\na\nlot\n\nof\nempty\nlines\n"
    );
  });

  it("prints the generated changelog when `outputToStdout` is enabled", async () => {
    const onStdoutWrite = jest.fn((v: string) => {});

    const cli = createCli({
      config: mockConfig({ outputToStdout: true }),
      logWrite: onStdoutWrite,
      createChangelog: async () => "generated changelog",
    });

    await cli.run("1.0.0", packageInfo);

    expect(onStdoutWrite).toHaveBeenCalledTimes(1);
    expect(onStdoutWrite).toHaveBeenCalledWith("generated changelog");
  });

  it("prints a warning when no pull requests were found", async () => {
    const onWarn = jest.fn((v: string) => {});

    const cli = createCli({
      config: mockConfig({ outputToStdout: true }),
      logWarn: onWarn,
      getMergedPullRequests: async () => [],
    });

    await cli.run("1.0.0", packageInfo);

    expect(onWarn).toHaveBeenCalledTimes(1);
    expect(onWarn).toHaveBeenCalledWith("No valid pull requests found.");
  });
});
