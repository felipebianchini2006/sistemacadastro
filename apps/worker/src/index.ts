import { OcrWorker } from './ocr/ocr.worker';
import { SignatureWorker } from './signature/signature.worker';
import { NotificationWorker } from './notifications/notification.worker';
import { MaintenanceWorker } from './maintenance/maintenance.worker';

const ocrWorker = new OcrWorker();
const signatureWorker = new SignatureWorker();
const notificationWorker = new NotificationWorker();
const maintenanceWorker = new MaintenanceWorker();

const shutdown = async () => {
  await ocrWorker.shutdown();
  await signatureWorker.shutdown();
  await notificationWorker.shutdown();
  await maintenanceWorker.shutdown();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.info('Workers started');
