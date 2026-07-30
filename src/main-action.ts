import { Octokit } from "@octokit/rest";
import { CommandInitPhase, OptConstructor, OptionType } from "clify.js";
import { Type, validator } from "dilswer";
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
} from "./arguments";
import { ConfigFacade } from "./modules/config";
import { ConfigLoader } from "./modules/config-loader";
import { EnvvarReader } from "./modules/envvar-reader";
import { MainRunner } from "./modules/main-runner";
import { CliService } from "./services/cli";
import { Inject } from "./utils/dependency-injector/inject";
import { Service } from "./utils/dependency-injector/service";

export * from "./arguments";

function initOpt<T extends OptionType, R extends boolean>(
  Constructor: OptConstructor<T, R>,
  service: MainAction,
) {
  return service.cmd.option(Constructor);
}

export class MainAction extends Service {
  constructor(private isSpawnedFromCli: boolean, public cmd: CommandInitPhase) {
    super();
  }

  @Inject(ArgSloppy, { init: initOpt, initAfterSuper: true })
  declare private sloppy: InstanceType<typeof ArgSloppy>;

  @Inject(ArgTrace, { init: initOpt, initAfterSuper: true })
  declare private trace: InstanceType<typeof ArgTrace>;

  @Inject(ArgVersion, { init: initOpt, initAfterSuper: true })
  declare private version: InstanceType<typeof ArgVersion>;

  @Inject(ArgIncludePrDescription, { init: initOpt, initAfterSuper: true })
  declare private includePrDescription: InstanceType<typeof ArgIncludePrDescription>;

  @Inject(ArgPrTitleMatcher, { init: initOpt, initAfterSuper: true })
  declare private prTitleMatcher: InstanceType<typeof ArgPrTitleMatcher>;

  @Inject(ArgDateFormat, { init: initOpt, initAfterSuper: true })
  declare private dateFormat: InstanceType<typeof ArgDateFormat>;

  @Inject(ArgValidLabels, { init: initOpt, initAfterSuper: true })
  declare private validLabels: InstanceType<typeof ArgValidLabels>;

  @Inject(ArgOutputFile, { init: initOpt, initAfterSuper: true })
  declare private outputFile: InstanceType<typeof ArgOutputFile>;

  @Inject(ArgOnlySince, { init: initOpt, initAfterSuper: true })
  declare private onlySince: InstanceType<typeof ArgOnlySince>;

  @Inject(ArgGroupByLabels, { init: initOpt, initAfterSuper: true })
  declare private groupByLabels: InstanceType<typeof ArgGroupByLabels>;

  @Inject(ArgGroupByMatchers, { init: initOpt, initAfterSuper: true })
  declare private groupByMatchers: InstanceType<typeof ArgGroupByMatchers>;

  @Inject(ArgOutputToStdout, { init: initOpt, initAfterSuper: true })
  declare private outputToStdout: InstanceType<typeof ArgOutputToStdout>;

  @Inject(ArgNoOutput, { init: initOpt, initAfterSuper: true })
  declare private noOutput: InstanceType<typeof ArgNoOutput>;

  @Inject(ArgExcludePrs, { init: initOpt, initAfterSuper: true })
  declare private excludePrs: InstanceType<typeof ArgExcludePrs>;

  @Inject(ArgExcludePattern, { init: initOpt, initAfterSuper: true })
  declare private excludePatterns: InstanceType<typeof ArgExcludePattern>;

  @Inject(Octokit)
  declare private githubClient: InstanceType<typeof Octokit>;

  @Inject(ConfigLoader)
  declare private configLoader: ConfigLoader;

  @Inject(EnvvarReader)
  declare private envvarReader: EnvvarReader;

  @Inject(MainRunner)
  declare private runner: MainRunner;

  public async run() {
    return this.runner.run(
      async () => {
        const GH_TOKEN = this.envvarReader.get("GH_TOKEN");

        const packageConfig = await this.configLoader.loadConfig();

        const isNumeric = validator(Type.String.Int);

        const config = new ConfigFacade(packageConfig, {
          prTitleMatcher: this.prTitleMatcher.value,
          dateFormat: this.dateFormat.value,
          validLabels: this.validLabels.value?.split(","),
          sloppy: this.sloppy.value,
          outputFile: this.outputFile.value,
          onlySince: this.onlySince.value,
          groupByLabels: this.groupByLabels.value,
          groupByMatchers: this.groupByMatchers.value,
          includePrBody: this.includePrDescription.value,
          outputToStdout: this.outputToStdout.value,
          noOutput: this.noOutput.value,
          excludePrs: this.excludePrs.value?.split(",").filter(isNumeric),
          excludePatterns: this.excludePatterns.value,
        });

        if (GH_TOKEN) {
          this.githubClient.auth({ type: "token", token: GH_TOKEN });
        }

        Service.setDefaultDependency(ConfigFacade, config);
        Service.setDefaultDependency(Octokit, this.githubClient);

        // Must be initialized after the the above defaults are set
        const cli = this.spawnService(CliService);

        return await cli.run(
          this.version.value,
          await this.configLoader.loadPackageJson(),
        );
      },
      {
        trace: this.trace.value,
        isSpawnedFromCli: this.isSpawnedFromCli,
      },
    );
  }
}
