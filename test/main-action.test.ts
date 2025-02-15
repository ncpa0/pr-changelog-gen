import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { Octokit } from "@octokit/rest";
import {
  ArgDateFormat,
  ArgExcludePattern,
  ArgExcludePrs,
  ArgGroupByLabels,
  ArgGroupByMatchers,
  ArgIncludePrDescription,
  ArgNoOutput,
  ArgOnlySince,
  ArgOutputFile,
  ArgOutputToStdout,
  ArgPrTitleMatcher,
  ArgSloppy,
  ArgTrace,
  ArgValidLabels,
  ArgVersion,
  MainAction,
} from "../src/main-action";
import type { Config } from "../src/modules/config";
import { ConfigFacade } from "../src/modules/config";
import { ConfigLoader } from "../src/modules/config-loader";
import { EnvvarReader } from "../src/modules/envvar-reader";
import { Logger } from "../src/modules/logger";
import { CliService } from "../src/services/cli";
import type { Constructor } from "../src/utils/dependency-injector/inject";
import { Inject } from "../src/utils/dependency-injector/inject";
import type { Dependencies } from "../src/utils/dependency-injector/service";
import { Service } from "../src/utils/dependency-injector/service";
import type { LoggerMockParams } from "./shared";
import { LoggerMock } from "./shared";

const ALL_ARGS = {
  sloppy: ArgSloppy as Constructor,
  trace: ArgTrace as Constructor,
  version: ArgVersion as Constructor,
  includePrDescription: ArgIncludePrDescription as Constructor,
  prTitleMatcher: ArgPrTitleMatcher as Constructor,
  dateFormat: ArgDateFormat as Constructor,
  validLabels: ArgValidLabels as Constructor,
  outputFile: ArgOutputFile as Constructor,
  onlySince: ArgOnlySince as Constructor,
  groupByLabels: ArgGroupByLabels as Constructor,
  groupByMatchers: ArgGroupByMatchers as Constructor,
  outputToStdout: ArgOutputToStdout as Constructor,
  noOutput: ArgNoOutput as Constructor,
  excludePrs: ArgExcludePrs as Constructor,
  excludePattern: ArgExcludePattern as Constructor,
};

const mockArgument = (value?: string | number | boolean) => {
  return {
    value,
    isSet: value !== undefined,
  };
};

const factory = (
  params: {
    argMocks?: Partial<Record<keyof typeof ALL_ARGS, string | number | boolean>>;
    githubClient?: any;
    cliRun?: (ver: string, packageJson: object) => Promise<void>;
    cliServiceMock?: any;
    config?: Partial<Config>;
    envvars?: Record<string, any>;
  } & LoggerMockParams = {}
) => {
  const {
    argMocks,
    githubClient = { auth() {} },
    cliRun = jest.fn(async () => {}),
    config = {},
    cliServiceMock,
    envvars = {},
  } = params;

  const argDeps: Dependencies = [];

  for (const key of Object.keys(ALL_ARGS) as (keyof typeof ALL_ARGS)[]) {
    argDeps.push([ALL_ARGS[key], mockArgument(argMocks ? argMocks[key] : undefined)]);
  }

  const configLoaderMock = {
    loadConfig: () => Promise.resolve(config),
    loadPackageJson: () => Promise.resolve({}),
  };

  const envvarReaderMock = {
    get: (key: string) => envvars[key],
  };

  const logger = new LoggerMock(params);

  return MainAction.init(
    [ConfigLoader, configLoaderMock],
    [EnvvarReader, envvarReaderMock],
    [CliService, cliServiceMock ?? { run: cliRun }],
    [Octokit, githubClient],
    [Logger, logger],
    ...argDeps
  ).setIsSpawnedFromCli(true);
};

const createCliForConfigTesting = async (
  config?: Partial<Config>,
  argMocks?: Partial<Record<keyof typeof ALL_ARGS, string | number | boolean>>
) => {
  let cli!: CliServiceMock;

  class CliServiceMock extends Service {
    @Inject(() => ConfigFacade)
    declare config: ConfigFacade;

    constructor() {
      super();
      cli = this;
    }

    run() {
      return Promise.resolve();
    }
  }

  const action = factory({
    argMocks,
    config,
    cliServiceMock: CliServiceMock,
  });

  await action.run();

  return cli;
};

const programExitSpy = jest.spyOn(process, "exit");

describe("MainAction", () => {
  beforeAll(() => {
    // @ts-expect-error
    programExitSpy.mockImplementation((): any => {});
  });

  afterEach(() => {
    programExitSpy.mockClear();
  });

  afterAll(() => {
    programExitSpy.mockRestore();
  });

  it("should properly initialize without optional arguments", () => {
    const onPrintError = jest.fn((e: string) => {});

    expect(
      (() => {
        const action = factory({
          argMocks: { version: "1.0.0" },
          logError: onPrintError,
        });
        return action.run();
      })()
    ).resolves.toBe(undefined);

    expect(onPrintError).not.toHaveBeenCalled();
    expect(programExitSpy).not.toHaveBeenCalled();
  });

  it("should run() the cli service", async () => {
    const cliRun = jest.fn(async () => {});
    const action = factory({
      argMocks: { version: "1.0.0" },
      cliRun,
    });

    await action.run();

    expect(cliRun).toHaveBeenCalledTimes(1);
  });

  it("should authenticate the github client if GH_TOKEN env var is defined", async () => {
    const ghClient = { auth: jest.fn() };
    const envvars = { GH_TOKEN: "123" };

    const action = factory({
      argMocks: { version: "1.0.0" },
      githubClient: ghClient,
      envvars,
    });

    await action.run();

    expect(ghClient.auth).toHaveBeenCalledTimes(1);
    expect(ghClient.auth).toHaveBeenCalledWith({ type: "token", token: "123" });
  });

  it("should  not authenticate the github client if GH_TOKEN env var is not defined", async () => {
    const ghClient = { auth: jest.fn() };
    const envvars = {};

    const action = factory({
      argMocks: { version: "1.0.0" },
      githubClient: ghClient,
      envvars,
    });

    await action.run();

    expect(ghClient.auth).toHaveBeenCalledTimes(0);
  });

  describe("should fail when the config values are invalid", () => {
    it("dateFormat", async () => {
      const onPrintError = jest.fn((e: string) => {});

      const action = factory({
        argMocks: { version: "1.0.0" },
        config: {
          // @ts-expect-error
          dateFormat: true,
        },
        logError: onPrintError,
      });

      await action.run();

      expect(onPrintError).toHaveBeenCalledTimes(1);
      expect(programExitSpy).toHaveBeenCalledTimes(1);

      expect(onPrintError).toHaveBeenCalledWith(
        "Invalid config property: 'true' at [config.dateFormat]"
      );
    });

    it("sloppy", async () => {
      const onPrintError = jest.fn((e: string) => {});

      const action = factory({
        argMocks: { version: "1.0.0" },
        config: {
          // @ts-expect-error
          sloppy: "",
        },
        logError: onPrintError,
      });

      await action.run();

      expect(onPrintError).toHaveBeenCalledTimes(1);
      expect(programExitSpy).toHaveBeenCalledTimes(1);

      expect(onPrintError).toHaveBeenCalledWith(
        "Invalid config property: '' at [config.sloppy]"
      );
    });

    it("prTitleMatcher", async () => {
      const onPrintError = jest.fn((e: string) => {});

      const action = factory({
        argMocks: { version: "1.0.0" },
        config: {
          // @ts-expect-error
          prTitleMatcher: ["abc", {}],
        },
        logError: onPrintError,
      });

      await action.run();

      expect(onPrintError).toHaveBeenCalledTimes(1);
      expect(programExitSpy).toHaveBeenCalledTimes(1);

      expect(onPrintError).toHaveBeenCalledWith(
        "Invalid config property: 'abc,[object Object]' at [config.prTitleMatcher]"
      );
    });
  });

  describe("should properly parse config and arguments, and provide the config to the nested services", () => {
    it("all default values should be set", async () => {
      const cli = await createCliForConfigTesting(undefined, { version: "1.0.0" });

      expect(cli).toBeDefined();
      expect(cli.config.get("dateFormat")).toBe(undefined);
      expect(cli.config.get("groupByLabels")).toBe(undefined);
      expect(cli.config.get("groupByMatchers")).toBe(undefined);
      expect(cli.config.get("includePrBody")).toBe(undefined);
      expect(cli.config.get("onlySince")).toBe(undefined);
      expect(cli.config.get("outputFile")).toBe(undefined);
      expect(cli.config.get("prTitleMatcher")).toBe(undefined);
      expect(cli.config.get("sloppy")).toBe(undefined);
      expect(cli.config.get("validLabels")).toBe(undefined);
      expect(cli.config.get("outputToStdout")).toBe(undefined);
    });

    it("all values as defined in config", async () => {
      const config: Partial<Config> = {
        dateFormat: "YYYY-MM-DD",
        groupByLabels: true,
        groupByMatchers: false,
        includePrBody: false,
        onlySince: "2020-01-01",
        outputFile: "./history.md",
        prTitleMatcher: ["^feat", "^fix"],
        sloppy: true,
        validLabels: ["feat", "fix"],
        outputToStdout: true,
      };

      const cli = await createCliForConfigTesting(config, { version: "1.0.0" });

      expect(cli).toBeDefined();
      expect(cli.config.get("dateFormat")).toBe("YYYY-MM-DD");
      expect(cli.config.get("groupByLabels")).toBe(true);
      expect(cli.config.get("groupByMatchers")).toBe(false);
      expect(cli.config.get("includePrBody")).toBe(false);
      expect(cli.config.get("onlySince")).toBe("2020-01-01");
      expect(cli.config.get("outputFile")).toBe("./history.md");
      expect(cli.config.get("prTitleMatcher")).toEqual(["^feat", "^fix"]);
      expect(cli.config.get("sloppy")).toBe(true);
      expect(cli.config.get("validLabels")).toEqual(["feat", "fix"]);
      expect(cli.config.get("outputToStdout")).toBe(true);
    });

    it("arguments should override config settings", async () => {
      const config: Partial<Config> = {
        dateFormat: "YYYY-MM-DD",
        groupByLabels: true,
        groupByMatchers: false,
        includePrBody: false,
        onlySince: "2020-01-01",
        outputFile: "./history.md",
        prTitleMatcher: ["^feat", "^fix"],
        sloppy: true,
        validLabels: ["feat", "fix"],
        outputToStdout: false,
      };

      const cli = await createCliForConfigTesting(config, {
        version: "1.0.0",
        dateFormat: "DD-MM-YYYY",
        includePrDescription: true,
        outputFile: "./CHANGELOG.md",
        validLabels: "bugfix,feature,docs",
      });

      expect(cli).toBeDefined();
      expect(cli.config.get("dateFormat")).toBe("DD-MM-YYYY");
      expect(cli.config.get("groupByLabels")).toBe(true);
      expect(cli.config.get("groupByMatchers")).toBe(false);
      expect(cli.config.get("includePrBody")).toBe(true);
      expect(cli.config.get("onlySince")).toBe("2020-01-01");
      expect(cli.config.get("outputFile")).toBe("./CHANGELOG.md");
      expect(cli.config.get("prTitleMatcher")).toEqual(["^feat", "^fix"]);
      expect(cli.config.get("sloppy")).toBe(true);
      expect(cli.config.get("validLabels")).toEqual(["bugfix", "feature", "docs"]);
      expect(cli.config.get("outputToStdout")).toBe(false);
    });
  });
});
