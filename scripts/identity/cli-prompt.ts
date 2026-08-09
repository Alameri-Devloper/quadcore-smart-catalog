import { createInterface } from "node:readline/promises";

export interface IdentityCliPrompt {
  text(label: string): Promise<string>;
  hidden(label: string): Promise<string>;
}

export class NodeIdentityCliPrompt implements IdentityCliPrompt {
  async text(label: string): Promise<string> {
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    try { return await prompt.question(`${label}: `); }
    finally { prompt.close(); }
  }

  async hidden(label: string): Promise<string> {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
      throw new Error("InteractiveTerminalRequired");
    }
    process.stdout.write(`${label}: `);
    const wasRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true);
    process.stdin.resume();
    return new Promise<string>((resolve, reject) => {
      let value = "";
      const cleanup = () => {
        process.stdin.off("data", onData);
        process.stdin.setRawMode(Boolean(wasRaw));
        process.stdin.pause();
        process.stdout.write("\n");
      };
      const onData = (chunk: Buffer | string) => {
        const characters = chunk.toString("utf8");
        for (const character of characters) {
          if (character === "\r" || character === "\n") {
            cleanup();
            resolve(value);
            return;
          }
          if (character === "\u0003") {
            cleanup();
            reject(new Error("PromptCancelled"));
            return;
          }
          if (character === "\u007f" || character === "\b") {
            value = Array.from(value).slice(0, -1).join("");
          } else if (character >= " ") {
            value += character;
          }
        }
      };
      process.stdin.on("data", onData);
    });
  }
}
