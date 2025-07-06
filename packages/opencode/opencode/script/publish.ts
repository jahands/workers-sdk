#!/usr/bin/env bun
import { existsSync } from "fs";
import { join } from "path";
import { $ } from "bun";
import pkg from "../package.json";

const dry = process.argv.includes("--dry");
const snapshot = process.argv.includes("--snapshot");
const devBuild = process.argv.includes("--dev");

// For workers-sdk integration, use a simpler versioning scheme
const version = snapshot
	? `0.0.0-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`
	: devBuild
		? `0.0.0-dev-${Date.now()}`
		: pkg.version;

console.log(`building opencode ${version}`);

const GOARCH: Record<string, string> = {
	arm64: "arm64",
	x64: "amd64",
};

// For development builds, only build for current platform
const targets = devBuild
	? [
			[
				process.platform === "win32" ? "windows" : process.platform,
				process.arch === "x64" ? "x64" : "arm64",
			],
		]
	: [
			["linux", "arm64"],
			["linux", "x64"],
			["darwin", "x64"],
			["darwin", "arm64"],
			["windows", "x64"],
		];

await $`rm -rf dist`;

const optionalDependencies: Record<string, string> = {};
const npmTag = snapshot ? "snapshot" : "latest";

// Ensure TUI binary exists
const tuiMainPath = join("../tui/cmd/opencode/main.go");
if (!existsSync(tuiMainPath)) {
	console.error(`TUI main.go not found at ${tuiMainPath}`);
	process.exit(1);
}

for (const [os, arch] of targets) {
	console.log(`building ${os}-${arch}`);
	const name = `@jahands/opencode-cf-${os}-${arch}`;
	await $`mkdir -p dist/${name}/bin`;

	// Build Go TUI binary
	await $`CGO_ENABLED=0 GOOS=${os} GOARCH=${GOARCH[arch]} go build -ldflags="-s -w -X main.Version=${version}" -o ../opencode/dist/${name}/bin/tui ../tui/cmd/opencode/main.go`.cwd(
		"../tui"
	);

	// Build TypeScript with embedded TUI binary
	const executableName = os === "windows" ? "opencode.exe" : "opencode";
	await $`bun build --define OPENCODE_VERSION="'${version}'" --compile --minify --target=bun-${os}-${arch} --outfile=dist/${name}/bin/${executableName} ./src/index.ts ./dist/${name}/bin/tui`;
	await $`rm -rf ./dist/${name}/bin/tui`;

	// Create platform-specific package.json
	await Bun.file(`dist/${name}/package.json`).write(
		JSON.stringify(
			{
				name,
				version,
				os: [os === "windows" ? "win32" : os],
				cpu: [arch],
				main: `./bin/${executableName}`,
				bin: {
					opencode: `./bin/${executableName}`,
				},
				publishConfig: {
					access: "public",
				},
			},
			null,
			2
		)
	);

	if (!dry && !devBuild)
		await $`cd dist/${name} && bun publish --access public --tag ${npmTag}`;
	optionalDependencies[name] = version;
}

// Create main wrapper package
const mainPackageName = "@jahands/opencode-cf";
await $`mkdir -p ./dist/${mainPackageName}`;
await $`cp -r ./bin ./dist/${mainPackageName}/bin`;
await $`cp ./script/postinstall.mjs ./dist/${mainPackageName}/postinstall.mjs`;

await Bun.file(`./dist/${mainPackageName}/package.json`).write(
	JSON.stringify(
		{
			name: mainPackageName,
			version,
			description: "OpenCode AI assistant for Cloudflare Workers",
			main: "./bin/opencode",
			bin: {
				opencode: "./bin/opencode",
			},
			scripts: {
				postinstall: "node ./postinstall.mjs",
			},
			optionalDependencies,
			keywords: ["ai", "assistant", "cloudflare", "workers", "cli"],
			author: "Jacob Hands",
			license: "MIT",
			repository: {
				type: "git",
				url: "https://github.com/jahands/workers-sdk.git",
				directory: "packages/opencode/opencode",
			},
			publishConfig: {
				access: "public",
			},
		},
		null,
		2
	)
);

if (!dry && !devBuild)
	await $`cd ./dist/${mainPackageName} && bun publish --access public --tag ${npmTag}`;

console.log(`Built packages:`);
console.log(`- Main package: ${mainPackageName}@${version}`);
for (const [os, arch] of targets) {
	console.log(
		`- Platform package: @jahands/opencode-cf-${os}-${arch}@${version}`
	);
}

// For POC, we focus on npm publishing via pkg.pr.new
// GitHub releases and other package managers can be added later
console.log(`\nBuild completed successfully!`);
if (devBuild) {
	console.log(`\nDevelopment build created. To test locally:`);
	console.log(`  cd packages/opencode/opencode`);
	console.log(`  bun run script/publish.ts --dev`);
}
