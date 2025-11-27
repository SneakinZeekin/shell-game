import { ShellGameReadyCheck } from "./ready-check";
import { ShellGameSetup } from "./setup"; 
import { registerSettings } from "./settings";
import "./style.css";

Hooks.once("init", () => {
  console.log("Shell Game | Initializing");

  registerSettings();

  loadTemplates([
    "modules/shell-game/templates/ready-check.html"
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
      ShellGameSetup.openWindow();
      return false; 
    }

    const tokenName = args;
    if (!tokenName) {
      ui.notifications?.error("Usage: /shell TOKEN_NAME  or  /shell setup");
      return false;
    }

    const placeables = canvas?.tokens?.placeables ?? [];
    const tokens = placeables.filter(t => t.name === tokenName);

    if (tokens.length < 2) {
      ui.notifications?.error(
        `Shell Game: Need at least two tokens named "${tokenName}" in the current scene.`
      );
      return false;
    }

    (game.socket as any).emit("module.shell-game", {
      type: "start-check",
      tokenName
    });

    ShellGameReadyCheck.start(tokenName);

    return false;
  });

  (game.socket as any).on(
    "module.shell-game",
    (data: {
      type: "start-check" | "status";
      tokenName?: string;
      userId?: string;
      status?: "ready" | "no";
    }) => {
      if (data.type === "start-check" && data.tokenName) {
        ShellGameReadyCheck.start(data.tokenName);
      } else if (data.type === "status" && data.userId && data.status) {
        ShellGameReadyCheck.updateStatus(data.userId, data.status);
      }
    }
  );
});