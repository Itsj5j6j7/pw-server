package dev.j4v1.propwashbridge;

import com.google.gson.JsonObject;
import de.lardtom.propwash.race.CourseRegistry;
import de.lardtom.propwash.race.Leaderboard;
import net.minecraft.ChatFormatting;
import net.minecraft.server.level.ServerPlayer;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Turns the Propwash hooks (see the mixin package) into bridge events. Everything here runs on the server thread.
 */
public final class Races {
	private Races() {
	}

	private static boolean enabled() {
		return PropwashBridge.sender != null;
	}

	/** A non-assisted lap went through the leaderboard. */
	public static void lap(CourseRegistry.Course course, ServerPlayer player, String frame, long lapNanos,
			Leaderboard.Outcome outcome, Optional<Leaderboard.Entry> previousRecord) {
		if (!enabled() || !outcome.improved()) return;

		JsonObject data = new JsonObject();
		data.add("course", course(course));
		data.add("player", player(player.getUUID(), name(player)));
		data.addProperty("frame", frame == null ? "" : frame);
		data.addProperty("lapNanos", lapNanos);
		data.addProperty("outcome", outcome.name().toLowerCase(Locale.ROOT));
		if (outcome.record()) previousRecord.ifPresent(entry -> {
			JsonObject previous = new JsonObject();
			previous.addProperty("name", entry.name());
			previous.addProperty("nanos", entry.nanos());
			data.add("previousRecord", previous);
		});
		PropwashBridge.sender.enqueue("race.best_lap", data);
	}

	public static void leaderboardReset(CourseRegistry.Course course, String playerName) {
		if (!enabled()) return;
		JsonObject data = new JsonObject();
		data.addProperty("courseId", course.id);
		data.addProperty("playerName", playerName);
		PropwashBridge.sender.enqueue("leaderboard.reset", data);
	}

	public static void courseRemoved(int courseId) {
		if (!enabled()) return;
		JsonObject data = new JsonObject();
		data.addProperty("courseId", courseId);
		PropwashBridge.sender.enqueue("course.removed", data);
	}

	private static JsonObject course(CourseRegistry.Course course) {
		String name = course.name == null ? "" : ChatFormatting.stripFormatting(course.name);
		JsonObject json = new JsonObject();
		json.addProperty("id", course.id);
		json.addProperty("name", name.length() > 64 ? name.substring(0, 64) : name);
		json.addProperty("dimension", course.dimension);
		json.addProperty("layout", course.layout);
		json.addProperty("laps", course.laps);
		return json;
	}

	static JsonObject player(UUID uuid, String name) {
		JsonObject json = new JsonObject();
		json.addProperty("uuid", uuid.toString());
		json.addProperty("name", name);
		return json;
	}

	static String name(ServerPlayer player) {
		return player.getGameProfile().name();
	}
}
