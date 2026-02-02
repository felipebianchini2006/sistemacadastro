import webpush from 'web-push';

export class PushService {
  constructor() {
    const vapidPublic = process.env.VAPID_PUBLIC_KEY ?? '';
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY ?? '';
    const vapidEmail = process.env.VAPID_EMAIL ?? 'mailto:admin@sbacem.org.br';

    if (vapidPublic && vapidPrivate) {
      webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);
    }
  }

  async send(input: {
    endpoint: string;
    p256dh: string;
    auth: string;
    title: string;
    body: string;
    url?: string;
  }): Promise<string | undefined> {
    const subscription = {
      endpoint: input.endpoint,
      keys: { p256dh: input.p256dh, auth: input.auth },
    };

    const payload = JSON.stringify({
      title: input.title,
      body: input.body,
      url: input.url ?? '/admin',
      icon: '/icon.svg',
    });

    const result = await webpush.sendNotification(subscription, payload);
    return String(result.statusCode);
  }
}
