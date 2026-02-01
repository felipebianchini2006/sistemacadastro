import { ImageAnnotatorClient } from '@google-cloud/vision';

type ClientOptions = ConstructorParameters<typeof ImageAnnotatorClient>[0];
const emptyOptions = {} as ClientOptions;

export type VisionOcrOutput = {
  rawText: string;
  rawResponse: unknown;
};

export class VisionOcrService {
  private readonly client?: ImageAnnotatorClient;
  readonly enabled: boolean;

  constructor() {
    const { enabled, clientOptions } = this.buildClientOptions();
    this.enabled = enabled;
    if (this.enabled) {
      this.client = new ImageAnnotatorClient(clientOptions);
    }
  }

  async documentTextDetection(buffer: Buffer): Promise<VisionOcrOutput> {
    if (!this.client) {
      throw new Error('Vision OCR disabled');
    }

    const [result] = await this.client.documentTextDetection({
      image: { content: buffer },
    });

    const rawText =
      result.fullTextAnnotation?.text ?? result.textAnnotations?.[0]?.description ?? '';

    return {
      rawText,
      rawResponse: result,
    };
  }

  private buildClientOptions(): {
    enabled: boolean;
    clientOptions: ClientOptions;
  } {
    const explicitlyDisabled = process.env.OCR_ENABLED?.toLowerCase() === 'false';
    const rawCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const fileCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const hasCredentials = Boolean(rawCredentials || fileCredentials);

    if (explicitlyDisabled || !hasCredentials) {
      process.env.GOOGLE_CLOUD_DISABLE_GCE_METADATA =
        process.env.GOOGLE_CLOUD_DISABLE_GCE_METADATA ?? 'true';
      return { enabled: false, clientOptions: emptyOptions };
    }

    if (!rawCredentials) {
      return { enabled: true, clientOptions: emptyOptions };
    }

    try {
      const credentials = JSON.parse(rawCredentials);
      const projectId = credentials.project_id ?? process.env.GOOGLE_CLOUD_PROJECT;

      return { enabled: true, clientOptions: { credentials, projectId } };
    } catch (error) {
      throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON');
    }
  }
}
