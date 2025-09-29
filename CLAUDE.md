# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start full development environment (Convex + Web + Proxy)
bun run dev

# Start individual services
bun run dev:web          # Vite development server only
bun run dev:convex       # Convex backend only
bun run dev:ts           # TypeScript watch mode

# Build and deployment
bun run build            # Build for production (Vite + TypeScript check)
bun run start            # Start production server
bun run format           # Format code with Prettier
```

## Architecture Overview

This is a **WebContainer-based Claude Code terminal application** that runs the official `@anthropic-ai/claude-code` CLI entirely in the browser. The architecture combines:

### Core Stack
- **TanStack Start**: Full-stack React framework with file-based routing and server functions
- **Convex**: Backend-as-a-service for data persistence and real-time updates
- **WebContainer API**: Browser-based Node.js runtime for running Claude Code CLI
- **xterm.js**: Terminal emulator interface

### Key Architecture Components

#### 1. WebContainer Integration (`src/hooks/useWebContainer.ts`)
- Boots a sandboxed Node.js environment in the browser using StackBlitz's WebContainer API
- Handles OAuth redirects for Claude authentication (`xdg-open` events)
- Provides file system operations and process spawning capabilities
- Auto-installs Claude Code CLI via pnpm in the container

#### 2. Terminal System (`src/components/Terminal.tsx`, `src/hooks/useTerminal.ts`)
- Full terminal emulator using xterm.js with fit addon
- Connects WebContainer processes to terminal interface
- Handles input/output streaming and terminal resizing
- Supports real-time command execution

#### 3. Proxy Layer (`src/routes/api/v1/cors/proxy/$.ts`)
- TanStack server route that proxies all Anthropic API calls
- Handles Claude OAuth flows and authentication
- Filters headers and sets proper CORS policies
- Special handling for `api.anthropic.com` message endpoints

#### 4. File Templates (`src/lib/templates.ts`)
- Pre-configured package.json with Claude Code dependencies
- Shell configuration (jshrc) with aliases and environment variables
- Git wrapper for WebContainer compatibility

### Data Flow

1. **Initialization**: WebContainer boots → mounts templates → installs Claude Code
2. **Authentication**: User runs `claude login` → OAuth handled via proxy → tokens stored in WebContainer
3. **Command Execution**: Terminal commands → WebContainer processes → Claude API calls via proxy
4. **Chat History**: Optional Convex integration for persistent chat sessions

### WebContainer Environment Structure
```
/home/                   # WebContainer working directory
├── .jshrc              # Shell configuration with Claude aliases
├── package.json        # Claude Code and dependencies
├── node_modules/       # Installed packages
│   └── .bin/claude     # Claude CLI executable
└── .global/            # Global packages directory
    ├── src/git.ts      # Git wrapper for WebContainer
    └── package.json    # Global dependencies
```

### Key Files for Development

- `src/components/WebContainerTerminal.tsx` - Main terminal interface component
- `src/hooks/useWebContainer.ts` - WebContainer lifecycle management
- `src/routes/api/v1/cors/proxy/$.ts` - Anthropic API proxy for CORS
- `src/lib/templates.ts` - WebContainer file system templates
- `convex/schema.ts` - Database schema for chat persistence

### Important Notes

- The dev server runs on port 3001 (3000 is proxy target)
- WebContainer requires specific CORS handling for Anthropic APIs
- The application bypasses localhost restrictions by running everything in browser
- Claude authentication uses real OAuth flow through the proxy layer
- All Claude Code CLI features work identically to local installation