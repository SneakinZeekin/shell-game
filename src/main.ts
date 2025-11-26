import { ShellGameReadyCheck } from "./ready-check";
import "./style.css";

Hooks.once("init", () => {
  console.log("Shell Game | Initializing");

  loadTemplates([
    "modules/shell-game/templates/ready-check.html"
  ]);
});

Hooks.once("ready", () => {
  console.log("Shell Game | Ready");

  // Listen for /shell commands in chat
  Hooks.on("chatMessage", (_log, content: string, _chatData) => {
    const trimmed = content.trim();
    if (!trimmed.startsWith("/shell")) return;

    // Only GM can use it
    if (!game.user?.isGM) {
      ui.notifications?.error("Shell Game: Only the GM can use /shell.");
      return false; 
    }

    const args = trimmed.slice("/shell".length).trim();
    const tokenName = args;
    if (!tokenName) {
      ui.notifications?.error("Usage: /shell TOKEN_NAME");
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