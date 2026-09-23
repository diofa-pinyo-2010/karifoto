import { env } from '@/env';

type DiscordNotificationType = 'info' | 'warning' | 'error';

const TYPE_EMOJI: Record<DiscordNotificationType, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '🚨',
};

/** Best-effort — never throws, so a Discord outage can't break the caller. */
export async function sendDiscordNotification({
  type,
  content,
}: {
  type: DiscordNotificationType;
  content: string;
}): Promise<void> {
  try {
    const response = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `${TYPE_EMOJI[type]} ${content}` }),
    });

    if (!response.ok) {
      console.error('[discord] webhook responded with an error', {
        status: response.status,
        body: await response.text(),
      });
    }
  } catch (error) {
    console.error('[discord] failed to send notification', error);
  }
}
