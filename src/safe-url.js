// One resolver for URLs that come from run data.
export function httpsUrl(value) {
  if (typeof value !== "string") return null;
  // URL repairs "https:///x" to host "x"; the raw string must carry its own authority.
  if (/^https:[\/\\]*[\/\\]{3}/i.test(value.trim())) return null;
  let u;
  try {
    u = new URL(value);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username !== "" || u.password !== "" || u.hostname === "") return null;
  return value;
}

export function ownAssetUrl(repo, value) {
  if (!httpsUrl(value)) return null;
  const u = new URL(value);
  if (u.hostname !== "raw.githubusercontent.com") return null;
  return u.pathname.startsWith(`/${repo}/factory/assets/`) ? u.href : null;
}
