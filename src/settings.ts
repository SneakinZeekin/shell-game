export const MODULE_ID = "shell-game";

export function registerSettings() {
    game.settings.register(MODULE_ID, "runtimeMs", {
        name: "Shell Game: Run Time (ms)",
        hint: "Total duration of the shuffle animation, in milliseconds.",
        scope: "world",
        config: true,
        type: Number,
        default: 8000,
        integer: true,
        range: { min: 1000, max: 15000, step: 500 }
    });

    game.settings.register(MODULE_ID, "minMoveMs", {
        name: "Shell Game: Minimum Move Duration (ms)",
        hint: "Minimum duration of each move animation, in milliseconds.",
        scope: "world",
        config: true,
        type: Number,
        default: 350,
        integer: true,
        range: { min: 50, max: 2500, step: 50 }
    });

    game.settings.register(MODULE_ID, "maxMoveMs", {
        name: "Shell Game: Maximum Move Duration (ms)",
        hint: "Maximum duration of each move animation, in milliseconds.",
        scope: "world",
        config: true,
        type: Number,
        default: 400,
        integer: true,
        range: { min: 50, max: 2500, step: 50 }
    });

    game.settings.register(MODULE_ID, "forceZoom", {
        name: "Shell Game: Force Zoom to Tokens",
        hint: "If enabled, all players will automatically zoom to the tokens when they click Ready.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });
}
