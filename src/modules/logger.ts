import { Output, html } from "termx-markup";
import { Inject } from "../utils/dependency-injector/inject";
import { Service } from "../utils/dependency-injector/service";
import { ConfigFacade } from "./config";

export class Logger extends Service {
  @Inject(() => ConfigFacade)
  private declare config: ConfigFacade;

  private stdout = new Output((v) => process.stdout.write(v));
  private stderr = new Output((v) => process.stderr.write(v));

  private writeToStdout(msg: string) {
    if (this.config.get("noOutput", false) === true) {
      return;
    }
    this.stdout.println(msg);
  }

  private writeToStderr(msg: string) {
    if (this.config.get("noOutput", false) === true) {
      return;
    }
    this.stderr.println(msg);
  }

  write(msg: string, options?: { preformatted?: boolean }) {
    if (options?.preformatted === true) {
      return this.writeToStdout(html`<span><pre>${msg}</pre></span>`);
    }
    return this.writeToStdout(html`<span>${msg}</span>`);
  }

  warn(msg: string) {
    return this.writeToStdout(
      html`
        <span>
          <span bold color="lightYellow">
            Warning:
            <s />
          </span>
          ${msg}
        </span>
      `
    );
  }

  error(msg: string) {
    return this.writeToStderr(
      html`
        <span>
          <span bold color="lightRed">
            Error:
            <s />
          </span>
          ${msg}
        </span>
      `
    );
  }
}
