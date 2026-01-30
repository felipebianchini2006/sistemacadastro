import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Registry,
  Histogram,
  Counter,
} from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly httpHistogram = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
    registers: [this.registry],
  });
  private readonly httpCounter = new Counter({
    name: 'http_requests_total',
    help: 'HTTP request count',
    labelNames: ['method', 'route', 'status'],
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }

  observeRequest(
    method: string,
    route: string,
    status: number,
    durationSeconds: number,
  ) {
    const labels = {
      method,
      route,
      status: String(status),
    };
    this.httpHistogram.observe(labels, durationSeconds);
    this.httpCounter.inc(labels, 1);
  }

  async getMetrics() {
    return this.registry.metrics();
  }

  getContentType() {
    return this.registry.contentType;
  }
}
