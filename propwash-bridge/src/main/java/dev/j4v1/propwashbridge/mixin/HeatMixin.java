package dev.j4v1.propwashbridge.mixin;

import de.lardtom.propwash.race.RaceLobby;
import dev.j4v1.propwashbridge.Races;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

import java.util.UUID;

@Mixin(RaceLobby.Heat.class)
public abstract class HeatMixin {
	@Inject(method = "finish", at = @At("RETURN"))
	private void propwashBridge$finish(UUID pilot, CallbackInfoReturnable<Integer> cir) {
		Races.placed((RaceLobby.Heat) (Object) this, pilot, cir.getReturnValueI());
	}
}
