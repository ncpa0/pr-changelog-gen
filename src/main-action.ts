import { Octokit } from "@octokit/rest";
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

export class MainAction extends Service {
  @Inject(() => ArgSloppy)
  declare private sloppy: InstanceType<typeof ArgSloppy>;

  @Inject(() => ArgTrace)
  declare private trace: InstanceType<typeof ArgTrace>;

  @Inject(() => ArgVersion)
  declare private version: InstanceType<typeof ArgVersion>;

  @Inject(() => ArgIncludePrDescription)
  declare private includePrDescription: InstanceType<typeof ArgIncludePrDescription>;

  @Inject(() => ArgPrTitleMatcher)
  declare private prTitleMatcher: InstanceType<typeof ArgPrTitleMatcher>;

  @Inject(() => ArgDateFormat)
  declare private dateFormat: InstanceType<typeof ArgDateFormat>;

  @Inject(() => ArgValidLabels)
  declare private validLabels: InstanceType<typeof ArgValidLabels>;

  @Inject(() => ArgOutputFile)
  declare private outputFile: InstanceType<typeof ArgOutputFile>;

  @Inject(() => ArgOnlySince)
  declare private onlySince: InstanceType<typeof ArgOnlySince>;

  @Inject(() => ArgGroupByLabels)
  declare private groupByLabels: InstanceType<typeof ArgGroupByLabels>;

  @Inject(() => ArgGroupByMatchers)
  declare private groupByMatchers: InstanceType<typeof ArgGroupByMatchers>;

  @Inject(() => ArgOutputToStdout)
  declare private outputToStdout: InstanceType<typeof ArgOutputToStdout>;

  @Inject(() => ArgNoOutput)
  declare private noOutput: InstanceType<typeof ArgNoOutput>;

  @Inject(() => ArgExcludePrs)
  declare private excludePrs: InstanceType<typeof ArgExcludePrs>;

  @Inject(() => ArgExcludePattern)
  declare private excludePatterns: InstanceType<typeof ArgExcludePattern>;

  @Inject(() => Octokit)
  declare private githubClient: InstanceType<typeof Octokit>;

  @Inject(() => ConfigLoader)
  declare private configLoader: ConfigLoader;

  @Inject(() => EnvvarReader)
  declare private envvarReader: EnvvarReader;

  @Inject(() => MainRunner)
  declare private runner: MainRunner;

  private isSpawnedFromCli = false;

  /**
   * Set whether the action is spawned from the CLI or not. When this
   * is set to true, program will be terminated if an error occurs.
   *
   * If you are using this action from a node script, avoid this function.
   *
   * @default false
   * @internal
   */
  public setIsSpawnedFromCli(v: boolean) {
    this.isSpawnedFromCli = v;
    return this;
  }

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
