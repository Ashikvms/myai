import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../config/prisma';

// ── Email via Resend ─────────────────────

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured — skipping email send');
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Life Admin AI <noreply@lifeadmin.app>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error('Failed to send email via Resend', {
        status: response.status,
        body,
        to,
        subject,
      });
    } else {
      logger.info('Email sent', { to, subject });
    }
  } catch (err) {
    logger.error('Email send error', { error: (err as Error).message, to, subject });
  }
}

// ── Push via Expo ────────────────────────

const pushFailureCounts = new Map<string, number>();

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!env.EXPO_ACCESS_TOKEN) {
    logger.warn('EXPO_ACCESS_TOKEN not configured — skipping push notification');
    return;
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}`,
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        data,
        sound: 'default',
      }),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      logger.error('Push notification failed', {
        status: response.status,
        body: responseBody,
        pushToken,
      });

      // Track failures for this token
      const count = (pushFailureCounts.get(pushToken) ?? 0) + 1;
      pushFailureCounts.set(pushToken, count);

      if (count >= 3) {
        logger.warn('Push token failed 3 times — clearing token', { pushToken });
        pushFailureCounts.delete(pushToken);
        await clearInvalidPushToken(pushToken);
      }
    } else {
      // Reset failure count on success
      pushFailureCounts.delete(pushToken);

      const result = await response.json();
      // Check for ticket-level errors (Expo returns 200 but ticket has error)
      if (result?.data?.status === 'error') {
        logger.error('Push notification ticket error', {
          detail: result.data.details,
          pushToken,
        });

        if (result.data.details?.error === 'DeviceNotRegistered') {
          logger.warn('Device not registered — clearing push token', { pushToken });
          await clearInvalidPushToken(pushToken);
        }
      } else {
        logger.info('Push notification sent', { pushToken: pushToken.slice(0, 20) + '...' });
      }
    }
  } catch (err) {
    logger.error('Push notification error', { error: (err as Error).message, pushToken });
  }
}

async function clearInvalidPushToken(pushToken: string): Promise<void> {
  try {
    await prisma.notificationPreference.updateMany({
      where: { pushToken },
      data: { pushToken: null },
    });
    logger.info('Cleared invalid push token from preferences');
  } catch (err) {
    logger.error('Failed to clear push token', { error: (err as Error).message });
  }
}

// ── Unified notify helper ────────────────

export async function notifyUser(
  userId: string,
  subject: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    const [prefs, user] = await Promise.all([
      prisma.notificationPreference.findUnique({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    ]);

    if (!prefs || !user) {
      logger.warn('Cannot notify user — missing preferences or user record', { userId });
      return;
    }

    const promises: Promise<void>[] = [];

    if (prefs.emailNotifications && user.email) {
      promises.push(sendEmail(user.email, subject, body));
    }

    if (prefs.pushNotifications && prefs.pushToken) {
      promises.push(sendPushNotification(prefs.pushToken, subject, body, data));
    }

    await Promise.all(promises);
  } catch (err) {
    logger.error('notifyUser error', { error: (err as Error).message, userId });
  }
}
