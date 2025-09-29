import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useCallback, useEffect, useRef, useState } from "react";

type UseTerminalOptions = {
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
};

type UseTerminalReturn = {
  terminalRef: React.RefObject<HTMLDivElement | null>;
  terminal: Terminal | null;
  write: (data: string) => void;
  fit: () => void;
  cols: number;
  rows: number;
};

export const useTerminal = ({
  onData,
  onResize,
}: UseTerminalOptions): UseTerminalReturn => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [fitAddon, setFitAddon] = useState<FitAddon | null>(null);
  const [cols, setCols] = useState(80);
  const [rows, setRows] = useState(24);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: "#000000",
        foreground: "#ffffff",
        cursor: "#ffffff",
      },
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
      fontSize: 14,
      cursorBlink: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);

    term.open(terminalRef.current);
    fit.fit();

    setCols(term.cols);
    setRows(term.rows);

    if (onData) {
      term.onData(onData);
    }

    if (onResize) {
      term.onResize(({ cols, rows }) => {
        setCols(cols);
        setRows(rows);
        onResize(cols, rows);
      });
    }

    setTerminal(term);
    setFitAddon(fit);

    return () => {
      term.dispose();
    };
  }, [onData, onResize]);

  const write = useCallback(
    (data: string) => {
      terminal?.write(data);
    },
    [terminal],
  );

  const fit = useCallback(() => {
    fitAddon?.fit();
    if (terminal) {
      setCols(terminal.cols);
      setRows(terminal.rows);
    }
  }, [fitAddon, terminal]);

  return {
    terminalRef,
    terminal,
    write,
    fit,
    cols,
    rows,
  };
};