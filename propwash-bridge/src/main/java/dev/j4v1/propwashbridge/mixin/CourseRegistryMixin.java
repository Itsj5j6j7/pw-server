package dev.j4v1.propwashbridge.mixin;

import com.llamalad7.mixinextras.injector.wrapmethod.WrapMethod;
import com.llamalad7.mixinextras.injector.wrapoperation.Operation;
import de.lardtom.propwash.race.CourseRegistry;
import de.lardtom.propwash.race.Leaderboard;
import dev.j4v1.propwashbridge.Races;
import net.minecraft.server.level.ServerPlayer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

import java.util.Optional;

@Mixin(CourseRegistry.class)
public abstract class CourseRegistryMixin {
	/** Non-assisted laps only: assisted ones go through submitAssistedLap. */
	@WrapMethod(method = "submitLap")
	private Leaderboard.Outcome propwashBridge$submitLap(CourseRegistry.Course course, ServerPlayer player, String frame, long lapNanos,
			Operation<Leaderboard.Outcome> original) {
		Leaderboard board = ((CourseRegistry) (Object) this).board(course);
		Optional<Leaderboard.Entry> courseRecord = board.record(null);
		Optional<Leaderboard.Entry> classRecord = board.record(frame);
		Leaderboard.Outcome outcome = original.call(course, player, frame, lapNanos);
		Races.lap(course, player, frame, lapNanos, outcome, outcome == Leaderboard.Outcome.COURSE_RECORD ? courseRecord : classRecord);
		return outcome;
	}

	@Inject(method = "resetLeaderboard", at = @At("RETURN"))
	private void propwashBridge$resetLeaderboard(CourseRegistry.Course course, String playerName, CallbackInfoReturnable<Integer> cir) {
		Races.leaderboardReset(course, playerName);
	}

	@Inject(method = "deleteCourse", at = @At("RETURN"))
	private void propwashBridge$deleteCourse(int id, CallbackInfoReturnable<Boolean> cir) {
		if (cir.getReturnValueZ()) Races.courseRemoved(id);
	}
}
