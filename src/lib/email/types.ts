export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export type EmailProvider = (message: EmailMessage) => Promise<void>;
