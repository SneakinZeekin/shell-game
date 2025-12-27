export function isMatchingTokenName(token: Token, baseName: string): boolean {
  const name = token.name ?? "";
  return name === baseName || name === `${baseName} (Fake)`;
}

export function zoomToTokens(tokens) {
  if (!tokens.length) return;

  const xs = tokens.map(t => t.center.x);
  const ys = tokens.map(t => t.center.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const boxWidth = maxX - minX;
  const boxHeight = maxY - minY;

  const centerX = minX + boxWidth / 2;
  const centerY = minY + boxHeight / 2;

  const padding = 350;

  const screenW = window.innerWidth - padding;
  const screenH = window.innerHeight - padding;

  const scaleX = screenW / boxWidth;
  const scaleY = screenH / boxHeight;

  let scale = Math.min(scaleX, scaleY);

  scale = Math.clamp(scale, 0.2, 3);

  canvas.animatePan({
    x: centerX,
    y: centerY,
    scale,
    duration: 750
  });
}

export function showCountdown(): Promise<void> {
  return new Promise(async (resolve) => {
    const overlay = document.createElement("div");
    overlay.id = "shellgame-countdown";
    overlay.style.position = "absolute";
    overlay.style.top = "50%";
    overlay.style.left = "50%";
    overlay.style.transform = "translate(-50%, -50%)";
    overlay.style.fontSize = "96px";
    overlay.style.fontWeight = "bold";
    overlay.style.color = "white";
    overlay.style.textShadow = "0 0 20px black";
    overlay.style.zIndex = "9999";
    overlay.style.pointerEvents = "none";

    document.body.appendChild(overlay);

    const nums = ["3", "2", "1"];

    for (const n of nums) {
      overlay.textContent = n;
      await new Promise(res => setTimeout(res, 1000));
    }

    overlay.remove();
    resolve();
  });
}

export function playReadySound() {
  AudioHelper.play(
    {
      src: "sounds/notify.wav",
      volume: 0.8,
      autoplay: true,
      loop: false
    },
    true
  );
}
