import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

let sdk: NodeSDK | null = null;

export const initOpenTelemetry = async () => {
  const enabled =
    process.env.OTEL_ENABLED === 'true' ||
    Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

  if (!enabled) return;

  const exporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      })
    : undefined;

  sdk = new NodeSDK({
    traceExporter: exporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  await sdk.start();

  process.on('SIGTERM', async () => {
    if (!sdk) return;
    await sdk.shutdown();
  });
};
