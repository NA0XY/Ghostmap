import { greet } from "./utils.js";

/**
 * Main entry function
 */
export function main() {
  const message = greet("World");
  console.log(message);
}

main();
