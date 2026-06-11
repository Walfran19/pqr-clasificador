require("dotenv").config();
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const { inicializar } = require("./src/models/database");

const sqs = new SQSClient({});

async function consumirNotificaciones(handlers) {
  const queueUrl = process.env.NOTIFY_QUEUE_URL;
  if (!queueUrl) {
    console.warn("[Notify] NOTIFY_QUEUE_URL no configurada, consumidor SQS deshabilitado.");
    return;
  }

  const { notificarCambioEstado, notificarRespuesta } = handlers.wa;
  const { notificarCambioEstadoTG, notificarRespuestaTG } = handlers.tg;

  console.log("[Notify] Consumidor SQS iniciado.");

  while (true) {
    try {
      const { Messages } = await sqs.send(new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
      }));

      for (const msg of Messages || []) {
        try {
          const evento = JSON.parse(msg.Body);

          if (evento.tipo === "cambio_estado") {
            await notificarCambioEstado(evento.email, evento.codigo, evento.estado).catch(() => {});
            await notificarCambioEstadoTG(evento.email, evento.codigo, evento.estado).catch(() => {});
          } else if (evento.tipo === "respuesta") {
            await notificarRespuesta(evento.email, evento.codigo, evento.respuesta).catch(() => {});
            await notificarRespuestaTG(evento.email, evento.codigo, evento.respuesta).catch(() => {});
          }
        } catch (err) {
          console.error("[Notify] Error procesando mensaje:", err.message);
        }

        await sqs.send(new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: msg.ReceiptHandle,
        }));
      }
    } catch (err) {
      console.error("[Notify] Error consumiendo SQS:", err.message);
    }
  }
}

async function main() {
  await inicializar();

  const { iniciarWhatsApp } = require("./src/services/whatsapp.service");
  const waFlow = require("./src/services/wa-flow.service");
  const { iniciarTelegram } = require("./src/services/telegram.service");
  const tgFlow = require("./src/services/telegram-flow.service");

  if (process.env.WHATSAPP_ENABLED !== "false") {
    iniciarWhatsApp(waFlow.manejarMensajeWA).catch(err =>
      console.error("[WhatsApp] Error al iniciar:", err.message)
    );
  }

  if (process.env.TELEGRAM_ENABLED !== "false") {
    iniciarTelegram(tgFlow.manejarMensajeTG).catch(err =>
      console.error("[Telegram] Error al iniciar:", err.message)
    );
  }

  consumirNotificaciones({ wa: waFlow, tg: tgFlow });
}

main().catch(err => {
  console.error("[Fatal] Error al iniciar el bot:", err.message);
  process.exit(1);
});
