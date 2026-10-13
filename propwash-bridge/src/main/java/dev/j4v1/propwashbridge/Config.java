package dev.j4v1.propwashbridge;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.nio.file.Files;
import java.nio.file.Path;

record Config(String apiUrl, String apiKey, int heartbeatSeconds, int batchMs, int queueMax) {
	private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
	private static final Config DEFAULTS = new Config("https://pw.itofu.net", "", 30, 1000, 200);

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
		return new Config(c.apiUrl.replaceAll("/+$", ""), c.apiKey.trim(), Math.clamp(c.heartbeatSeconds, 5, 85),
				Math.max(c.batchMs, 100), Math.max(c.queueMax, 10));
	}
}
