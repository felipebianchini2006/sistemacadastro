import { ImageAnnotatorClient } from '@google-cloud/vision';

export type VisionOcrOutput = {
  rawText: string;
  rawResponse: unknown;
};

export class VisionOcrService {
  private readonly client: ImageAnnotatorClient;

  constructor() {
    this.client = new ImageAnnotatorClient(this.buildClientOptions());
  }

  async documentTextDetection(buffer: Buffer): Promise<VisionOcrOutput> {
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

  private buildClientOptions() {
    const rawCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!rawCredentials) {
      return {};
    }

    try {
      const credentials = JSON.parse(rawCredentials);
      const projectId = credentials.project_id ?? process.env.GOOGLE_CLOUD_PROJECT;

      return {
        credentials,
        projectId,
      };
    } catch (error) {
      throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON');
    }
  }
}
