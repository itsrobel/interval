"use client";

import type { WebContainerProcess } from "@webcontainer/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { Terminal, type TerminalHandle } from "./Terminal";
import { useWebContainer } from "../hooks/useWebContainer";
import { templates, jshrc } from "../lib/templates";
import { wait } from "../utils/wait";

export const WebContainerTerminal = () => {
  const { container, state, mount, spawn, writeFile } = useWebContainer();
  const [terminalProcess, setTerminalProcess] = useState<WebContainerProcess | null>(null);
  const [terminalReady, setTerminalReady] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const terminalComponentRef = useRef<TerminalHandle | null>(null);

  const startShell = useCallback(async () => {
    if (!container || terminalProcess || !terminalReady) return;

    try {
      await spawn("rm", ["~/.jshrc"]);
      await writeFile(".jshrc", jshrc);
      await spawn("mv", [".jshrc", "../.jshrc"]);
      await spawn("source", ["~/.jshrc"]);

      await spawn("mkdir", ["-p", "../.global"]);

      const shellProcess = await spawn("jsh");

      setTerminalProcess(shellProcess);

      if (terminalComponentRef.current) {
        await terminalComponentRef.current.connectProcess(shellProcess);
        terminalComponentRef.current.fit();
      } else {
        console.error("Terminal ref not available");
      }
    } catch (error) {
      console.error("Failed to start shell:", error);
    }
  }, [container, spawn, terminalProcess, terminalReady, writeFile]);

  const handleTerminalReady = useCallback(() => {
    setTerminalReady(true);
  }, []);

  useEffect(() => {
    if (state.status === "ready" && container) {
      // Load and mount the selected template
      (async () => {
        await mount(await templates["global"]());

        await wait(1000);

        await spawn("mkdir", ["-p", "../.global/src"]);
        await spawn("mv", ["git.ts", "../.global/src/git.ts"]);
        await spawn("mv", ["package.json", "../.global/package.json"]);
        await spawn("mv", ["pnpm-lock.yaml", "../.global/pnpm-lock.yaml"]);

        const pnpmProcess = await spawn("pnpm", ["i", "--prefix", "../.global"]);
        const exitCode = await pnpmProcess.exit;
        if (exitCode !== 0) {
          throw new Error('pnpm install failed');
        }

        setSetupComplete(true);
      })();
    }
  }, [state.status, container, mount, spawn]);

  useEffect(() => {
    if (
      state.status === "ready" &&
      container &&
      terminalReady &&
      !terminalProcess
    ) {
      startShell();
    }
  }, [state.status, container, terminalReady, terminalProcess, startShell]);

  const handleTerminalResize = useCallback(
    (cols: number, rows: number) => {
      terminalProcess?.resize({ cols, rows });
    },
    [terminalProcess],
  );

  if (state.status === "idle" || state.status === "booting" || !setupComplete) {
    return (
      <div className="flex h-screen w-screen flex-col bg-zinc-950">
        <div className="flex-shrink-0 border-b border-zinc-700 bg-zinc-800 p-4">
          <h1 className="text-2xl font-bold text-white">
            Claude Code Terminal
          </h1>
          <p className="text-sm text-zinc-400">
            {state.status === "booting" ? "Booting WebContainer..." : "Setting up Claude Code environment..."}
          </p>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-hidden">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="text-6xl">🤖</div>
            <h2 className="font-bold text-2xl text-white">
              {state.status === "booting" ? "Booting WebContainer..." : "Installing Claude Code..."}
            </h2>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex h-screen w-screen flex-col bg-zinc-950">
        <div className="flex-shrink-0 border-b border-zinc-700 bg-zinc-800 p-4">
          <h1 className="text-2xl font-bold text-white">
            Claude Code Terminal
          </h1>
          <p className="text-sm text-zinc-400">
            WebContainer failed to initialize
          </p>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-hidden">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="text-6xl">💥</div>
            <h1 className="font-bold text-2xl text-red-500">
              WebContainer Error
            </h1>
            <p className="max-w-md text-sm text-zinc-400">
              {state.error?.message || "Failed to initialize WebContainer"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-zinc-950">
      <div className="flex-shrink-0 border-b border-zinc-700 bg-zinc-800 p-4">
        <h1 className="text-2xl font-bold text-white">
          Claude Code Terminal
        </h1>
        <p className="text-sm text-zinc-400">
          Run <code className="bg-zinc-700 px-1 rounded">claude login</code> to get started, then use Claude Code commands
        </p>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="relative flex-1 overflow-hidden p-0 sm:p-2">
            <div className="absolute inset-0 overflow-auto rounded-none border-0 border-zinc-800 bg-black shadow-2xl sm:inset-2 sm:overflow-hidden sm:rounded-lg sm:border">
              <Terminal
                ref={terminalComponentRef}
                className="h-full w-full"
                onResize={handleTerminalResize}
                onReady={handleTerminalReady}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};