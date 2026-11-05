package dev.j4v1.propwashbridge;

import com.google.gson.JsonArray;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import de.lardtom.propwash.api.PropwashApi;
import de.lardtom.propwash.api.race.BoardEntry;
import de.lardtom.propwash.api.race.BoardQuery;
import de.lardtom.propwash.api.race.BoardSnapshot;
import de.lardtom.propwash.api.race.Category;
import de.lardtom.propwash.api.race.CourseInfo;
import de.lardtom.propwash.api.race.DeletedCourse;
import de.lardtom.propwash.api.race.LapResult;
import de.lardtom.propwash.api.race.PersonalBest;
import de.lardtom.propwash.api.race.RaceEvents;
import de.lardtom.propwash.api.race.RaceResult;
import de.lardtom.propwash.api.race.TimeKind;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.ChatFormatting;
import net.minecraft.server.MinecraftServer;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Turns Propwash's race API (0.6.0+, API 1.7.0) into bridge events. Everything here runs on the server thread.
 * Leaderboards aren't rebuilt by the bot: it gets Propwash's own boards ({@code course.board}) whenever they change.
 */
final class Races {
	/** Entries per board: /leaderboard shows 10. */
	private static final int TOP = 10;
	/**
	 * Propwash doesn't say when a heat is over, only each pilot's place as they finish: a heat is sent once nobody
	 * finished it for this long, or when the next heat on that course has a winner.
	 */
	private static final long HEAT_QUIET_MS = 60_000;

	private static final class Heat {
		final String id = UUID.randomUUID().toString();
		final JsonObject course;
		final JsonArray results = new JsonArray();
		long lastAt;

		Heat(JsonObject course) {
			this.course = course;
		}
	}

	private record BestLap(UUID course, long nanos) {
	}

	private static final Map<UUID, Heat> heats = new HashMap<>();
	/** Best lap of each pilot's race in progress, for race.result. */
	private static final Map<UUID, BestLap> bestLaps = new HashMap<>();
	/** Hash of the last board sent per course, so unchanged boards aren't sent again. */
	private static final Map<UUID, Integer> sent = new HashMap<>();
	/** Courses whose board changed during this tick: sent at its end, after the record events of the same lap. */
	private static final Set<UUID> dirty = new HashSet<>();
	private static boolean synced;

	private Races() {
	}

	static void register() {
		RaceEvents.LAP_COMPLETED.register(Races::lap);
		RaceEvents.PERSONAL_BEST.register(Races::personalBest);
		RaceEvents.RACE_FINISHED.register(Races::raceFinished);
		RaceEvents.COURSE_CREATED.register(course -> dirty.add(course.id()));
		RaceEvents.COURSE_CHANGED.register(change -> dirty.add(change.course().id()));
		RaceEvents.COURSE_DELETED.register(Races::deleted);
		ServerTickEvents.END_SERVER_TICK.register(s -> {
			if (dirty.isEmpty()) return;
			for (UUID id : dirty) PropwashApi.race().course(s, id).ifPresent(course -> sendBoard(s, course));
			dirty.clear();
		});
	}

	/**
	 * Every minute (and once right after startup): sends the boards that changed without an event (/propwash race leaderboard
	 * reset has none) and heats nobody finished for a while. The first run also tells the bot which courses exist, so courses
	 * deleted or renumbered while the bridge was off disappear from Discord.
	 */
	static void sync(MinecraftServer s) {
		if (!synced) {
			synced = true;
			JsonArray ids = new JsonArray();
			PropwashApi.race().courses(s).forEach(course -> ids.add(course.id().toString()));
			JsonObject data = new JsonObject();
			data.add("courseIds", ids);
			PropwashBridge.sender.enqueue("courses.sync", data);
		}
		PropwashApi.race().courses(s).forEach(course -> sendBoard(s, course));
		flushHeats(false);
	}

	/** {@code all}: on shutdown, also the heats that might still get finishers. */
	static void flushHeats(boolean all) {
		long now = System.currentTimeMillis();
		heats.values().removeIf(heat -> {
			if (!all && now - heat.lastAt < HEAT_QUIET_MS) return false;
			sendHeat(heat);
			return true;
		});
	}

	private static void lap(LapResult lap) {
		// Laps count from 1 in each race.
		BestLap best = bestLaps.get(lap.player());
		boolean sameRace = lap.lap() > 1 && best != null && best.course.equals(lap.course());
		if (!sameRace || lap.timeNanos() < best.nanos) bestLaps.put(lap.player(), new BestLap(lap.course(), lap.timeNanos()));
		// Only clean laps set records: Propwash never flags an assisted one.
		if (lap.classRecord()) record(lap.course(), lap.courseRecord() ? "course" : "class", lap.player(), lap.playerName(), lap.frame(), lap.timeNanos(), 0);
	}

	private static void personalBest(PersonalBest best) {
		dirty.add(best.course());
		BoardEntry entry = best.entry();
		// Rank 1 of the clean race board for that lap count. On a point-to-point course the run is the lap, already announced.
		if (entry.kind() == TimeKind.RACE && !entry.assisted() && entry.rank() == 1) {
			record(best.course(), "race", entry.player(), entry.name(), entry.frame(), entry.timeNanos(), entry.laps());
		}
	}

	private static void record(UUID courseId, String scope, UUID player, String name, String frame, long nanos, int laps) {
		CourseInfo course = PropwashApi.race().course(PropwashBridge.server, courseId).orElse(null);
		if (course == null || scope.equals("race") && course.pointToPoint() || !valid(name)) return;
		JsonObject data = new JsonObject();
		data.add("course", course(course));
		data.addProperty("scope", scope);
		data.add("player", player(player, name));
		data.addProperty("frame", frame == null ? "" : frame);
		data.addProperty("nanos", nanos);
		if (laps > 0) data.addProperty("laps", laps);
		PropwashBridge.sender.enqueue("race.record", data);
	}

	private static void raceFinished(RaceResult race) {
		CourseInfo course = PropwashApi.race().course(PropwashBridge.server, race.course()).orElse(null);
		BestLap best = bestLaps.remove(race.player());
		if (course == null || !valid(race.playerName())) return;

		JsonObject result = new JsonObject();
		result.addProperty("place", Math.max(1, race.heatPlace()));
		result.add("player", player(race.player(), race.playerName()));
		result.addProperty("status", "finished");
		result.addProperty("totalNanos", race.timeNanos());
		if (best != null && best.course.equals(race.course())) result.addProperty("bestLapNanos", best.nanos);
		result.addProperty("laps", race.laps());
		result.addProperty("frame", race.frame() == null ? "" : race.frame());
		result.addProperty("assisted", race.category() == Category.ASSISTED);

		// Place 0: flown outside a heat (no lobby), a solo race on its own.
		if (race.heatPlace() == 0) {
			Heat solo = new Heat(course(course));
			solo.results.add(result);
			sendHeat(solo);
			return;
		}
		Heat heat = heats.get(race.course());
		if (heat != null && race.heatPlace() == 1) {
			sendHeat(heat);
			heat = null;
		}
		if (heat == null) heats.put(race.course(), heat = new Heat(course(course)));
		heat.results.add(result);
		heat.lastAt = System.currentTimeMillis();
	}

	private static void deleted(DeletedCourse course) {
		dirty.remove(course.id());
		sent.remove(course.id());
		heats.remove(course.id());
		JsonObject data = new JsonObject();
		data.addProperty("courseId", course.id().toString());
		PropwashBridge.sender.enqueue("course.removed", data);
	}

	// ponytail: pilots that crashed out of a heat aren't listed (the API has no DNF); a 2-pilot heat with one finisher posts as solo.
	private static void sendHeat(Heat heat) {
		JsonObject data = new JsonObject();
		data.addProperty("heatId", heat.id);
		data.add("course", heat.course);
		data.addProperty("multiplayer", heat.results.size() > 1);
		data.add("results", heat.results);
		PropwashBridge.sender.enqueue("race.result", data);
	}

	private static void sendBoard(MinecraftServer s, CourseInfo course) {
		JsonArray boards = new JsonArray();
		for (Category category : Category.values()) {
			BoardQuery laps = BoardQuery.laps().category(category).limit(TOP);
			PropwashApi.race().leaderboard(s, course.id(), laps).ifPresent(all -> {
				boards.add(board(all));
				// Per class only for clean times, to keep the event small. "" (times without a class) would repeat the board of all classes.
				if (category == Category.CLEAN) for (String frame : all.frames()) {
					if (frame.isEmpty()) continue;
					PropwashApi.race().leaderboard(s, course.id(), laps.frame(frame)).ifPresent(board -> boards.add(board(board)));
				}
				for (int count : all.raceLapCounts()) {
					PropwashApi.race().leaderboard(s, course.id(), BoardQuery.races(count).category(category).limit(TOP)).ifPresent(board -> boards.add(board(board)));
				}
			});
		}
		JsonObject data = new JsonObject();
		data.add("course", course(course));
		data.add("boards", boards);

		int hash = data.toString().hashCode();
		if (Objects.equals(sent.put(course.id(), hash), hash)) return;
		PropwashBridge.sender.enqueue("course.board", data);
	}

	private static JsonObject board(BoardSnapshot snapshot) {
		BoardQuery query = snapshot.query();
		JsonArray entries = new JsonArray();
		for (BoardEntry entry : snapshot.entries()) {
			// A name the bot can't validate would reject the whole board.
			if (!valid(entry.name())) continue;
			JsonObject json = new JsonObject();
			json.addProperty("rank", entry.rank());
			json.add("player", player(entry.player(), entry.name()));
			json.addProperty("nanos", entry.timeNanos());
			if (entry.dateKnown()) json.addProperty("date", entry.dateMillis());
			else json.add("date", JsonNull.INSTANCE);
			json.addProperty("frame", entry.frame() == null ? "" : entry.frame());
			JsonArray assist = new JsonArray();
			entry.assistReasons().forEach(assist::add);
			json.add("assist", assist);
			// Flown while the server's race rules were different from now (0.6.0-rc.3+).
			json.addProperty("otherRules", entry.serverRulesDiffer());
			entries.add(json);
		}
		JsonObject json = new JsonObject();
		json.addProperty("kind", query.kind().key());
		json.addProperty("category", query.category().key());
		json.addProperty("frame", query.frame().orElse(null));
		if (query.kind() == TimeKind.RACE) json.addProperty("laps", query.raceLaps());
		else json.add("laps", JsonNull.INSTANCE);
		json.addProperty("total", snapshot.total());
		json.add("entries", entries);
		return json;
	}

	private static JsonObject course(CourseInfo course) {
		JsonObject json = new JsonObject();
		json.addProperty("id", course.id().toString());
		json.addProperty("number", course.number());
		json.addProperty("name", text(course.name(), 64));
		json.addProperty("dimension", course.dimension().toString());
		json.addProperty("layout", course.layout());
		json.addProperty("laps", course.laps());
		json.addProperty("mode", course.mode().key());
		String owner = course.ownerName();
		json.addProperty("ownerName", owner == null || owner.isEmpty() ? null : text(owner, 32));
		return json;
	}

	static JsonObject player(UUID uuid, String name) {
		JsonObject json = new JsonObject();
		json.addProperty("uuid", uuid.toString());
		json.addProperty("name", name);
		return json;
	}

	static boolean valid(String name) {
		return name != null && name.matches("\\w{1,16}");
	}

	private static String text(String value, int max) {
		String plain = value == null ? "" : ChatFormatting.stripFormatting(value);
		return plain.length() > max ? plain.substring(0, max) : plain;
	}
}
