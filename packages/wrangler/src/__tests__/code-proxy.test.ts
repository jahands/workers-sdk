import { describe, expect, it, vi } from "vitest";

// Mock the opencode-integration module
const mockProxyToOpenCode = vi.fn();
vi.mock("../opencode-integration", () => ({
	proxyToOpenCode: mockProxyToOpenCode,
}));

// Import main after mocking
import { main } from "../index";

describe("Code command proxy", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should proxy 'code auth' to OpenCode", async () => {
		await main(["code", "auth"]);
		
		expect(mockProxyToOpenCode).toHaveBeenCalledWith(["auth"]);
	});

	it("should proxy 'code --help' to OpenCode", async () => {
		await main(["code", "--help"]);
		
		expect(mockProxyToOpenCode).toHaveBeenCalledWith(["--help"]);
	});

	it("should proxy 'code run --model gpt-4 hello' to OpenCode", async () => {
		await main(["code", "run", "--model", "gpt-4", "hello"]);
		
		expect(mockProxyToOpenCode).toHaveBeenCalledWith([
			"run",
			"--model", 
			"gpt-4",
			"hello"
		]);
	});

	it("should proxy 'code' with no arguments to OpenCode", async () => {
		await main(["code"]);
		
		expect(mockProxyToOpenCode).toHaveBeenCalledWith([]);
	});

	it("should not proxy non-code commands", async () => {
		// This should not call proxyToOpenCode and should proceed with normal yargs processing
		// We expect this to throw because we're not providing a complete yargs setup in the test
		await expect(main(["deploy"])).rejects.toThrow();
		
		expect(mockProxyToOpenCode).not.toHaveBeenCalled();
	});
});
