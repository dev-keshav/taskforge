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

module.exports = {
  createJob,
  getJobById,
};