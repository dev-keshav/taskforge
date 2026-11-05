const { randomUUID } = require("node:crypto");
const pool = require("./db");

const {
  createJob,
  getJobById,
} = require("./job.repository");

async function testJobs() {
  try {
    const jobId = randomUUID();

    // Create a job
    const createdJob = await createJob({
      id: jobId,
      type: "GENERATE_REPORT",
      payload: {
        reportId: 101,
        format: "PDF",
      },
    });

    console.log("Created job:");
    console.log(createdJob);

    // Retrieve the same job
    const retrievedJob = await getJobById(jobId);

    console.log("\nRetrieved job:");
    console.log(retrievedJob);

  } catch (error) {
    console.error("Job repository test failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testJobs();