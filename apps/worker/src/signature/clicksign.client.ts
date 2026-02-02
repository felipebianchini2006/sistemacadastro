export type ClicksignClientConfig = {
  baseUrl: string;
  accessToken: string;
};

export class ClicksignClient {
  private readonly config: ClicksignClientConfig;

  constructor(config?: Partial<ClicksignClientConfig>) {
    const baseUrl =
      config?.baseUrl ?? process.env.CLICKSIGN_BASE_URL ?? 'https://sandbox.clicksign.com';
    const accessToken = config?.accessToken ?? process.env.CLICKSIGN_ACCESS_TOKEN ?? '';

    if (!accessToken) {
      throw new Error('CLICKSIGN_ACCESS_TOKEN not set');
    }

    this.config = {
      baseUrl,
      accessToken,
    };
  }

  async createEnvelope(input: {
    name: string;
    deadlineAt: string;
    locale?: string;
    status?: 'draft' | 'running';
  }) {
    return this.request('/api/v3/envelopes', {
      method: 'POST',
      body: {
        data: {
          type: 'envelopes',
          attributes: {
            name: input.name,
            locale: input.locale ?? 'pt-BR',
            deadline_at: input.deadlineAt,
            status: input.status ?? 'draft',
          },
        },
      },
    });
  }

  async uploadDocument(envelopeId: string, input: { filename: string; contentBase64: string }) {
    return this.request(`/api/v3/envelopes/${envelopeId}/documents`, {
      method: 'POST',
      body: {
        data: {
          type: 'documents',
          attributes: {
            filename: input.filename,
            content_base64: input.contentBase64,
          },
        },
      },
    });
  }

  async createSigner(envelopeId: string, input: { name: string; email: string; phone?: string }) {
    const attributes: Record<string, string> = {
      name: input.name,
      email: input.email,
    };
    if (input.phone) {
      attributes.phone = input.phone;
    }

    return this.request(`/api/v3/envelopes/${envelopeId}/signers`, {
      method: 'POST',
      body: {
        data: {
          type: 'signers',
          attributes,
        },
      },
    });
  }

  async createRequirement(
    envelopeId: string,
    input: {
      action: 'agree' | 'provide_evidence';
      role: 'sign';
      auth?: 'email' | 'sms' | 'whatsapp';
      documentId: string;
      signerId: string;
    },
  ) {
    return this.request(`/api/v3/envelopes/${envelopeId}/requirements`, {
      method: 'POST',
      body: {
        data: {
          type: 'requirements',
          attributes: {
            action: input.action,
            role: input.role,
            auth: input.auth,
          },
          relationships: {
            document: {
              data: { id: input.documentId, type: 'documents' },
            },
            signer: {
              data: { id: input.signerId, type: 'signers' },
            },
          },
        },
      },
    });
  }

  async updateEnvelope(envelopeId: string, status: 'draft' | 'running' | 'canceled') {
    return this.request(`/api/v3/envelopes/${envelopeId}`, {
      method: 'PATCH',
      body: {
        data: {
          id: envelopeId,
          type: 'envelopes',
          attributes: {
            status,
          },
        },
      },
    });
  }

  async cancelEnvelope(envelopeId: string) {
    return this.updateEnvelope(envelopeId, 'canceled');
  }

  async notifyEnvelope(envelopeId: string) {
    return this.request(`/api/v3/envelopes/${envelopeId}/notifications`, {
      method: 'POST',
      body: {
        data: {
          type: 'notifications',
        },
      },
    });
  }

  async getSigner(envelopeId: string, signerId: string) {
    return this.request(`/api/v3/envelopes/${envelopeId}/signers/${signerId}`, {
      method: 'GET',
    });
  }

  private async request(path: string, init: { method: string; body?: unknown }) {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: init.method,
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: this.config.accessToken,
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Clicksign API error: ${response.status} ${errorText}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }
}
