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
	args: {
		args: {
			describe: "Arguments to pass to OpenCode",
			type: "string",
			array: true,
		},
	},
	positionalArgs: ["args"],
	async handler(args) {
		// Pass all arguments to OpenCode
		const forwardedArgs = args.args || [];
		await proxyToOpenCode(forwardedArgs);
	},
});
