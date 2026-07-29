import type { Octokit } from "@octokit/rest";
import { Mock } from "vitest";
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
export declare const mockConfig: (overrides?: Config, overrideDefaults?: Config) => ConfigFacade;
export declare const mockGithubClient: (overrides?: DeepPartial<InstanceType<typeof Octokit>>) => {
  request: Mock<() => Promise<PullResponse>>;
};
export type LoggerMockParams = {
  logWrite?: Mock<(v: string) => void>;
  logWarn?: Mock<(v: string) => void>;
  logError?: Mock<(v: string) => void>;
};
export declare class LoggerMock implements AsInterface<Logger> {
  constructor(params?: LoggerMockParams);
  warn: Mock<(v: string) => void>;
  write: Mock<(v: string) => void>;
  error: Mock<(v: string) => void>;
}
export {};
