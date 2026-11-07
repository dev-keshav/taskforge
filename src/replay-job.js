require("dotenv").config();

const amqp = require("amqplib");
const { getJobById } = require("./job.repository");

const QUEUE_NAME = "taskforge.jobs";

async function replayJob() {
  const jobId = process.argv[2];

  if (!jobId) {
    throw new Error("Please provide a job ID");
  }

  const job = await getJobById(jobId);

  if (!job) {
    throw new Error("Job not found");
  }

  if (job.status !== "COMPLETED") {
    throw new Error("Only completed jobs can be replayed in this test");
  }

  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createConfirmChannel();

  try {
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    channel.sendToQueue(
      QUEUE_NAME,
      Buffer.from(JSON.stringify(job)),
      {
        persistent: true,
        contentType: "application/json",
      }
    );

    await channel.waitForConfirms();

    console.log(`Duplicate message published: ${jobId}`);
  } finally {
    await channel.close();
    await connection.close();
  }
}

replayJob().catch((error) => {
  console.error("Replay failed:", error.message);
  process.exitCode = 1;
});