const pool = require("./db");

async function createJob({ id, type, payload }) {
  const query = `
    INSERT INTO jobs (id, type, payload)
    VALUES ($1, $2, $3)
    RETURNING *
  `;

  const values = [id, type, JSON.stringify(payload)];

  const result = await pool.query(query, values);

  return result.rows[0];
}

async function getJobById(id) {
  const query = `
    SELECT *
    FROM jobs
    WHERE id = $1
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
}

async function markJobRunning(id) {
  const result = await pool.query(
    `UPDATE jobs
     SET status = 'RUNNING',
         attempts = attempts + 1,
         started_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  return result.rows[0] || null;
}

async function markJobCompleted(id, resultData) {
  const result = await pool.query(
    `UPDATE jobs
     SET status = 'COMPLETED',
         result = $2::jsonb,
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, JSON.stringify(resultData)]
  );

  return result.rows[0] || null;
}

async function markJobFailed(id, error) {
  const result = await pool.query(
    `UPDATE jobs
     SET status = 'FAILED',
         last_error = $2,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, error]
  );

  return result.rows[0] || null;
}

module.exports = {
  createJob,
  getJobById,
  markJobRunning,
  markJobCompleted,
  markJobFailed
};