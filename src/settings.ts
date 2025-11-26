export const MODULE_ID = "shell-game";

export function registerSettings() {
  game.settings.register(MODULE_ID, "runtimeMs", {
    name: "Shell Game: Run Time (ms)",
    hint: "Total duration of the shuffle animation, in milliseconds.",
    scope: "world",
    config: true,
    type: Number,
    default: 8000,
    range: { min: 1000, max: 60000, step: 500 }
  });

  game.settings.register(MODULE_ID, "minMoveMs", {
    name: "Shell Game: Minimum Move Duration (ms)",
    hint: "Minimum duration of each hop animation, in milliseconds.",
    scope: "world",
    config: true,
    type: Number,
    default: 350,
    range: { min: 50, max: 5000, step: 50 }
  });

  game.settings.register(MODULE_ID, "maxMoveMs", {
    name: "Shell Game: Maximum Move Duration (ms)",
    hint: "Maximum duration of each hop animation, in milliseconds.",
    scope: "world",
    config: true,
    type: Number,
    default: 350,
    range: { min: 50, max: 5000, step: 50 }
  });
}
