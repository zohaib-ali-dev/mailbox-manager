// Side-effect import for plain Node entry points (seed, worker, CLI scripts). Next.js loads .env by
// itself. Import this BEFORE anything that imports `env`. Variables already set are never overridden.
import { config } from 'dotenv';

config({ quiet: true });
