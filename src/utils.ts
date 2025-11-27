export function isMatchingTokenName(token: Token, baseName: string): boolean {
  const name = token.name ?? "";
  return name === baseName || name === `${baseName} (Fake)`;
}