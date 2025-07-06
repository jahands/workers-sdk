#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Smart publishing script for wrangler-opencode POC
 * 
 * This script:
 * 1. Bumps versions for both packages
 * 2. Updates wrangler's dependency on opencode to match the new version
 * 3. Builds both packages
 * 4. Publishes both packages
 * 5. Commits the version changes
 */

function execCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      stdio: 'inherit', 
      encoding: 'utf8',
      ...options 
    });
    return result;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

function updatePackageVersion(packagePath, bumpType = 'patch') {
  console.log(`📦 Bumping ${bumpType} version for ${packagePath}...`);
  
  const packageJsonPath = path.join(packagePath, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Parse current version
  const [major, minor, patch] = pkg.version.split('.').map(Number);
  
  // Bump version based on type
  let newVersion;
  switch (bumpType) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }
  
  pkg.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, '\t') + '\n');
  
  console.log(`✅ Updated ${pkg.name} from ${major}.${minor}.${patch} to ${newVersion}`);
  return newVersion;
}

function updateWranglerDependency(opencodeVersion) {
  console.log(`🔗 Updating wrangler dependency to @jahands/opencode-cf@${opencodeVersion}...`);
  
  const wranglerPackagePath = path.join('packages/wrangler/package.json');
  const pkg = JSON.parse(fs.readFileSync(wranglerPackagePath, 'utf8'));
  
  if (pkg.dependencies && pkg.dependencies['@jahands/opencode-cf']) {
    pkg.dependencies['@jahands/opencode-cf'] = `^${opencodeVersion}`;
    fs.writeFileSync(wranglerPackagePath, JSON.stringify(pkg, null, '\t') + '\n');
    console.log(`✅ Updated wrangler dependency to @jahands/opencode-cf@^${opencodeVersion}`);
  } else {
    console.log(`⚠️  No @jahands/opencode-cf dependency found in wrangler package.json`);
  }
}

function main() {
  const bumpType = process.argv[2] || 'patch';
  const validBumpTypes = ['patch', 'minor', 'major'];
  
  if (!validBumpTypes.includes(bumpType)) {
    console.error(`❌ Invalid bump type: ${bumpType}`);
    console.error(`Valid options: ${validBumpTypes.join(', ')}`);
    process.exit(1);
  }
  
  console.log(`🚀 Starting ${bumpType} version bump and publish...`);
  
  // 1. Bump OpenCode version
  const opencodeVersion = updatePackageVersion('packages/opencode/opencode', bumpType);
  
  // 2. Bump Wrangler version  
  const wranglerVersion = updatePackageVersion('packages/wrangler', bumpType);
  
  // 3. Update wrangler's dependency on opencode
  updateWranglerDependency(opencodeVersion);
  
  // 4. Build packages
  console.log(`🔨 Building packages...`);
  execCommand('pnpm turbo build --filter=@jahands/opencode-cf --filter=@jahands/wrangler');
  
  // 5. Publish OpenCode first (wrangler depends on it)
  console.log(`📦 Publishing @jahands/opencode-cf@${opencodeVersion}...`);
  execCommand('pnpm publish', { cwd: 'packages/opencode/opencode' });
  
  // 6. Publish Wrangler
  console.log(`📦 Publishing @jahands/wrangler@${wranglerVersion}...`);
  execCommand('pnpm publish', { cwd: 'packages/wrangler' });
  
  // 7. Commit changes
  console.log(`📝 Committing version changes...`);
  execCommand('git add packages/opencode/opencode/package.json packages/wrangler/package.json');
  execCommand(`git commit -m "chore: bump package versions

- @jahands/opencode-cf: ${opencodeVersion}
- @jahands/wrangler: ${wranglerVersion}
- Updated wrangler dependency to match opencode version"`);
  
  console.log(`\n🎉 Successfully published packages:`);
  console.log(`   📦 @jahands/opencode-cf@${opencodeVersion}`);
  console.log(`   📦 @jahands/wrangler@${wranglerVersion}`);
  console.log(`\n💡 Users can now install with:`);
  console.log(`   npm install -g @jahands/wrangler@${wranglerVersion}`);
  console.log(`   wrangler -p "Hello OpenCode!"`);
}

if (require.main === module) {
  main();
}
