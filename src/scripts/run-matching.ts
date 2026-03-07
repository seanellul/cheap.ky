import { runMatchingPipeline } from "../lib/ingest/matching";

const skipAi = process.argv.includes("--skip-ai");

runMatchingPipeline({ skipAi }).catch((e) => {
  console.error("Matching failed:", e);
  process.exit(1);
});
