package dev.j4v1.propwashbridge.mixin;

import com.llamalad7.mixinextras.injector.wrapmethod.WrapMethod;
import com.llamalad7.mixinextras.injector.wrapoperation.Operation;
import de.lardtom.propwash.race.RaceLobby;
import dev.j4v1.propwashbridge.Races;
import org.spongepowered.asm.mixin.Mixin;

import java.util.List;
import java.util.UUID;

@Mixin(RaceLobby.class)
public abstract class RaceLobbyMixin {
	/** start() clears the lobby, so the pilots' names are read before. */
	@WrapMethod(method = "start")
	private RaceLobby.Heat propwashBridge$start(long now, Operation<RaceLobby.Heat> original) {
		RaceLobby lobby = (RaceLobby) (Object) this;
		List<UUID> members = lobby.members();
		List<String> names = lobby.names();
		RaceLobby.Heat heat = original.call(now);
		Races.heatStarted(heat, members, names);
		return heat;
	}
}
