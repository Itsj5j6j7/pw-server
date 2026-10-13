package dev.j4v1.propwashbridge;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import de.lardtom.propwash.drone.QuadcopterEntity;
import de.lardtom.propwash.race.CourseRegistry;
import de.lardtom.propwash.race.Leaderboard;
import de.lardtom.propwash.race.RaceLobby;
import de.lardtom.propwash.race.RaceServer;
import net.minecraft.ChatFormatting;
import net.minecraft.server.level.ServerPlayer;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Turns the Propwash hooks (see the mixin package) into bridge events. Everything here runs on the server thread.
 */
public final class Races {
	private record Finish(UUID uuid, String name, long totalNanos, String frame, boolean assisted) {
	}

	/** {@code finished} holds the results by pilot, in order of arrival. */
	private record OpenHeat(String id, Map<UUID, String> names, Map<UUID, JsonObject> finished) {
	}

	/** Multiplayer heats still running. Heat doesn't override equals, so this is by identity. */
	private static final Map<RaceLobby.Heat, OpenHeat> HEATS = new HashMap<>();
	/** A heat finish waiting for the place that Heat#finish is about to return. */
	private static Finish pending;

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

	/** {@code members} and {@code names} come from the lobby, in the same order. */
	public static void heatStarted(RaceLobby.Heat heat, List<UUID> members, List<String> names) {
		if (!enabled() || !heat.multiplayer()) return;

		Map<UUID, String> pilots = new LinkedHashMap<>();
		for (int i = 0; i < members.size(); i++) pilots.put(members.get(i), names.get(i));
		HEATS.put(heat, new OpenHeat(UUID.randomUUID().toString(), pilots, new LinkedHashMap<>()));
	}

	/** A pilot crossed the finish line of a race, assisted or not. */
	public static void finished(CourseRegistry.Course course, ServerPlayer player, long totalNanos, boolean assisted) {
		if (!enabled()) return;

		QuadcopterEntity drone = RaceServer.pilotedDrone(player);
		Finish finish = new Finish(player.getUUID(), name(player), totalNanos,
				drone == null ? null : drone.build().frame().key(), assisted);

		RaceLobby.Heat heat = RaceServer.heat(course.id);
		if (heat != null && HEATS.containsKey(heat) && heat.pilots().contains(finish.uuid)) {
			pending = finish;
			return;
		}
		JsonArray results = new JsonArray();
		results.add(result(1, finish));
		emit(UUID.randomUUID().toString(), course, false, results);
	}

	/** Right after {@link #finished}, for pilots in a heat. {@code place} is -1 if they had dropped out. */
	public static void placed(RaceLobby.Heat heat, UUID pilot, int place) {
		Finish finish = pending;
		pending = null;
		OpenHeat open = HEATS.get(heat);
		if (open == null || finish == null || !finish.uuid.equals(pilot) || place <= 0) return;
		open.finished.put(pilot, result(place, finish));
	}

	/** Once a second: posts the heats that are over. */
	static void tick() {
		long now = System.nanoTime();
		HEATS.entrySet().removeIf(entry -> {
			if (!entry.getKey().done(now)) return false;
			emit(entry.getKey(), entry.getValue());
			return true;
		});
	}

	private static void emit(RaceLobby.Heat heat, OpenHeat open) {
		CourseRegistry registry = CourseRegistry.get();
		CourseRegistry.Course course = registry == null ? null : registry.course(heat.course());
		// ponytail: a heat where everyone dropped out isn't posted.
		if (course == null || open.finished.isEmpty()) return;

		JsonArray results = new JsonArray();
		open.finished.values().forEach(results::add);
		open.names.forEach((uuid, name) -> {
			if (open.finished.containsKey(uuid)) return;
			JsonObject dnf = new JsonObject();
			dnf.add("place", null);
			dnf.add("player", player(uuid, name));
			dnf.addProperty("status", "dnf");
			dnf.add("totalNanos", null);
			dnf.addProperty("assisted", false);
			results.add(dnf);
		});
		emit(open.id, course, true, results);
	}

	private static void emit(String heatId, CourseRegistry.Course course, boolean multiplayer, JsonArray results) {
		JsonObject data = new JsonObject();
		data.addProperty("heatId", heatId);
		data.add("course", course(course));
		data.addProperty("multiplayer", multiplayer);
		data.add("results", results);
		PropwashBridge.sender.enqueue("race.result", data);
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

	private static JsonObject result(int place, Finish finish) {
		JsonObject result = new JsonObject();
		result.addProperty("place", place);
		result.add("player", player(finish.uuid, finish.name));
		result.addProperty("status", "finished");
		result.addProperty("totalNanos", finish.totalNanos);
		result.addProperty("frame", finish.frame);
		result.addProperty("assisted", finish.assisted);
		return result;
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
