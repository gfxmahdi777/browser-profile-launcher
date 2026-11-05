import {
  BrowserDefinition,
  BrowserProfile,
  RawLocalState,
} from '../shared/types.ts';

/**
 * Computes 1-2 letter uppercase initials for a profile display name using only letters and numbers.
 * e.g. "Work & Clients" -> "WC", "John Doe" -> "JD", "Alice" -> "AL"
 */
export function getInitials(name: string): string {
  if (!name || !name.trim()) return '?';
  const words = name
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, Math.min(2, words[0].length)).toUpperCase();
  }
  return '?';
}

/**
 * Pure parser for Chromium "Local State" file content.
 * Safely parses JSON and extracts profile definitions without throwing exceptions.
 * Has NO Node.js built-in dependencies, so it runs seamlessly in both Node and Browser.
 */
export function parseLocalState(
  rawContent: string,
  browserDef: BrowserDefinition,
  avatarResolver?: ((folderName: string) => string | null) | null
): { profiles: BrowserProfile[]; error?: string } {
  if (!rawContent || !rawContent.trim()) {
    return { profiles: [], error: 'Local State file is empty' };
  }

  let parsed: RawLocalState;
  try {
    parsed = JSON.parse(rawContent) as RawLocalState;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      profiles: [],
      error: `Malformed JSON in Local State file: ${message}`,
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      profiles: [],
      error: 'Invalid Local State JSON structure (expected an object)',
    };
  }

  const infoCache = parsed.profile?.info_cache;
  if (!infoCache || typeof infoCache !== 'object') {
    // Some fresh installs have no profiles yet or an empty profile object
    return { profiles: [] };
  }

  const profiles: BrowserProfile[] = [];
  const folderNames = Object.keys(infoCache);

  for (const folderName of folderNames) {
    const rawProfile = infoCache[folderName];
    if (!rawProfile || typeof rawProfile !== 'object') {
      continue;
    }

    // Determine the profile's display name
    const rawName =
      (typeof rawProfile.name === 'string' && rawProfile.name.trim()) ||
      (typeof rawProfile.gaia_name === 'string' && rawProfile.gaia_name.trim()) ||
      (typeof rawProfile.user_name === 'string' && rawProfile.user_name.trim()) ||
      (folderName === 'Default' ? 'Default' : folderName);

    const displayName = rawName.trim();
    const initials = getInitials(displayName);

    // Check avatar if resolver callback is provided
    const avatarPath = avatarResolver ? avatarResolver(folderName) : null;
    const avatarIcon =
      typeof rawProfile.avatar_icon === 'string' ? rawProfile.avatar_icon : null;
    const gaiaId =
      typeof rawProfile.gaia_id === 'string' ? rawProfile.gaia_id : null;

    profiles.push({
      browserId: browserDef.id,
      browserName: browserDef.name,
      folderName,
      displayName,
      initials,
      avatarPath,
      avatarIcon,
      gaiaId,
      isDefault: folderName.toLowerCase() === 'default',
      launchArgument: `--profile-directory="${folderName}"`,
    });
  }

  // Sort profiles: "Default" first, then alphabetically by displayName
  profiles.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return { profiles };
}
