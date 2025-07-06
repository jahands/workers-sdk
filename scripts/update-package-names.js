#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * Script to update package names in all package.json files
 * - Updates "wrangler": "workspace:*" to "@jahands/wrangler": "workspace:*"
 * - Updates "opencode": "workspace:*" to "@jahands/opencode-cf": "workspace:*"
 */

function findPackageJsonFiles(dir, files = []) {
	const items = fs.readdirSync(dir);

	for (const item of items) {
		const fullPath = path.join(dir, item);
		const stat = fs.statSync(fullPath);

		if (
			stat.isDirectory() &&
			!item.startsWith(".") &&
			item !== "node_modules"
		) {
			findPackageJsonFiles(fullPath, files);
		} else if (item === "package.json") {
			files.push(fullPath);
		}
	}

	return files;
}

function updatePackageJson(filePath) {
	try {
		const content = fs.readFileSync(filePath, "utf8");
		const pkg = JSON.parse(content);
		let changed = false;

		// Update dependencies
		if (pkg.dependencies) {
			if (
				pkg.dependencies["wrangler"] &&
				pkg.dependencies["wrangler"].startsWith("workspace:")
			) {
				const workspaceVersion = pkg.dependencies["wrangler"];
				delete pkg.dependencies["wrangler"];
				pkg.dependencies["@jahands/wrangler"] = workspaceVersion;
				changed = true;
				console.log(
					`Updated dependencies in ${filePath}: wrangler -> @jahands/wrangler (${workspaceVersion})`
				);
			}

			if (
				pkg.dependencies["opencode"] &&
				pkg.dependencies["opencode"].startsWith("workspace:")
			) {
				const workspaceVersion = pkg.dependencies["opencode"];
				delete pkg.dependencies["opencode"];
				pkg.dependencies["@jahands/opencode-cf"] = workspaceVersion;
				changed = true;
				console.log(
					`Updated dependencies in ${filePath}: opencode -> @jahands/opencode-cf (${workspaceVersion})`
				);
			}
		}

		// Update devDependencies
		if (pkg.devDependencies) {
			if (
				pkg.devDependencies["wrangler"] &&
				pkg.devDependencies["wrangler"].startsWith("workspace:")
			) {
				const workspaceVersion = pkg.devDependencies["wrangler"];
				delete pkg.devDependencies["wrangler"];
				pkg.devDependencies["@jahands/wrangler"] = workspaceVersion;
				changed = true;
				console.log(
					`Updated devDependencies in ${filePath}: wrangler -> @jahands/wrangler (${workspaceVersion})`
				);
			}

			if (
				pkg.devDependencies["opencode"] &&
				pkg.devDependencies["opencode"].startsWith("workspace:")
			) {
				const workspaceVersion = pkg.devDependencies["opencode"];
				delete pkg.devDependencies["opencode"];
				pkg.devDependencies["@jahands/opencode-cf"] = workspaceVersion;
				changed = true;
				console.log(
					`Updated devDependencies in ${filePath}: opencode -> @jahands/opencode-cf (${workspaceVersion})`
				);
			}
		}

		// Update peerDependencies
		if (pkg.peerDependencies) {
			if (
				pkg.peerDependencies["wrangler"] &&
				pkg.peerDependencies["wrangler"].startsWith("workspace:")
			) {
				const workspaceVersion = pkg.peerDependencies["wrangler"];
				delete pkg.peerDependencies["wrangler"];
				pkg.peerDependencies["@jahands/wrangler"] = workspaceVersion;
				changed = true;
				console.log(
					`Updated peerDependencies in ${filePath}: wrangler -> @jahands/wrangler (${workspaceVersion})`
				);
			}

			if (
				pkg.peerDependencies["opencode"] &&
				pkg.peerDependencies["opencode"].startsWith("workspace:")
			) {
				const workspaceVersion = pkg.peerDependencies["opencode"];
				delete pkg.peerDependencies["opencode"];
				pkg.peerDependencies["@jahands/opencode-cf"] = workspaceVersion;
				changed = true;
				console.log(
					`Updated peerDependencies in ${filePath}: opencode -> @jahands/opencode-cf (${workspaceVersion})`
				);
			}
		}

		if (changed) {
			fs.writeFileSync(filePath, JSON.stringify(pkg, null, "\t") + "\n");
			return true;
		}

		return false;
	} catch (error) {
		console.error(`Error updating ${filePath}:`, error.message);
		return false;
	}
}

function main() {
	console.log("🔄 Finding all package.json files...");

	const packageJsonFiles = findPackageJsonFiles(process.cwd());
	console.log(`Found ${packageJsonFiles.length} package.json files`);

	let updatedCount = 0;

	for (const filePath of packageJsonFiles) {
		if (updatePackageJson(filePath)) {
			updatedCount++;
		}
	}

	console.log(`\n✅ Updated ${updatedCount} package.json files`);

	if (updatedCount > 0) {
		console.log("\n🔄 Running pnpm install to update lockfile...");
		try {
			execSync("pnpm install", { stdio: "inherit" });
			console.log("✅ pnpm install completed successfully");
		} catch (error) {
			console.error("❌ pnpm install failed:", error.message);
			process.exit(1);
		}
	}
}

if (require.main === module) {
	main();
}
