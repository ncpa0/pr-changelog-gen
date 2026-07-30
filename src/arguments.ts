import { defineOption } from "clify.js";

export const ArgIncludePrDescription = defineOption({
  name: "include-pr-description",
  char: "n",
  type: "boolean",
  description: "Include the description of each pull request in the changelog. Default: true.",
  default: true,
  required: true,
});

export const ArgPrTitleMatcher = defineOption({
  name: "pr-title-matcher",
  char: "p",
  type: "string",
  description:
    "A regex patter that will be used to determine if a Pull Request should be included in the changelog. Default: /^feat|fix[:\\/\\(].+/i",
});

export const ArgDateFormat = defineOption({
  name: "date-format",
  char: "d",
  type: "string",
  description: "The date format to use in the changelog. Default: MMMM d, yyyy",
});

export const ArgValidLabels = defineOption({
  name: "valid-labels",
  char: "l",
  type: "string",
  description:
    "A comma separated list of PR labels. If a PR has a matching label it will be included in the changelog.",
});

export const ArgOutputFile = defineOption({
  name: "output-file",
  char: "o",
  type: "string",
  description: "The file to write the changelog to. Default: <cwd>/CHANGELOG.md",
});

export const ArgOnlySince = defineOption({
  name: "only-since",
  char: "c",
  type: "string",
  description:
    "Only include PRs merged since the given date. This option overrides the default behavior of only including PRs merged since the last tag was created.",
});

export const ArgGroupByLabels = defineOption({
  name: "group-by-labels",
  char: "g",
  type: "boolean",
  description: "Group PRs in the changelog by labels. Default: false.",
});

export const ArgGroupByMatchers = defineOption({
  name: "group-by-matchers",
  char: "m",
  type: "boolean",
  description: "Group PRs in the changelog by PR matchers. Default: true.",
});

export const ArgSloppy = defineOption({
  name: "sloppy",
  char: "s",
  type: "boolean",
  description: "Skip ensuring clean local git state. Default: false.",
});

export const ArgTrace = defineOption({
  name: "trace",
  char: "t",
  type: "boolean",
  description: "Show stack traces for any error. Default: false.",
  default: false,
  required: true,
});

export const ArgVersion = defineOption({
  name: "target-version",
  char: "v",
  type: "string",
  description: "[Required] The version number of the release the changelog is being created for.",
  required: true,
});

export const ArgOutputToStdout = defineOption({
  name: "output-to-stdout",
  char: "u",
  type: "boolean",
  description: "Output the changelog to stdout instead of writing to a file. Default: false.",
});

export const ArgNoOutput = defineOption({
  name: "no-output",
  char: "q",
  type: "boolean",
  description: "When enabled generated changelog will not be written to any file or printed to stdout. Default: false.",
});

export const ArgExcludePrs = defineOption({
  name: "exclude-prs",
  char: "e",
  type: "string",
  description: "A comma separated list of PR numbers to exclude from the changelog.",
});

export const ArgExcludePattern = defineOption({
  name: "exclude-pattern",
  char: "x",
  type: "string",
  description:
    "A regex pattern that will be used to determine if a Pull Request should be excluded from the changelog.",
});
