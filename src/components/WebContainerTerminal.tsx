"use client";

import type { WebContainerProcess } from "@webcontainer/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingState } from "./LoadingState";
import { Terminal, type TerminalHandle } from "./Terminal";
import { TerminalHeader } from "./TerminalHeader";
import { useWebContainer } from "../hooks/useWebContainer";
import { jshrc, templates } from "../lib/templates";

export const WebContainerTerminal = () => {
  const { container, state, mount, spawn, writeFile } = useWebContainer();
  const [terminalProcess, setTerminalProcess] =
    useState<WebContainerProcess | null>(null);
  const [terminalReady, setTerminalReady] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const terminalComponentRef = useRef<TerminalHandle | null>(null);

  const startShell = useCallback(async () => {
    if (!container || terminalProcess || !terminalReady) return;

    try {
      console.log("Setting up shell configuration...");
      await writeFile("../.jshrc", jshrc);

      console.log("Starting shell...");
      const shellProcess = await spawn("jsh");

      setTerminalProcess(shellProcess);

      if (terminalComponentRef.current) {
        await terminalComponentRef.current.connectProcess(shellProcess);
        terminalComponentRef.current.fit();
        console.log("Shell started successfully!");
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
    if (state.status === "ready" && container && !setupComplete) {
      // Load and mount the selected template
      (async () => {
        try {
          console.log("Mounting file system...");
          await mount(await templates["global"]());

          console.log("Organizing files...");
          await spawn("mkdir", ["-p", "../.global/src"]);
          await spawn("mv", ["git.ts", "../.global/src/git.ts"]);
          await spawn("mv", ["package.json", "../.global/package.json"]);
          await spawn("mv", ["pnpm-lock.yaml", "../.global/pnpm-lock.yaml"]);

          console.log("Installing dependencies...");
          const pnpmProcess = await spawn("pnpm", ["i", "--prefix", "../.global"]);
          const exitCode = await pnpmProcess.exit;

          if (exitCode !== 0) {
            throw new Error("pnpm install failed");
          }

          console.log("Setup complete!");
          setSetupComplete(true);
        } catch (error) {
          console.error("WebContainer setup failed:", error);
        }
      })();
    }
  }, [state.status, container, setupComplete, mount, spawn]);

  useEffect(() => {
    if (
      state.status === "ready" &&
      container &&
      terminalReady &&
      !terminalProcess &&
      setupComplete
    ) {
      startShell();
    }
  }, [
    state.status,
    container,
    terminalReady,
    terminalProcess,
    setupComplete,
    startShell,
  ]);

  const handleTerminalResize = useCallback(
    (cols: number, rows: number) => {
      terminalProcess?.resize({ cols, rows });
    },
    [terminalProcess],
  );

  if (state.status === "idle" || state.status === "booting" || !setupComplete) {
    return (
      <div className="flex h-screen w-screen flex-col bg-zinc-950">
        <TerminalHeader status={state.status} />
        <div className="flex flex-1 overflow-hidden">
          <LoadingState className="flex-1" />
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex h-screen w-screen flex-col bg-zinc-950">
        <TerminalHeader status={state.status} />
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
      <TerminalHeader status={state.status} />
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