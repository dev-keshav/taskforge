
const http = require("node:http");
const { randomUUID } = require("node:crypto");

// Temporary storage. We'll replace this with PostgreSQL.
const jobs = new Map();

const server = http.createServer(async (req, res) => {
  // Helper to send JSON responses
  function sendJson(statusCode, data) {
    res.writeHead(statusCode, {
      "Content-Type": "application/json",
    });

    res.end(JSON.stringify(data));
  }

  // GET /
  if (req.method === "GET" && req.url === "/") {
    return sendJson(200, {
      name: "TaskForge",
      message: "Distributed Background Job Processing System",
    });
  }

  // GET /health
  if (req.method === "GET" && req.url === "/health") {
    return sendJson(200, {
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }

  // POST /jobs
  if (req.method === "POST" && req.url === "/jobs") {
    try {
      let body = "";
      const MAX_BODY_SIZE = 1024 * 1024;

      for await (const chunk of req) {
        body += chunk;

        if (Buffer.byteLength(body) > MAX_BODY_SIZE) {
          return sendJson(413, {
            error: "Request body is too large",
          });
        }
      }

      let data;

      try {
        data = JSON.parse(body);
      } catch {
        return sendJson(400, {
          error: "Invalid JSON body",
        });
      }

      // Validate request
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

      // Create job
      const jobId = randomUUID();

      const job = {
        jobId,
        type: data.type,
        payload: data.payload,
        status: "QUEUED",
        createdAt: new Date().toISOString(),
      };

      jobs.set(jobId, job);

      return sendJson(202, {
        jobId,
        type: job.type,
        status: job.status,
        message: "Job accepted successfully",
      });
    } catch (error) {
      console.error("Job creation failed:", error);

      return sendJson(500, {
        error: "Internal server error",
      });
    }
  }

  // Unknown route
  return sendJson(404, {
    error: "Route not found",
  });
});

server.listen(3000, () => {
  console.log("TaskForge API running at http://localhost:3000");
});
