package dev.j4v1.propwashbridge;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.ChatFormatting;
import net.minecraft.commands.Commands;
import net.minecraft.network.chat.ClickEvent;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.HoverEvent;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;

/** Hub build: only the in-game /link command, no status, events or Propwash. */
public class PropwashBridge implements ModInitializer {
	public static final String MOD_ID = "propwash-bridge";
	public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

	private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
	private static Config config;
	private static String userAgent;

	@Override
	public void onInitialize() {
		try {
			config = Config.load(FabricLoader.getInstance().getConfigDir().resolve(MOD_ID + ".json"));
		} catch (Exception e) {
			LOGGER.error("Can't read config/{}.json, /link stays disabled", MOD_ID, e);
			return;
		}
		if (config.apiKey().isEmpty()) {
			LOGGER.warn("No apiKey (PROPWASH_BRIDGE_API_KEY or config/{}.json), /link stays disabled", MOD_ID);
			return;
		}
		userAgent = "propwash-bridge/" + FabricLoader.getInstance().getModContainer(MOD_ID).orElseThrow().getMetadata().getVersion().getFriendlyString();
		LOGGER.info("Bridge (link only) for {} with key ...{}", config.apiUrl(), config.apiKey().substring(Math.max(0, config.apiKey().length() - 4)));

		HTTP.sendAsync(request("/v1/ping", null), HttpResponse.BodyHandlers.ofString()).whenComplete((res, e) -> {
			if (res != null && res.statusCode() == 200) {
				JsonObject server = parse(res.body()).getAsJsonObject("server");
				LOGGER.info("Bridge connected as {} ({})", server.get("name").getAsString(), server.get("id").getAsString());
			} else {
				LOGGER.warn("Bridge can't connect to {} ({})", config.apiUrl(),
						res == null ? e : res.statusCode() == 401 ? "key not accepted, check apiKey for this server" : "HTTP " + res.statusCode());
			}
		});

		CommandRegistrationCallback.EVENT.register((dispatcher, context, selection) -> dispatcher.register(
				Commands.literal("link").executes(c -> link(c.getSource().getPlayerOrException()))));
	}

	private static int link(ServerPlayer player) {
		UUID uuid = player.getUUID();
		MinecraftServer s = player.level().getServer();
		JsonObject body = new JsonObject();
		body.addProperty("uuid", uuid.toString());
		body.addProperty("name", player.getGameProfile().name());
		HTTP.sendAsync(request("/v1/link/start", body), HttpResponse.BodyHandlers.ofString()).whenComplete((res, e) -> s.execute(() -> {
			ServerPlayer target = s.getPlayerList().getPlayer(uuid);
			if (target != null) target.sendSystemMessage(res == null ? linkReply(-1, new JsonObject()) : linkReply(res.statusCode(), parse(res.body())));
		}));
		return 1;
	}

	private static Component linkReply(int status, JsonObject body) {
		return switch (status) {
			case 200 -> {
				String code = body.get("code").getAsString();
				Component copy = Component.literal(code).withStyle(ChatFormatting.AQUA, ChatFormatting.BOLD).withStyle(style -> style
						.withClickEvent(new ClickEvent.CopyToClipboard(code))
						.withHoverEvent(new HoverEvent.ShowText(Component.literal("Click to copy"))));
				yield Component.literal("Your code is ").append(copy).append(". Type /link " + code + " on Discord (expires in "
						+ body.get("ttlSeconds").getAsInt() / 60 + " min)").withStyle(ChatFormatting.GREEN);
			}
			case 409 -> Component.literal("Your account is already linked. To change it, run /unlink on Discord first").withStyle(ChatFormatting.YELLOW);
			case 429 -> Component.literal("Too many codes, try again in a minute").withStyle(ChatFormatting.RED);
			default -> Component.literal("Couldn't reach Discord, try again later").withStyle(ChatFormatting.RED);
		};
	}

	private static HttpRequest request(String path, JsonObject body) {
		HttpRequest.Builder req = HttpRequest.newBuilder(URI.create(config.apiUrl() + path))
				.timeout(Duration.ofSeconds(5))
				.header("Authorization", "Bearer " + config.apiKey())
				.header("User-Agent", userAgent);
		if (body == null) req.GET();
		else req.header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body.toString()));
		return req.build();
	}

	private static JsonObject parse(String body) {
		try {
			return JsonParser.parseString(body).getAsJsonObject();
		} catch (RuntimeException e) {
			return new JsonObject();
		}
	}
}
