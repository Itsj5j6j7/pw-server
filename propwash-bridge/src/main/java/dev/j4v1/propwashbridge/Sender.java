package dev.j4v1.propwashbridge;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.BiConsumer;

import static dev.j4v1.propwashbridge.PropwashBridge.LOGGER;

/**
 * Talks to the bot from a single thread, so events arrive in order and the server thread never waits on the network.
 * The server thread only calls {@link #enqueue}, {@link #heartbeat} and {@link #link}.
 */
final class Sender {
	private static final int MAX_BATCH = 50;
	private static final long MAX_BACKOFF_MS = 60_000;
	/** Kept for as long as possible when the queue is full. */
	private static final Set<String> PRIORITY = Set.of("race.best_lap");

	private record Event(String type, JsonObject json) {
	}

	private final Config config;
	private final String userAgent;
	private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
	private final ScheduledExecutorService thread = Executors.newSingleThreadScheduledExecutor(r -> {
		Thread t = new Thread(r, "propwash-bridge");
		t.setDaemon(true);
		return t;
	});
	/** Guarded by itself: the server thread adds, the sender thread removes. */
	private final Deque<Event> queue = new ArrayDeque<>();

	// Sender thread only, except connected, which the heartbeat reads.
	private volatile boolean connected;
	private long retryAt;
	private long backoffMs;
	private int batchSize = MAX_BATCH;

	Sender(Config config, String modVersion) {
		this.config = config;
		this.userAgent = "propwash-bridge/" + modVersion;
	}

	/** {@code heartbeat} runs every {@code heartbeatSeconds} on the sender thread. */
	void start(JsonObject started, Runnable heartbeat) {
		Event event = event("server.started", started);
		thread.execute(() -> ping(event));
		thread.scheduleAtFixedRate(() -> {
			try {
				heartbeat.run();
			} catch (RuntimeException e) {
				LOGGER.error("Bridge heartbeat failed", e);
			}
		}, config.heartbeatSeconds(), config.heartbeatSeconds(), TimeUnit.SECONDS);
		thread.scheduleWithFixedDelay(() -> {
			// An exception here would cancel the schedule for good.
			try {
				flush();
			} catch (RuntimeException e) {
				LOGGER.error("Bridge flush failed", e);
			}
		}, config.batchMs(), config.batchMs(), TimeUnit.MILLISECONDS);
	}

	/** Queues server.stopping and gives the queue about 3 s to drain. */
	void stop(JsonObject stopping) {
		enqueue("server.stopping", stopping);
		try {
			thread.submit(() -> {
				while (flush()) ;
			}).get(3, TimeUnit.SECONDS);
		} catch (Exception e) {
			LOGGER.warn("Couldn't deliver every event before stopping ({} left)", queue.size());
		}
		thread.shutdownNow();
	}

	void enqueue(String type, JsonObject data) {
		Event event = event(type, data);
		synchronized (queue) {
			if (queue.size() >= config.queueMax()) {
				Event dropped = queue.stream().filter(e -> !PRIORITY.contains(e.type)).findFirst().orElse(queue.peekFirst());
				queue.remove(dropped);
				LOGGER.warn("Event queue full, dropped a {} event", dropped.type);
			}
			queue.addLast(event);
		}
	}

	/** Not retried: the next one comes {@code heartbeatSeconds} later. */
	void heartbeat(JsonObject body) {
		thread.execute(() -> {
			if (!connected) return;
			try {
				HttpResponse<String> res = request("/v1/heartbeat", body);
				if (res.statusCode() == 400) LOGGER.error("The bot rejected the heartbeat: {}", res.body());
			} catch (IOException | InterruptedException ignored) {
				// The event queue already reports the bot being down.
			}
		});
	}

	/** Calls {@code reply} on the sender thread with the HTTP status (-1 if the bot is unreachable) and the body. */
	void link(UUID uuid, String name, BiConsumer<Integer, JsonObject> reply) {
		JsonObject body = new JsonObject();
		body.addProperty("uuid", uuid.toString());
		body.addProperty("name", name);
		thread.execute(() -> {
			try {
				HttpResponse<String> res = request("/v1/link/start", body);
				reply.accept(res.statusCode(), parse(res.body()));
			} catch (IOException | InterruptedException e) {
				reply.accept(-1, new JsonObject());
			}
		});
	}

	private static Event event(String type, JsonObject data) {
		JsonObject json = new JsonObject();
		json.addProperty("id", UUID.randomUUID().toString());
		json.addProperty("type", type);
		json.addProperty("ts", System.currentTimeMillis());
		json.add("data", data);
		return new Event(type, json);
	}

	private void ping(Event started) {
		String problem;
		try {
			HttpResponse<String> res = request("/v1/ping", null);
			if (res.statusCode() == 200) {
				JsonObject server = parse(res.body()).getAsJsonObject("server");
				LOGGER.info("Bridge connected as {} ({})", server.get("name").getAsString(), server.get("id").getAsString());
				synchronized (queue) {
					queue.addFirst(started);
				}
				connected = true;
				return;
			}
			problem = res.statusCode() == 401 ? "key not accepted, check apiKey for this server" : "HTTP " + res.statusCode();
		} catch (IOException | RuntimeException e) {
			problem = e.toString();
		} catch (InterruptedException e) {
			return;
		}
		LOGGER.warn("Bridge can't connect to {} ({}), retrying in 1 min", config.apiUrl(), problem);
		thread.schedule(() -> ping(started), 1, TimeUnit.MINUTES);
	}

	/** Sends one batch. True if it left the queue (delivered, duplicate or rejected by the bot). */
	private boolean flush() {
		if (!connected || System.currentTimeMillis() < retryAt) return false;

		List<Event> batch;
		synchronized (queue) {
			batch = queue.stream().limit(batchSize).toList();
		}
		if (batch.isEmpty()) return false;

		JsonArray events = new JsonArray();
		batch.forEach(e -> events.add(e.json));
		JsonObject body = new JsonObject();
		body.add("events", events);

		HttpResponse<String> res;
		try {
			res = request("/v1/events", body);
		} catch (IOException e) {
			return retryLater(e.toString());
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			return false;
		}

		switch (res.statusCode()) {
			case 200 -> {
				JsonElement rejected = parse(res.body()).get("rejected");
				if (rejected != null && !rejected.getAsJsonArray().isEmpty()) LOGGER.error("The bot rejected events: {}", rejected);
			}
			case 400 -> LOGGER.error("The bot rejected a batch of {} events: {}", batch.size(), res.body());
			case 401 -> {
				retryAt = System.currentTimeMillis() + 60_000;
				LOGGER.warn("Bridge key not accepted, check apiKey for this server. Retrying in 1 min");
				return false;
			}
			case 413 -> {
				if (batch.size() > 1) {
					batchSize = Math.max(1, batch.size() / 2);
					return false;
				}
				LOGGER.error("Dropped a {} event too large for the bot", batch.getFirst().type);
			}
			case 429 -> {
				long seconds = res.headers().firstValueAsLong("Retry-After").orElse(60);
				retryAt = System.currentTimeMillis() + seconds * 1000;
				return false;
			}
			default -> {
				return retryLater("HTTP " + res.statusCode());
			}
		}

		synchronized (queue) {
			queue.removeAll(batch);
		}
		if (backoffMs > 0) LOGGER.info("Bridge reconnected");
		backoffMs = 0;
		batchSize = MAX_BATCH;
		return true;
	}

	/** Retries the same batch with backoff: 1 s, 2 s, 4 s... up to 60 s. */
	private boolean retryLater(String problem) {
		if (backoffMs == 0) LOGGER.warn("Bridge can't reach the bot ({}), retrying with backoff", problem);
		backoffMs = Math.min(backoffMs == 0 ? 1000 : backoffMs * 2, MAX_BACKOFF_MS);
		retryAt = System.currentTimeMillis() + backoffMs;
		return false;
	}

	private HttpResponse<String> request(String path, JsonObject body) throws IOException, InterruptedException {
		HttpRequest.Builder req = HttpRequest.newBuilder(URI.create(config.apiUrl() + path))
				.timeout(Duration.ofSeconds(5))
				.header("Authorization", "Bearer " + config.apiKey())
				.header("User-Agent", userAgent);
		if (body == null) req.GET();
		else req.header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body.toString()));
		return http.send(req.build(), HttpResponse.BodyHandlers.ofString());
	}

	private static JsonObject parse(String body) {
		try {
			return JsonParser.parseString(body).getAsJsonObject();
		} catch (RuntimeException e) {
			return new JsonObject();
		}
	}
}
