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

  const padding = 2000;

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
