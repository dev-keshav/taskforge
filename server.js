const http = require("node:http");
const { randomUUID } = require("node:crypto");

const {
  createJob,
  getJobById,
} = require("./src/job.repository");

const server = http.createServer(async (req, res) => {
  function sendJson(statusCode, data) {
    res.writeHead(statusCode, {
      "Content-Type": "application/json",
    });

    res.end(JSON.stringify(data));
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // GET /
  if (req.method === "GET" && pathname === "/") {
    return sendJson(200, {
      name: "TaskForge",
      message: "Distributed Background Job Processing System",
    });
  }

  // GET /health
  if (req.method === "GET" && pathname === "/health") {
    return sendJson(200, {
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // POST /jobs
    if (req.method === "POST" && pathname === "/jobs") {
      const chunks = [];
      let bodySize = 0;
      const MAX_BODY_SIZE = 1024 * 1024;

      for await (const chunk of req) {
        bodySize += chunk.length;

        if (bodySize > MAX_BODY_SIZE) {
          return sendJson(413, {
            error: "Request body is too large",
          });
        }

        chunks.push(chunk);
      }

      let data;

      try {
        data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        return sendJson(400, {
          error: "Invalid JSON body",
        });
      }

      if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
      ) {
        return sendJson(400, {
          error: "Request body must be a JSON object",
        });
      }

      if (
        typeof data.type !== "string" ||
        data.type.trim() === ""
      ) {
        return sendJson(400, {
          error: "Job type is required",
        });
      }

      if (
        !data.payload ||
        typeof data.payload !== "object" ||
        Array.isArray(data.payload)
      ) {
        return sendJson(400, {
          error: "Job payload must be a JSON object",
        });
      }

      const jobId = randomUUID();

      // Save job in PostgreSQL
      const job = await createJob({
        id: jobId,
        type: data.type.trim(),
        payload: data.payload,
      });

      return sendJson(202, {
        jobId: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.created_at,
        message: "Job accepted successfully",
      });
    }

    // GET /jobs/:jobId
    const jobMatch = pathname.match(/^\/jobs\/([^/]+)$/);

    if (req.method === "GET" && jobMatch) {
      const jobId = jobMatch[1];

      // Retrieve job from PostgreSQL
      const job = await getJobById(jobId);

      if (!job) {
        return sendJson(404, {
          error: "Job not found",
          jobId,
        });
      }

      return sendJson(200, {
        jobId: job.id,
        type: job.type,
        payload: job.payload,
        status: job.status,
        attempts: job.attempts,
        maxAttempts: job.max_attempts,
        lastError: job.last_error,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
      });
    }

    return sendJson(404, {
      error: "Route not found",
    });
  } catch (error) {
    console.error("Request failed:", error);

    return sendJson(500, {
      error: "Internal server error",
    });
  }
});

server.listen(3000, () => {
  console.log("TaskForge API running at http://localhost:3000");
});