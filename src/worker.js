const fs = require("node:fs/promises");
const path = require("node:path");

const pool = require("./db");

const {
  connectQueue,
  QUEUE_NAME,
} = require("./queue");

const {
  markJobRunning,
  markJobCompleted,
  markJobFailed,
} = require("./job.repository");

async function processJob(job) {
  if (job.type !== "GENERATE_REPORT") {
    throw new Error(`Unsupported job type: ${job.type}`);
  }

  if (!job.payload || !job.payload.reportId) {
    throw new Error("reportId is required");
  }

  const reportsDirectory = path.join(
    __dirname,
    "../storage/reports"
  );

  await fs.mkdir(reportsDirectory, {
    recursive: true,
  });

  const artifactPath = path.join(
    reportsDirectory,
    `${job.id}.json`
  );

  const report = {
    reportId: job.payload.reportId,
    requestedFormat: job.payload.format || "JSON",
    generatedAt: new Date().toISOString(),
    jobId: job.id,
    message: "TaskForge sample report generated successfully",
  };

  await fs.writeFile(
    artifactPath,
    JSON.stringify(report, null, 2),
    "utf8"
  );

  return {
    artifactPath,
    contentType: "application/json",
  };
}

async function startWorker() {
  const channel = await connectQueue();

  // Process one message at a time for now.
  await channel.prefetch(1);

  console.log(`Worker listening on queue: ${QUEUE_NAME}`);

  await channel.consume(QUEUE_NAME, async (message) => {
    if (!message) return;

    let job;

    try {
      job = JSON.parse(message.content.toString());

      console.log(`Processing job: ${job.id}`);

      await markJobRunning(job.id);

      const result = await processJob(job);

      await markJobCompleted(job.id, result);

      console.log(`Job completed: ${job.id}`);

      channel.ack(message);
    } catch (error) {
      console.error("Job processing failed:", error.message);

      try {
        if (job?.id) {
          await markJobFailed(job.id, error.message);
        }

        // Acknowledge after recording the failure.
        channel.ack(message);
      } catch (databaseError) {
        console.error(
          "Could not record job failure:",
          databaseError.message
        );

        // Requeue if PostgreSQL could not record the failure.
        channel.nack(message, false, true);
      }
    }
  });
}

startWorker().catch(async (error) => {
  console.error("Worker startup failed:", error);

  await pool.end();

  process.exitCode = 1;
});