let counter = 0;

/** Short, readable unique id — good enough for client-only in-memory state. */
export function uid(prefix = 'id') {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

/** A random 4-digit join code, as a string so leading zeros are preserved. */
export function generateTeamCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}
