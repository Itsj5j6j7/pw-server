package dev.j4v1.propwashbridge.mixin;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

@Mixin(targets = "de.lardtom.propwash.race.RaceServer$Session")
public interface SessionAccessor {
	@Accessor("raceAssist")
	int propwashBridge$raceAssist();

	@Accessor("lapAssist")
	int propwashBridge$lapAssist();
}
