const KEY = 'sos-person-id';
const MAX_AGE = 365 * 24 * 60 * 60; // 1 year

export function setPersonId(id: string) {
  localStorage.setItem(KEY, id);
  document.cookie = `${KEY}=${id}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function getPersonId(): string | null {
  const ls = localStorage.getItem(KEY);
  if (ls) return ls;
  const match = document.cookie.match(/sos-person-id=([^;]+)/);
  if (match) {
    localStorage.setItem(KEY, match[1]);
    return match[1];
  }
  return null;
}

export function clearPersonId() {
  localStorage.removeItem(KEY);
  document.cookie = `${KEY}=; path=/; max-age=0; SameSite=Lax`;
}
