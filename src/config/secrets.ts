// Telegram bot credentials (direct mode — requested by the owner).
// WARNING: in a static website these values are visible to anyone who opens the browser dev tools.
// Use a bot made only for this exam and revoke the token in @BotFather (/revoke) after the exam.
// A build-time override is possible with VITE_BOT_TOKEN / VITE_CHAT_ID.
const env = (import.meta as any).env ?? {};

export const TELEGRAM_BOT_TOKEN: string = env.VITE_BOT_TOKEN || "6609908902:AAH7uD6mDZimgQCCA2YsZaMHLG2WdtVx_uE";
export const TELEGRAM_CHAT_ID: string = env.VITE_CHAT_ID || "5910341036";
