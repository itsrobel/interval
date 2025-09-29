import type { FileSystemTree } from "@webcontainer/api";

// jshrc configuration for shell
export const jshrc = `export DISABLE_TELEMETRY=1
export PATH="$HOME/.global/node_modules/.bin:$PATH"
alias claude=$HOME/.global/node_modules/.bin/claude
alias isogit=$HOME/.global/node_modules/.bin/isogit
alias tsx=$HOME/.global/node_modules/.bin/tsx
alias git="$HOME/.global/node_modules/.bin/tsx $HOME/.global/src/git.ts"
`;

// Git wrapper for WebContainer
export const gitWrapper = `import { spawn } from "node:child_process";
import { promises as fs } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const git = async (...args) => {
  const gitProcess = spawn("git", args, { stdio: "inherit", shell: true });

  gitProcess.on("error", (error) => {
    console.error("Git command error:", error);
  });

  gitProcess.on("close", (code) => {
    process.exit(code);
  });
};

git(...process.argv.slice(2));
`;

export const templates = {
  global: async (): Promise<FileSystemTree> => {
    return {
      "package.json": {
        file: {
          contents: JSON.stringify({
            name: "global-packages",
            type: "module",
            devDependencies: {
              "@anthropic-ai/claude-code": "latest",
              "isomorphic-git": "latest",
              "tsx": "latest"
            }
          }, null, 2)
        }
      },
      "git.ts": {
        file: {
          contents: gitWrapper
        }
      },
      "pnpm-lock.yaml": {
        file: {
          contents: ""
        }
      }
    };
  },
} as const;