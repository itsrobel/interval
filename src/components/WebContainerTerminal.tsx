"use client";

import type { WebContainerProcess } from "@webcontainer/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingState } from "./LoadingState";
import { Terminal, type TerminalHandle } from "./Terminal";
import { TerminalHeader } from "./TerminalHeader";
import { useWebContainer } from "../hooks/useWebContainer";
import { jshrc, templates } from "../lib/templates";

export const WebContainerTerminal = () => {
  const { container, state, mount, spawn, writeFile, readdir } = useWebContainer();
  const [terminalProcess, setTerminalProcess] =
    useState<WebContainerProcess | null>(null);
  const [terminalReady, setTerminalReady] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const terminalComponentRef = useRef<TerminalHandle | null>(null);

  const startShell = useCallback(async () => {
    if (!container || terminalProcess || !terminalReady) return;

    try {
      console.log("Setting up shell configuration...");
      console.log("jshrc content length:", jshrc.length, "bytes");
      await writeFile(".jshrc", jshrc);

      // Verify .jshrc was written correctly
      console.log("Verifying .jshrc file...");
      const catProc = await spawn("cat", [".jshrc"]);
      catProc.output.pipeTo(new WritableStream({
        write(data) { console.log(".jshrc content:", data); }
      }));
      await catProc.exit;

      console.log("Starting shell...");
      // Get current working directory to set as HOME
      const pwdProc = await spawn("pwd", []);
      let cwd = "";
      pwdProc.output.pipeTo(new WritableStream({
        write(data) { cwd = data.trim(); }
      }));
      await pwdProc.exit;

      console.log("Setting HOME to:", cwd);
      const shellProcess = await spawn("jsh", [], {
        env: { HOME: cwd }
      });

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

          // Verify mount completed
          const mountedFiles = await readdir(".");
          console.log("Mounted files:", mountedFiles);

          // Check current working directory
          console.log("Checking current directory...");
          const pwdProc = await spawn("pwd", []);
          pwdProc.output.pipeTo(new WritableStream({
            write(data) { console.log("Current dir:", data); }
          }));
          await pwdProc.exit;

          // Check parent directory structure
          console.log("Checking parent directory...");
          const lsParentProc = await spawn("ls", ["-la", ".."]);
          lsParentProc.output.pipeTo(new WritableStream({
            write(data) { console.log("Parent dir:", data); }
          }));
          await lsParentProc.exit;

          console.log("Creating .global directory structure...");
          const mkdirProc = await spawn("mkdir", ["-p", ".global/src"]);
          mkdirProc.output.pipeTo(new WritableStream({
            write(data) { console.log("mkdir output:", data); }
          }));
          const mkdirExit = await mkdirProc.exit;
          console.log("mkdir exit code:", mkdirExit);
          if (mkdirExit !== 0) {
            throw new Error(`mkdir failed with exit code ${mkdirExit}`);
          }

          console.log("Moving files to .global...");
          const mvGit = await spawn("mv", ["git.ts", ".global/src/git.ts"]);
          mvGit.output.pipeTo(new WritableStream({
            write(data) { console.log("mv git output:", data); }
          }));
          const mvGitExit = await mvGit.exit;
          console.log("mv git exit code:", mvGitExit);
          if (mvGitExit !== 0) {
            throw new Error(`mv git failed with exit code ${mvGitExit}`);
          }

          const mvPkg = await spawn("mv", ["package.json", ".global/package.json"]);
          mvPkg.output.pipeTo(new WritableStream({
            write(data) { console.log("mv package output:", data); }
          }));
          const mvPkgExit = await mvPkg.exit;
          console.log("mv package exit code:", mvPkgExit);
          if (mvPkgExit !== 0) {
            throw new Error(`mv package failed with exit code ${mvPkgExit}`);
          }

          const mvLock = await spawn("mv", ["pnpm-lock.yaml", ".global/pnpm-lock.yaml"]);
          mvLock.output.pipeTo(new WritableStream({
            write(data) { console.log("mv lock output:", data); }
          }));
          const mvLockExit = await mvLock.exit;
          console.log("mv lock exit code:", mvLockExit);
          if (mvLockExit !== 0) {
            throw new Error(`mv lock failed with exit code ${mvLockExit}`);
          }

          // Verify files moved
          console.log("Verifying files in .global...");
          const lsGlobalProc = await spawn("ls", ["-la", ".global"]);
          lsGlobalProc.output.pipeTo(new WritableStream({
            write(data) { console.log("Files in .global:", data); }
          }));
          await lsGlobalProc.exit;

          console.log("Installing dependencies...");
          const pnpmProcess = await spawn("pnpm", ["i", "--prefix", ".global"]);
          pnpmProcess.output.pipeTo(new WritableStream({
            write(data) { console.log("pnpm:", data); }
          }));
          const exitCode = await pnpmProcess.exit;

          if (exitCode !== 0) {
            throw new Error("pnpm install failed");
          }

          // Verify Claude binary was installed
          console.log("Verifying Claude installation...");
          const lsClaudeProc = await spawn("ls", ["-la", ".global/node_modules/.bin/"]);
          lsClaudeProc.output.pipeTo(new WritableStream({
            write(data) { console.log("Binaries installed:", data); }
          }));
          await lsClaudeProc.exit;

          // Test Claude binary
          console.log("Testing Claude binary...");
          const claudeTestProc = await spawn(".global/node_modules/.bin/claude", ["--version"]);
          claudeTestProc.output.pipeTo(new WritableStream({
            write(data) { console.log("Claude version:", data); }
          }));
          await claudeTestProc.exit;

          console.log("Setup complete!");
          setSetupComplete(true);
        } catch (error) {
          console.error("WebContainer setup failed:", error);
        }
      })();
    }
  }, [state.status, container, setupComplete, mount, spawn, readdir]);

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