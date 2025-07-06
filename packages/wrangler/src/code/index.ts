import { createCommand } from "../core/create-command";
import { proxyToOpenCode } from "../opencode-integration";

export const codeCommand = createCommand({
	metadata: {
		description: "🤖 Access OpenCode AI assistant and tools",
		status: "experimental",
		owner: "Workers: Authoring and Testing",
	},
	behaviour: {
		printBanner: false,
		provideConfig: false,
	},
	args: {},
	positionalArgs: [],
	async handler(args) {
		// Extract all arguments after 'code' from the original command line
		const originalArgs = process.argv.slice(2); // Remove 'node' and script path
		const codeIndex = originalArgs.findIndex((arg) => arg === "code");
		
		if (codeIndex === -1) {
			// Fallback: if 'code' not found, pass all remaining args
			await proxyToOpenCode(originalArgs);
		} else {
			// Pass all arguments after 'code' to OpenCode
			const forwardedArgs = originalArgs.slice(codeIndex + 1);
			await proxyToOpenCode(forwardedArgs);
		}
	},
});
