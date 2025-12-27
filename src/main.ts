import { ShellGameReadyCheck, startShellGame } from "./ready-check";
import { ShellGameSetup } from "./setup";
import { registerSettings } from "./settings";
import { isMatchingTokenName, showCountdown, playReadySound } from "./utils";
import "./style.css";

Hooks.once("init", () => {
  console.log("Shell Game | Initializing");

  registerSettings();

  loadTemplates([
    "modules/shell-game/templates/ready-check.html",
    "modules/shell-game/templates/shell-setup.html"
  ]);
});

Hooks.once("ready", () => {
  console.log("Shell Game | Ready");

  Hooks.on("chatMessage", (_log, content: string, _chatData) => {
    const trimmed = content.trim();
    if (!trimmed.startsWith("/shell")) return;

    if (!game.user?.isGM) {
      ui.notifications?.error("Shell Game: Only the GM can use /shell.");
      return false;
    }

    const args = trimmed.slice("/shell".length).trim();

    if (args.toLowerCase() === "setup") {
      console.log("Shell Game | Opening setup window");
      ShellGameSetup.openWindow();
      return false;
    }

    const tokenName = args;
    if (!tokenName) {
      ui.notifications?.error("Usage: /shell TOKEN_NAME  or  /shell setup");
      return false;
    }

    const placeables = canvas?.tokens?.placeables ?? [];
    const tokens = placeables.filter(t => isMatchingTokenName(t, tokenName));

    if (tokens.length < 2) {
      ui.notifications?.error(
        `Shell Game: Need at least two tokens named "${tokenName}" in the current scene.`
      );
      return false;
    }

    game.socket.emit("module.shell-game", {
      type: "start-check",
      tokenName
    });

    ShellGameReadyCheck.start(tokenName);

    return false;
  });

  console.log("Shell Game | Registering socket handler");

  game.socket?.on(
    "module.shell-game",
    (data: {
      type: "start-check" | "close-check" | "status" | "countdown" | "clear-targets";
      tokenName?: string;
      userId?: string;
      status?: "ready" | "no";
    }) => {
      console.log("Shell Game | socket received:", data);

      if (data.type === "start-check" && data.tokenName) {
        playReadySound();
        ShellGameReadyCheck.start(data.tokenName);
      } else if (data.type === "close-check") {
        for (const win of Object.values(ui.windows)) {
          if (win instanceof ShellGameReadyCheck) win.close();
        }
      } else if (data.type === "status" && data.userId && data.status) {
        ShellGameReadyCheck.updateStatus(data.userId, data.status);
      }
      else if (data.type === "countdown") {
        showCountdown();
      }
      else if (data.type === "clear-targets") {
        game.user?.updateTokenTargets([]);
      }
    }
  );
});

Hooks.on("getSceneControlButtons", controls => {
  if (!game.user?.isGM) return;

  controls.push({
    name: "shellgame",
    title: "Shell Game",
    icon: "fas fa-dice",
    layer: "controls",       
    activeTool: "shellgame-setup",
    visible: true,
    tools: [
      {
        name: "shellgame-setup",
        title: "Setup Shell Game",
        icon: "fas fa-cog",
        button: true,
        onClick: () => ShellGameSetup.openWindow()
      },
      {
        name: "shellgame-start",
        title: "Start Shell Game",
        icon: "fas fa-random",
        button: true,
        onClick: () => {
          const tokenName = "Metrion";

          startShellGame(tokenName);
        }
      }
    ]
  });
});


