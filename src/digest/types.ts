// Plan morning-digest §1. The contract every digest part builds against.
export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job. Times keep the offset from the log (styleguide: never convert to UTC).
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  first: string;
  last: string;
};

export type NightCounts = Record<RunStatus, number>;

// What one night's file says. `badLines` counts lines that did not parse; they never throw.
export type Night = {
  night: string;
  rows: DigestRow[];
  badLines: number;
  counts: NightCounts;
};

// null = no file for that night. An empty file is a Night with no rows.
export type ReadNight = (runsDir: string, night: string) => Night | null;
