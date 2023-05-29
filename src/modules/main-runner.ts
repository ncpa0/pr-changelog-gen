import { Service } from "../utils/dependency-injector/service";
import { Logger } from "./logger";

export class MainRunner extends Service {
  async run<R>(
    action: () => Promise<R>,
    options: { trace?: boolean; isSpawnedFromCli: boolean }
  ): Promise<R> {
    try {
      return await action();
    } catch (error) {
      const log = this.spawnService(Logger);

      if (error instanceof Error) {
        log.error(error.message);
        if (options.trace) {
          log.error(error.stack ?? "");
        }
      } else {
        log.error(String(error));
      }

      if (options.isSpawnedFromCli) {
        process.exit(1);
      } else {
        throw error;
      }
    }
  }
}
