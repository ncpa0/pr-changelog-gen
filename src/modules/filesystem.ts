import { readFile, writeFile } from "node:fs/promises";

export class Filesystem {
  async prepend(name: string, data: string) {
    if (!name) throw new Error(`name could not be empty`);
    if (!data) throw new Error(`data could not be empty`);

    const [error, result] = await readFile(name, "utf8")
      .then((res) => [null, res] as const)
      .catch((err: Error) => [err, null] as const);

    if (error && "code" in error && error.code !== "ENOENT") throw error;

    if (result) data = data + "\n" + result;

    await writeFile(name, data);
  }
}
