// Standard overcurrent device ratings, shared by everything that picks a breaker or a fuse.

/** Amps (NEC 240.6(A)). */
const STANDARD_RATINGS = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000];

/** The smallest standard rating at or above `amps`. Undefined past the end of the list. */
export const ratingAtLeast = (amps: number) => STANDARD_RATINGS.find((r) => r >= amps - 1e-9);

/** The largest standard rating at or below `amps`. Undefined under the smallest one. */
export const ratingAtMost = (amps: number) => [...STANDARD_RATINGS].reverse().find((r) => r <= amps + 1e-9);
