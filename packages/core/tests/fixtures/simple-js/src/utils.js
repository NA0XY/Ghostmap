/**
 * Greet a person by name
 * @param {string} name
 */
export function greet(name) {
  return `Hello, ${name}!`;
}

export function shout(name) {
  return greet(name).toUpperCase();
}
