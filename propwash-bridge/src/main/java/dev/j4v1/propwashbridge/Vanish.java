package dev.j4v1.propwashbridge;

import me.drex.vanish.api.VanishAPI;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.server.level.ServerPlayer;

/** Staff in /vanish don't show up in the heartbeat. The Vanish mod is optional: its API is only touched when it's loaded. */
final class Vanish {
	private static final boolean LOADED = FabricLoader.getInstance().isModLoaded("vanish");

	private Vanish() {
	}

	static boolean hidden(ServerPlayer player) {
		return LOADED && Api.hidden(player);
	}

	private static final class Api {
		static boolean hidden(ServerPlayer player) {
			return VanishAPI.isVanished(player);
		}
	}
}
