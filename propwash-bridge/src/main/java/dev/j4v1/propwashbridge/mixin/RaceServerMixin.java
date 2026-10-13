package dev.j4v1.propwashbridge.mixin;

import de.lardtom.propwash.race.CourseRegistry;
import de.lardtom.propwash.race.RacePayloads;
import de.lardtom.propwash.race.RaceServer;
import dev.j4v1.propwashbridge.Races;
import net.minecraft.server.level.ServerPlayer;
import org.objectweb.asm.Opcodes;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Coerce;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(RaceServer.class)
public abstract class RaceServerMixin {
	/** finish() only reads HEATS once the finish is valid and the time has been submitted (or skipped, if assisted). */
	@Inject(method = "finish", at = @At(value = "FIELD", target = "Lde/lardtom/propwash/race/RaceServer;HEATS:Ljava/util/Map;", opcode = Opcodes.GETSTATIC))
	private static void propwashBridge$finish(CourseRegistry registry, CourseRegistry.Course course, @Coerce Object session,
			RacePayloads.RaceReportC2S report, ServerPlayer player, CallbackInfoReturnable<?> cir) {
		SessionAccessor s = (SessionAccessor) session;
		Races.finished(course, player, report.totalNanos(), (s.propwashBridge$raceAssist() | s.propwashBridge$lapAssist()) != 0);
	}
}
