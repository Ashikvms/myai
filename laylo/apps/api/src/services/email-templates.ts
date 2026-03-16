const PRIMARY = '#6366F1';

function layout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:${PRIMARY};padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Life Admin AI</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">Life Admin AI — Your personal life management assistant</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function billReminderTemplate(billName: string, amount: number, dueDate: string): string {
  return layout(
    'Bill Reminder',
    `<h2 style="margin:0 0 16px;color:#18181b;font-size:18px;">Bill Due Soon</h2>
     <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.6;">
       Your <strong>${billName}</strong> bill of <strong>$${amount.toFixed(2)}</strong> is due on <strong>${dueDate}</strong>.
     </p>
     <p style="margin:0;color:#71717a;font-size:14px;">
       Make sure to pay on time to avoid late fees.
     </p>`,
  );
}

export function documentExpiryTemplate(docTitle: string, expiryDate: string): string {
  return layout(
    'Document Expiry Notice',
    `<h2 style="margin:0 0 16px;color:#18181b;font-size:18px;">Document Expiring Soon</h2>
     <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.6;">
       Your document <strong>${docTitle}</strong> expires on <strong>${expiryDate}</strong>.
     </p>
     <p style="margin:0;color:#71717a;font-size:14px;">
       Please take action to renew it before the expiration date.
     </p>`,
  );
}

export function reminderTemplate(title: string): string {
  return layout(
    'Reminder',
    `<h2 style="margin:0 0 16px;color:#18181b;font-size:18px;">Reminder</h2>
     <p style="margin:0;color:#3f3f46;font-size:15px;line-height:1.6;">
       ${title}
     </p>`,
  );
}

export function welcomeTemplate(name: string): string {
  return layout(
    'Welcome to Life Admin AI',
    `<h2 style="margin:0 0 16px;color:#18181b;font-size:18px;">Welcome, ${name}!</h2>
     <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.6;">
       Thanks for joining Life Admin AI. We're here to help you stay on top of your bills, documents, subscriptions, and more.
     </p>
     <p style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.6;">
       Get started by adding your first bill or document, and let our AI assistant help you manage your life admin.
     </p>
     <a href="#" style="display:inline-block;background-color:${PRIMARY};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:500;">
       Get Started
     </a>`,
  );
}
