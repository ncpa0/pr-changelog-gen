import type { Infer } from "dilswer";
import { Type, validator } from "dilswer";

const RegexType = Type.Record({
  regexp: Type.String,
  flags: Type.Option(Type.String),
});

const LabeledRegex = Type.Record({
  regexp: Type.String,
  flags: Type.Option(Type.String),
  label: Type.Option(Type.String),
});

const PrTitleMatcher = Type.OneOf(Type.String, LabeledRegex);

export const ConfigSchema = Type.Record({
  sloppy: Type.Option(Type.Boolean),
  dateFormat: Type.Option(Type.String),
  validLabels: Type.Option(Type.Array(Type.String)),
  prTitleMatcher: Type.Option(Type.OneOf(PrTitleMatcher, Type.Array(PrTitleMatcher))),
  includePrBody: Type.Option(Type.Boolean),
  outputFile: Type.Option(Type.String),
  onlySince: Type.Option(Type.String),
  groupByLabels: Type.Option(Type.Boolean),
  groupByMatchers: Type.Option(Type.Boolean),
  outputToStdout: Type.Option(Type.Boolean),
  noOutput: Type.Option(Type.Boolean),
  excludePrs: Type.Option(Type.Array(Type.String.Int, Type.Int)),
  excludePatterns: Type.Option(
    Type.OneOf(Type.String, Type.Array(Type.String, RegexType))
  ),
});

export type Config = Infer<typeof ConfigSchema>;

export type LabeledRegexp = Infer<typeof LabeledRegex>;

type Defined<T> = Exclude<T, undefined | null>;

export class ConfigFacade {
  private readonly config: Readonly<Config>;

  constructor(config: any = {}, overrides: Config = {}) {
    this.assertConfigType(config);

    const conf = { ...config };

    for (const key of Object.keys(overrides) as (keyof Config)[]) {
      const value = overrides[key];

      if (value != null) {
        Object.assign(conf, { [key]: value });
      }
    }

    this.config = Object.freeze(conf);

    this.validateOnlySince();
  }

  private assertConfigType(config: any): asserts config is Config {
    const validateConfig = validator(ConfigSchema, { details: true });
    const result = validateConfig(config);
    if (!result.success) {
      throw new Error(
        `Invalid config property: 'config.${result.error.fieldPath.replace("$.", "")}'`
      );
    }
  }

  private validateOnlySince() {
    const onlySince = this.config.onlySince;

    if (onlySince) {
      try {
        const date = new Date(onlySince);

        if (date.toString() === "Invalid Date") {
          throw new Error();
        }
      } catch (error) {
        throw new Error(`Invalid date: ${onlySince}`);
      }
    }
  }

  get<K extends keyof Config>(key: K): Config[K];
  get<K extends keyof Config>(
    key: K,
    defaultValue: Defined<Config[K]>
  ): Defined<Config[K]>;
  get(key: keyof Config, defaultValue?: any): any {
    return this.config[key] ?? defaultValue;
  }

  has(key: keyof Config): boolean {
    return this.config[key] != null;
  }
}
