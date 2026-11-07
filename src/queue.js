const amqp = require("amqplib");
require("dotenv").config();

const QUEUE_NAME = "taskforge.jobs";

let connection;
let channel;

async function connectQueue() {
  if (channel) {
    return channel;
  }

  connection = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await connection.createConfirmChannel();

  await channel.assertQueue(QUEUE_NAME, {
    durable: true,
  });

  console.log("RabbitMQ connected successfully!");

  return channel;
}

async function publishJob(job) {
  const channel = await connectQueue();

  channel.sendToQueue(
    QUEUE_NAME,
    Buffer.from(JSON.stringify(job)),
    {
      persistent: true,
      contentType: "application/json",
    }
  );

  // Wait until RabbitMQ confirms the message.
  await channel.waitForConfirms();

  console.log(`Job published successfully: ${job.id}`);
}

module.exports = {
  connectQueue,
  publishJob,
  QUEUE_NAME,
};