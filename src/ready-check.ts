import { isMatchingTokenName, zoomToTokens, showCountdown } from "./utils";

export interface ReadyStatusMap {
  [userId: string]: "unknown" | "ready" | "no";
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

      game.user?.updateTokenTargets([]);

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
  for (const user of game.users?.contents ?? []) {
    if (user.targets.size > 0) {
      user.updateTokenTargets([]);
    }
  }

  const NAME = name;
  const runtimeSetting = Number(game.settings.get("shell-game", "runtimeMs") ?? 8000);
  const minMoveSetting = Number(game.settings.get("shell-game", "minMoveMs") ?? 350);
  const maxMoveSetting = Number(game.settings.get("shell-game", "maxMoveMs") ?? 350);

  const TOTAL_MS_RAW = isNaN(runtimeSetting) ? 8000 : runtimeSetting;
  const MIN_RAW = isNaN(minMoveSetting) ? 350 : minMoveSetting;
  const MAX_RAW = isNaN(maxMoveSetting) ? 350 : maxMoveSetting;

  const TOTAL_MS = Math.max(1000, TOTAL_MS_RAW);
  const MOVE_MS_MIN = Math.min(MIN_RAW, MAX_RAW);
  const MOVE_MS_MAX = Math.max(MIN_RAW, MAX_RAW);

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

  const shuffleArr = <T>(arr: T[]): T[] => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const pickRandomSlots = (k: number) =>
    shuffleArr([...slots.keys()]).slice(0, k);

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

  function buildRotMap(slotIdxs: number[]): [number, number][] {
    const order = shuffleArr([...slotIdxs]);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const n = order.length;
    const pairs: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const from = order[i];
      const to = order[(i + dir + n) % n];
      pairs.push([from, to]);
    }
    return pairs;
  }

  const start = performance.now();
  while (performance.now() - start < TOTAL_MS) {
    const dur = rint(MOVE_MS_MIN, MOVE_MS_MAX);

    const k = rint(2, toks.length);
    const chosenSlots = pickRandomSlots(k);

    const cyclePairs = buildRotMap(chosenSlots);

    const moves: Promise<void>[] = [];
    for (const [fromSlot, toSlot] of cyclePairs) {
      const fromTokIdx = tokenAtSlot[fromSlot];
      moves.push(moveAndWait(toks[fromTokIdx], slots[toSlot], dur));
    }

    await Promise.all(moves);

    const newTokenAtSlot = tokenAtSlot.slice();
    for (const [fromSlot, toSlot] of cyclePairs) {
      const movedTokIdx = tokenAtSlot[fromSlot];
      newTokenAtSlot[toSlot] = movedTokIdx;
    }

    tokenAtSlot = newTokenAtSlot;

    for (let s = 0; s < tokenAtSlot.length; s++) {
      const tokIdx = tokenAtSlot[s];
      slotOfToken[tokIdx] = s;
    }
  }
}