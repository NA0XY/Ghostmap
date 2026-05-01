/**
 * Simple async semaphore for limiting concurrent HEAVY job processing.
 */
export class Semaphore {
  private readonly max: number;
  private current = 0;
  private readonly waitQueue: Array<() => void> = [];

  constructor(max: number) {
    this.max = max;
  }

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current += 1;
      return;
    }

    await new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
    this.current += 1;
  }

  release(): void {
    if (this.current > 0) {
      this.current -= 1;
    }

    const next = this.waitQueue.shift();
    if (next) {
      next();
    }
  }

  get active(): number {
    return this.current;
  }

  get waiting(): number {
    return this.waitQueue.length;
  }
}

export const heavySemaphore = new Semaphore(3);
