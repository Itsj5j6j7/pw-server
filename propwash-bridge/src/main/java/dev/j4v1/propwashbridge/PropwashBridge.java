package dev.j4v1.propwashbridge;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import de.lardtom.propwash.api.PropwashApi;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
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

import java.util.UUID;

public class PropwashBridge implements ModInitializer {
	public static final String MOD_ID = "propwash-bridge";
	public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

	/** Null while the bridge is idle (no apiKey). */
	static Sender sender;
	static MinecraftServer server;
	private static long startedAt;

	@Override
	public void onInitialize() {
		if (!FabricLoader.getInstance().isModLoaded("propwash")) throw new IllegalStateException("Propwash Bridge needs Propwash");
		PropwashApi.requireVersion(MOD_ID, "1.5.0");

		Config config;
		try {
			config = Config.load(FabricLoader.getInstance().getConfigDir().resolve(MOD_ID + ".json"));
		} catch (Exception e) {
			LOGGER.error("Can't read config/{}.json, the bridge stays idle", MOD_ID, e);
			return;
		}
		if (config.apiKey().isEmpty()) {
			LOGGER.warn("No apiKey (PROPWASH_BRIDGE_API_KEY or config/{}.json), the bridge stays idle", MOD_ID);
			return;
		}
		LOGGER.info("Bridge enabled for {} with key ...{}", config.apiUrl(), config.apiKey().substring(Math.max(0, config.apiKey().length() - 4)));
		sender = new Sender(config, version(MOD_ID));

		ServerLifecycleEvents.SERVER_STARTED.register(s -> {
			server = s;
			startedAt = System.currentTimeMillis();
			JsonObject started = versions();
			started.addProperty("maxPlayers", s.getPlayerList().getMaxPlayers());
			sender.start(started);
		});
		ServerLifecycleEvents.SERVER_STOPPING.register(s -> {
			JsonObject stopping = new JsonObject();
			stopping.addProperty("reason", "stop");
			sender.stop(stopping);
		});
		ServerTickEvents.END_SERVER_TICK.register(s -> {
			if (s.getTickCount() % 20 == 0) Races.tick();
			if (s.getTickCount() % (config.heartbeatSeconds() * 20) == 0) sender.heartbeat(heartbeat(s));
		});
		CommandRegistrationCallback.EVENT.register((dispatcher, context, selection) -> dispatcher.register(
				Commands.literal("link").executes(c -> link(c.getSource().getPlayerOrException()))));
	}

	private static JsonObject heartbeat(MinecraftServer s) {
		JsonArray players = new JsonArray();
		int online = 0;
		for (ServerPlayer player : s.getPlayerList().getPlayers()) {
			if (Vanish.hidden(player)) continue;
			online++;
			// One name the bot can't validate would reject the whole heartbeat.
			if (!Races.name(player).matches("\\w{1,16}")) continue;
			JsonObject json = Races.player(player.getUUID(), Races.name(player));
			json.addProperty("dimension", player.level().dimension().identifier().toString());
			players.add(json);
		}

		double mspt = s.getAverageTickTimeNanos() / 1e6;
		Runtime runtime = Runtime.getRuntime();
		JsonObject body = versions();
		body.addProperty("onlinePlayers", online);
		body.addProperty("maxPlayers", s.getPlayerList().getMaxPlayers());
		body.add("players", players);
		body.addProperty("tps", Math.round(Math.min(20, 1000 / mspt) * 10) / 10.0);
		body.addProperty("mspt", Math.round(mspt * 10) / 10.0);
		body.addProperty("uptimeSeconds", (System.currentTimeMillis() - startedAt) / 1000);
		body.addProperty("memoryUsedMb", (runtime.totalMemory() - runtime.freeMemory()) >> 20);
		body.addProperty("memoryMaxMb", runtime.maxMemory() >> 20);
		return body;
	}

	private static int link(ServerPlayer player) {
		UUID uuid = player.getUUID();
		MinecraftServer s = server;
		sender.link(uuid, Races.name(player), (status, body) -> s.execute(() -> {
			ServerPlayer target = s.getPlayerList().getPlayer(uuid);
			if (target != null) target.sendSystemMessage(linkReply(status, body));
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

	private static JsonObject versions() {
		JsonObject json = new JsonObject();
		json.addProperty("mcVersion", version("minecraft"));
		json.addProperty("loader", "fabric");
		json.addProperty("loaderVersion", version("fabricloader"));
		json.addProperty("modVersion", version(MOD_ID));
		json.addProperty("propwashVersion", version("propwash"));
		return json;
	}

	private static String version(String modId) {
		return FabricLoader.getInstance().getModContainer(modId).map(mod -> mod.getMetadata().getVersion().getFriendlyString()).orElse(null);
	}
}
