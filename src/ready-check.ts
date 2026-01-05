import { isMatchingTokenName, zoomToTokens, showCountdown } from "./utils";

export interface ReadyStatusMap {
  [userId: string]: "unknown" | "ready" | "no";
}

export function startShellGame(tokenName: string) {
  const placeables = canvas?.tokens?.placeables ?? [];
  const tokens = placeables.filter(t => isMatchingTokenName(t, tokenName));

  if (tokens.length < 2) {
    ui.notifications?.error(
      `Shell Game: Need at least two tokens named "${tokenName}" in the current scene.`
    );
    return;
  }

  game.socket.emit("module.shell-game", {
    type: "start-check",
    tokenName
  });

  ShellGameReadyCheck.start(tokenName);
}

export class ShellGameReadyCheck extends Application {
  static statuses: ReadyStatusMap = {};
  static currentTokenName: string | null = null;

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: "shell-game-ready-check",
      title: "Shell Game Ready Check",
      template: "modules/shell-game/templates/ready-check.html",
      popOut: true,
      width: 400
    };
  }

  static start(tokenName: string) {
    ShellGameReadyCheck.currentTokenName = tokenName;
    ShellGameReadyCheck.openWindow();
  }

  static openWindow() {
    ShellGameReadyCheck.statuses = {};

    const users = (game.users?.contents ?? [])
      .filter(u => u.active && !u.isGM);

    for (const u of users) {
      ShellGameReadyCheck.statuses[u.id!] = "unknown";
    }

    new ShellGameReadyCheck().render(true);
  }

  static updateStatus(userId: string, status: "ready" | "no") {
    ShellGameReadyCheck.statuses[userId] = status;

    for (const win of Object.values(ui.windows)) {
      if (win instanceof ShellGameReadyCheck) win.render(false);
    }
  }

  getData() {
    const users = (game.users?.contents ?? [])
      .filter(u => u.active && !u.isGM);
    
    return {
      isGM: game.user?.isGM ?? false,
      users: users.map(u => {
        const id = u.id ?? "";
        return {
          id,
          name: u.name,
          status: ShellGameReadyCheck.statuses[id] ?? "unknown"
        };
      })
    };
  }

  activateListeners(html: any) {
    super.activateListeners(html);

    html.find("#shell-ready").on("click", () => {
      const currentUserId = game.user?.id;
      if (!currentUserId) return;

      const tokenName = ShellGameReadyCheck.currentTokenName;
      const forceZoom = game.settings.get("shell-game", "forceZoom");

      if (forceZoom && tokenName) {
        const placeables = canvas?.tokens?.placeables ?? [];
        const toks = placeables.filter(t => isMatchingTokenName(t, tokenName));
        if (toks.length > 0) zoomToTokens(toks);
      }

      (game.socket as any).emit("module.shell-game", {
        type: "status",
        userId: currentUserId,
        status: "ready"
      });

      game.user?.updateTokenTargets([]);

      ShellGameReadyCheck.updateStatus(currentUserId, "ready");
    });

    html.find("#shell-no").on("click", () => {
      const currentUserId = game.user?.id;
      if (!currentUserId) return;

      (game.socket as any).emit("module.shell-game", {
        type: "status",
        userId: currentUserId,
        status: "no"
      });

      ShellGameReadyCheck.updateStatus(currentUserId, "no");
    });

    html.find("#shell-start").on("click", async () => {
      if (!game.user?.isGM) return;

      const allReady = Object.values(ShellGameReadyCheck.statuses)
        .every(st => st === "ready");

      if (!allReady) {
        ui.notifications?.warn("Not all players are ready.");
        return;
      }

      game.socket?.emit("module.shell-game", {
        type: "close-check"
      });

      for (const win of Object.values(ui.windows)) {
        if (win instanceof ShellGameReadyCheck) win.close();
      }

      const name = ShellGameReadyCheck.currentTokenName;
      ShellGameReadyCheck.currentTokenName = null;

      game.socket?.emit("module.shell-game", {
        type: "countdown"
      });

      await showCountdown();

      if (name) performShellGame(name);
    });
  }
}

async function performShellGame(name: string) {
  game.socket?.emit("module.shell-game", {
    type: "clear-targets"
  });

  const NAME = name;
  const runtimeSetting = Number(game.settings.get("shell-game", "runtimeMs") ?? 8000);
  const minMoveSetting = Number(game.settings.get("shell-game", "minMoveMs") ?? 350);
  const maxMoveSetting = Number(game.settings.get("shell-game", "maxMoveMs") ?? 350);

  const TOTAL_MS = Math.max(1000, runtimeSetting);
  const MOVE_MS_MIN = Math.min(minMoveSetting, maxMoveSetting);
  const MOVE_MS_MAX = Math.max(minMoveSetting, maxMoveSetting);

  const toks =
    (canvas.tokens?.placeables ?? []).filter(t =>
      isMatchingTokenName(t as Token, NAME)
    ) as Token[];

  if (toks.length < 2) {
    ui.notifications?.warn(`Shell Game: Need at least two tokens named "${NAME}" on this scene.`);
    return;
  }

  const slots = toks.map(t => ({ x: t.document.x, y: t.document.y }));

  let tokenAtSlot = toks.map((_, i) => i);
  let slotOfToken = toks.map((_, i) => i);

  const rint = (a: number, b: number) =>
    Math.floor(Math.random() * (b - a + 1)) + a;

  const sleep = (ms: number) =>
    new Promise<void>(res => setTimeout(res, ms));

  async function waitMs(ms: number) {
    if (game.modules.get("warpgate")?.active) {
      await warpgate.wait(ms);
    } else {
      await sleep(ms);
    }
  }

  async function moveAndWait(token: Token, dest: { x: number; y: number }, dur: number) {
    await token.document.update(
      { x: dest.x, y: dest.y },
      { animate: true, animation: { duration: dur } }
    );
    await waitMs(dur + 20);
  }

  const shuffleArr = <T>(arr: T[]): T[] => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const LIFT = 40;

  const start = performance.now();
  while (performance.now() - start < TOTAL_MS) {
    const dur = rint(MOVE_MS_MIN, MOVE_MS_MAX);

    const k = rint(2, toks.length);
    const chosenSlots = shuffleArr([...slots.keys()]).slice(0, k);
    const shuffledSlots = shuffleArr([...chosenSlots]);

    let safety = 0;
    while (shuffledSlots.some((s, i) => s === chosenSlots[i]) && safety++ < 10) {
      shuffleArr(shuffledSlots);
    }

    const pairs: [number, number][] =
      chosenSlots.map((fromSlot, i) => [fromSlot, shuffledSlots[i]]);

    await Promise.all(
      pairs.map(([fromSlot]) => {
        const tokIdx = tokenAtSlot[fromSlot];
        const tok = toks[tokIdx];
        return tok.document.update(
          { elevation: (tok.document.elevation ?? 0) + LIFT },
          { animate: false }
        );
      })
    );

    const moves: Promise<void>[] = [];
    for (const [fromSlot, toSlot] of pairs) {
      const tokIdx = tokenAtSlot[fromSlot];
      moves.push(moveAndWait(toks[tokIdx], slots[toSlot], dur));
    }

    await Promise.all(moves);

    await Promise.all(
      pairs.map(([fromSlot]) => {
        const tokIdx = tokenAtSlot[fromSlot];
        const tok = toks[tokIdx];
        return tok.document.update(
          { elevation: (tok.document.elevation ?? 0) - LIFT },
          { animate: false }
        );
      })
    );

    const newTokenAtSlot = tokenAtSlot.slice();
    for (const [fromSlot, toSlot] of pairs) {
      const tokIdx = tokenAtSlot[fromSlot];
      newTokenAtSlot[toSlot] = tokIdx;
    }

    tokenAtSlot = newTokenAtSlot;

    for (let slot = 0; slot < tokenAtSlot.length; slot++) {
      slotOfToken[tokenAtSlot[slot]] = slot;
    }
  }
}