import type { Octokit } from "@octokit/rest";
import { Mock, vi as jest } from "vitest";
import type { Config } from "../src/modules/config";
import { ConfigFacade } from "../src/modules/config";
import type { Logger } from "../src/modules/logger";
import type { PullResponse } from "../src/services/pull-request-resolver";

type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
  }
  : T;

type AsInterface<C> = {
  [P in keyof C]: C[P];
};

export const mockConfig = (overrides?: Config, overrideDefaults?: Config) => {
  return new ConfigFacade(
    {
      dateFormat: "MMMM d, yyyy",
      groupByLabels: false,
      groupByMatchers: true,
      outputFile: "CHANGELOG.md",
      sloppy: false,
      ...(overrideDefaults ?? {}),
    } satisfies Config,
    overrides,
  );
};

export const mockGithubClient = (
  overrides: DeepPartial<InstanceType<typeof Octokit>> = {},
) => {
  const deepAssign = (target: any, source: any) => {
    for (const [key, value] of Object.entries(source)) {
      if (
        typeof value === "object"
        && value != null
        && Object.getPrototypeOf(value) === Object.prototype
      ) {
        deepAssign(target[key], value);
      } else {
        target[key] = value;
      }
    }
  };

  const client = {
    request: jest.fn(async () => {
      return { data: [] } as PullResponse;
    }),
  };

  deepAssign(client, overrides);

  return client;
};

export type LoggerMockParams = {
  logWrite?: Mock<(v: string) => void>;
  logWarn?: Mock<(v: string) => void>;
  logError?: Mock<(v: string) => void>;
};

export class LoggerMock implements AsInterface<Logger> {
  constructor(params: LoggerMockParams = {}) {
    if (params.logWrite) {
      this.write = params.logWrite;
    }

    if (params.logWarn) {
      this.warn = params.logWarn;
    }

    if (params.logError) {
      this.error = params.logError;
    }
  }

  warn = jest.fn((v: string) => {});

  write = jest.fn((v: string) => {});

  error = jest.fn((v: string) => {});
}
