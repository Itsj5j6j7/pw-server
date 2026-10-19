package dev.j4v1.propwashbridge;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.nio.file.Files;
import java.nio.file.Path;

record Config(String apiUrl, String apiKey, int heartbeatSeconds, int batchMs, int queueMax) {
	private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
	private static final Config DEFAULTS = new Config("http://127.0.0.1:3006", "", 30, 1000, 200);

	/** PROPWASH_BRIDGE_API_URL and PROPWASH_BRIDGE_API_KEY, when set, win over the file: the key stays out of the config folder. */
	private static String env(String name, String fallback) {
		String value = System.getenv(name);
		return value == null || value.isBlank() ? fallback : value;
	}

	/** Missing file: writes the defaults. Settings missing from the file keep their default. */
	static Config load(Path path) throws Exception {
		if (!Files.exists(path)) {
			Files.writeString(path, GSON.toJson(DEFAULTS));
			return DEFAULTS;
		}

		JsonObject json = GSON.toJsonTree(DEFAULTS).getAsJsonObject();
		JsonParser.parseString(Files.readString(path)).getAsJsonObject().asMap().forEach(json::add);
		Config c = GSON.fromJson(json, Config.class);
		// The bot marks a server offline after 90 s without a heartbeat.
		return new Config(env("PROPWASH_BRIDGE_API_URL", c.apiUrl).replaceAll("/+$", ""), env("PROPWASH_BRIDGE_API_KEY", c.apiKey).trim(), Math.clamp(c.heartbeatSeconds, 5, 85),
				Math.max(c.batchMs, 100), Math.max(c.queueMax, 10));
	}
}
