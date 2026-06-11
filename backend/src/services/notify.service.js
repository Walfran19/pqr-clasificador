const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const sqs = new SQSClient({});

// Publica un evento de notificación (WhatsApp/Telegram) en la cola SQS.
// El bot (proceso ECS con sesiones de WA/TG) consume estos eventos.
async function publicarNotificacion(evento) {
  const queueUrl = process.env.NOTIFY_QUEUE_URL;
  if (!queueUrl) {
    return; // sin cola configurada (ej. desarrollo local): no-op
  }

  await sqs.send(new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(evento),
  }));
}

module.exports = { publicarNotificacion };
