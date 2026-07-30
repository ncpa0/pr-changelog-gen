import { configure } from "clify.js";
import "reflect-metadata";
import { MainAction } from "./main-action";

const program = configure((main) => {
  main.setName("pr-changelog-gen");
  main.setDescription("Generate a changelog from merged pull requests.");

  main.main((cmd) => {
    const main = MainAction.new({ args: [true, cmd] });
    return () => main.run();
  });
});

program.run();
