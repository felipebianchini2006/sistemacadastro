import { OcrWorker } from './ocr/ocr.worker';

const worker = new OcrWorker();

const shutdown = async () => {
  await worker.shutdown();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.info('OCR worker started');
