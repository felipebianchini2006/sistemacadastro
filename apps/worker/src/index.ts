import { OcrWorker } from './ocr/ocr.worker';
import { SignatureWorker } from './signature/signature.worker';

const ocrWorker = new OcrWorker();
const signatureWorker = new SignatureWorker();

const shutdown = async () => {
  await ocrWorker.shutdown();
  await signatureWorker.shutdown();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.info('Workers started');
