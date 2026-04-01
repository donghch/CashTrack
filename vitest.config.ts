import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // Use Node.js environment for integration tests (not Cloudflare Workers)
        environment: "node",
        
        // Include the integration test setup file
        setupFiles: ["./src/test/integration/setup.ts"],
        
        // Test timeout in milliseconds
        testTimeout: 30000,
        
        // Hook timeout for beforeAll/afterAll
        hookTimeout: 30000,
        
        // Global test globals
        globals: false,
        
        // Include patterns for test files
        include: [
            "src/test/integration/suites/**/*.test.ts",
            "src/test/unit/**/*.test.ts"
        ],
        
        // Exclude patterns
        exclude: [
            "**/node_modules/**",
            "**/dist/**"
        ]
    }
});