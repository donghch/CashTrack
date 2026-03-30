import { z } from "zod";
import fs from "fs";
import path from "path";

const configSchema = z.object({
    serverPort: z.number().int().min(1).max(65535).default(3000),
    password: z.string().min(1).default("admin"),
});

export type Config = z.infer<typeof configSchema>;

function getConfigPath(): string {
    return path.join(process.cwd(), "config.json");
}

function createDefaultConfig(): Config {
    const defaultConfig: Config = {
        serverPort: 3000,
        password: "admin",
    };

    const configPath = getConfigPath();
    fs.writeFileSync(
        configPath,
        JSON.stringify(defaultConfig, null, 2),
        "utf8",
    );
    console.log(`Created default config file at: ${configPath}`);

    return defaultConfig;
}

function loadConfig(): Config {
    const configPath = getConfigPath();

    if (!fs.existsSync(configPath)) {
        return createDefaultConfig();
    }

    try {
        const configContent = fs.readFileSync(configPath, "utf8");
        const configJson = JSON.parse(configContent);
        return configSchema.parse(configJson);
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(
                `Invalid JSON in config file ${configPath}: ${error.message}`,
            );
        }

        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join(", ");
            throw new Error(`Config validation failed: ${errorMessages}`);
        }

        throw new Error(
            `Failed to load config from ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

const config: Config = loadConfig();

export default config;
