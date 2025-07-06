import { spawn } from "child_process";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { experimental_readRawConfig, readConfig } from "./config";
import { resolveWranglerConfigPath } from "./config/config-helpers";
import { logger } from "./logger";
import type { Config, RawConfig } from "./config";

interface OpenCodeArgs {
	prompt?: string;
	[key: string]: unknown;
}

interface ProjectContext {
	wranglerConfig?: Config;
	rawConfig?: RawConfig;
	configFiles: string[];
	projectRoot: string;
	workersRuntime?: string;
	bindings: {
		kv_namespaces: unknown[];
		durable_objects: unknown[];
		r2_buckets: unknown[];
		d1_databases: unknown[];
		queues: unknown[];
		services: unknown[];
		analytics_engine_datasets: unknown[];
		ai?: unknown;
		browser?: unknown;
		vectorize: unknown[];
		hyperdrive: unknown[];
		workflows: unknown[];
		mtls_certificates: unknown[];
		dispatch_namespaces: unknown[];
		vars: Record<string, unknown>;
		secrets: string[];
	};
	environment?: string;
	accountId?: string;
	workerName?: string;
}

/**
 * Main entry point for OpenCode integration
 * Always launches interactive mode, with optional initial prompt
 */
export async function launchOpenCode(args: OpenCodeArgs): Promise<void> {
	try {
		// Gather project context
		const context = await gatherProjectContext();

		// Extract initial prompt if provided
		const initialPrompt =
			typeof args.prompt === "string" && args.prompt.length > 0
				? args.prompt
				: undefined;

		// Always launch interactive session, optionally with initial prompt
		await runInteractiveSession(context, initialPrompt);
	} catch (error) {
		if (error instanceof Error) {
			logger.error(`OpenCode integration error: ${error.message}`);
		} else {
			logger.error("OpenCode integration failed with unknown error");
		}

		// Graceful degradation - show help instead of crashing
		logger.log(
			"OpenCode AI assistant is not available. Use 'wrangler --help' for available commands."
		);
		process.exit(1);
	}
}

/**
 * Gather Wrangler configuration and project metadata
 */
async function gatherProjectContext(): Promise<ProjectContext> {
	const projectRoot = process.cwd();
	const configFiles: string[] = [];

	// Check for various Wrangler config file formats
	const possibleConfigFiles = [
		"wrangler.toml",
		"wrangler.json",
		"wrangler.jsonc",
	];

	for (const configFile of possibleConfigFiles) {
		const configPath = join(projectRoot, configFile);
		if (existsSync(configPath)) {
			configFiles.push(configPath);
		}
	}

	let wranglerConfig: Config | undefined;
	let rawConfig: RawConfig | undefined;
	let configPath: string | undefined;

	try {
		// First try to read raw config to get the original structure
		const rawConfigResult = experimental_readRawConfig(
			{},
			{ hideWarnings: true }
		);
		rawConfig = rawConfigResult.rawConfig;
		configPath = rawConfigResult.configPath;

		// Then read the normalized config
		wranglerConfig = readConfig({}, { hideWarnings: true });
	} catch (error) {
		// Config reading failed, continue without it
		logger.debug("Could not read Wrangler config:", error);
	}

	// Extract comprehensive bindings information
	const bindings = {
		kv_namespaces: wranglerConfig?.kv_namespaces || [],
		durable_objects: wranglerConfig?.durable_objects?.bindings || [],
		r2_buckets: wranglerConfig?.r2_buckets || [],
		d1_databases: wranglerConfig?.d1_databases || [],
		queues: {
			producers: wranglerConfig?.queues?.producers || [],
			consumers: wranglerConfig?.queues?.consumers || [],
		},
		services: wranglerConfig?.services || [],
		analytics_engine_datasets: wranglerConfig?.analytics_engine_datasets || [],
		ai: wranglerConfig?.ai,
		browser: wranglerConfig?.browser,
		vectorize: wranglerConfig?.vectorize || [],
		hyperdrive: wranglerConfig?.hyperdrive || [],
		workflows: wranglerConfig?.workflows || [],
		mtls_certificates: wranglerConfig?.mtls_certificates || [],
		dispatch_namespaces: wranglerConfig?.dispatch_namespaces || [],
		vars: wranglerConfig?.vars || {},
		secrets: Object.keys(wranglerConfig?.vars || {}).filter(
			(key) =>
				key.toUpperCase().includes("SECRET") ||
				key.toUpperCase().includes("KEY") ||
				key.toUpperCase().includes("TOKEN")
		),
	};

	return {
		wranglerConfig,
		rawConfig,
		configFiles,
		projectRoot,
		workersRuntime: wranglerConfig?.compatibility_date,
		bindings,
		environment: process.env.WRANGLER_ENV,
		accountId: wranglerConfig?.account_id,
		workerName: wranglerConfig?.name,
	};
}

/**
 * Launch OpenCode in interactive TUI mode
 * Optionally sends an initial prompt after launch
 */
async function runInteractiveSession(
	context: ProjectContext,
	initialPrompt?: string
): Promise<void> {
	if (initialPrompt) {
		logger.log(
			`Launching OpenCode AI assistant with prompt: "${initialPrompt}"`
		);
	} else {
		logger.log("Launching OpenCode AI assistant...");
	}

	// Write context to temporary file
	const contextFile = await writeContextFile(context);

	try {
		// Get OpenCode command and args
		const { command, args } = getOpenCodeCommand();

		// Build command arguments
		const commandArgs = [...args, context.projectRoot];

		// Spawn OpenCode TUI process
		const child = spawn(command, commandArgs, {
			stdio: "inherit",
			env: {
				...process.env,
				OPENCODE_CONTEXT_FILE: contextFile,
				// Pass initial prompt via environment variable for TUI to pick up
				...(initialPrompt && { OPENCODE_INITIAL_PROMPT: initialPrompt }),
			},
		});

		// Wait for process to complete
		await new Promise<void>((resolve, reject) => {
			child.on("exit", (code) => {
				if (code === 0) {
					resolve();
				} else {
					reject(new Error(`OpenCode exited with code ${code}`));
				}
			});

			child.on("error", (error) => {
				reject(new Error(`Failed to launch OpenCode: ${error.message}`));
			});
		});
	} finally {
		// Clean up context file
		try {
			const fs = await import("fs/promises");
			await fs.unlink(contextFile);
		} catch {
			// Ignore cleanup errors
		}
	}
}

/**
 * Write project context to a temporary file for OpenCode to read
 */
async function writeContextFile(context: ProjectContext): Promise<string> {
	const tempDir = tmpdir();
	const contextFile = join(tempDir, `wrangler-context-${Date.now()}.json`);

	await mkdir(tempDir, { recursive: true });
	await writeFile(contextFile, JSON.stringify(context, null, 2));

	return contextFile;
}

/**
 * Get the command and arguments to run OpenCode
 * Handles both workspace development and published package scenarios
 */
function getOpenCodeCommand(): { command: string; args: string[] } {
	// In workspace development, use the direct path to the OpenCode source
	const workspaceOpenCodePath = resolve(
		__dirname,
		"../../opencode/opencode/src/index.ts"
	);

	if (existsSync(workspaceOpenCodePath)) {
		// Development mode - run TypeScript directly with Bun
		return { command: "bun", args: ["run", workspaceOpenCodePath] };
	}

	// Try to find the installed package
	try {
		// For published packages, try to find the binary
		const opencodePkg = require.resolve("opencode/package.json");
		const opencodeDir = resolve(opencodePkg, "..");
		const binPath = join(opencodeDir, "bin", "opencode");

		if (existsSync(binPath)) {
			return { command: binPath, args: [] };
		}

		throw new Error("OpenCode binary not found in package");
	} catch (error) {
		throw new Error(
			"OpenCode package not found. Please ensure opencode workspace package is available or @jahands/opencode-cf is installed."
		);
	}
}
