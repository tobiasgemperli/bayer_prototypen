/**
 * Single source of truth for demo / dummy content shown across the prototype.
 * Components should read identity/labels from here rather than hardcoding them,
 * so the demo persona can be changed in one place.
 *
 * (Seed plots/treatments/lab data live in their own data stores: `plots-database`,
 * `plots-data`, `lab-results-data` — those are the SSOT for tabular demo data.)
 */

export interface DemoUser {
  name: string;
  email: string;
  /** Avatar initial(s). */
  initial: string;
}

/** The signed-in demo user. */
export const demoUser: DemoUser = {
  name: 'Lyle Peterer',
  email: 'lyle.peterer@bayer.com',
  initial: 'L',
};
