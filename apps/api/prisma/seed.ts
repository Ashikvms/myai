import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d;
}

function setTime(date: Date, hours: number, minutes: number): Date {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

async function main() {
  // ── Demo User (upsert for idempotency) ──
  const passwordHash = await bcrypt.hash('Demo1234!', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@lifeadmin.app' },
    update: {},
    create: {
      email: 'demo@lifeadmin.app',
      passwordHash,
      name: 'Alex Johnson',
      plan: 'FREE',
      onboardingComplete: true,
    },
  });

  const userId = user.id;

  // ── Notification Preferences ──
  await prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      emailNotifications: true,
      pushNotifications: true,
      billReminders: true,
      appointmentReminders: true,
      documentExpiry: true,
      taskReminders: true,
      reminderLeadDays: 3,
    },
  });

  // ── Bills ──
  const billsData = [
    {
      name: 'Rent',
      category: 'Housing',
      amount: 1850,
      frequency: 'MONTHLY' as const,
      nextDueDate: daysFromNow(5),
      isAutopay: true,
      notes: 'Apartment 4B - auto-debit on 1st',
    },
    {
      name: 'Internet',
      category: 'Utilities',
      amount: 79.99,
      frequency: 'MONTHLY' as const,
      nextDueDate: daysFromNow(12),
      isAutopay: true,
      notes: 'Fiber 500Mbps plan',
    },
    {
      name: 'Electricity',
      category: 'Utilities',
      amount: 120,
      frequency: 'MONTHLY' as const,
      nextDueDate: daysFromNow(2),
      isAutopay: false,
      notes: 'Variable amount — check bill each month',
    },
  ];

  for (const bill of billsData) {
    await prisma.bill.create({
      data: { userId, ...bill },
    });
  }

  // ── Subscriptions ──
  const subsData = [
    {
      name: 'Netflix',
      category: 'Entertainment',
      amount: 15.49,
      frequency: 'MONTHLY' as const,
      nextRenewalDate: daysFromNow(14),
      isAutopay: true,
      notes: 'Standard plan',
    },
    {
      name: 'Spotify',
      category: 'Entertainment',
      amount: 10.99,
      frequency: 'MONTHLY' as const,
      nextRenewalDate: daysFromNow(7),
      isAutopay: true,
      notes: 'Premium individual',
    },
    {
      name: 'Gym Membership',
      category: 'Health',
      amount: 49,
      frequency: 'MONTHLY' as const,
      nextRenewalDate: daysFromNow(3),
      isAutopay: true,
      notes: 'LA Fitness — annual rate locked in',
    },
    {
      name: 'iCloud Storage',
      category: 'Tech',
      amount: 2.99,
      frequency: 'MONTHLY' as const,
      nextRenewalDate: daysFromNow(20),
      isAutopay: true,
      notes: '200GB plan',
    },
  ];

  for (const sub of subsData) {
    await prisma.subscription.create({
      data: { userId, ...sub },
    });
  }

  // ── Documents ──
  const docsData = [
    {
      title: 'Passport',
      category: 'IDENTITY' as const,
      expirationDate: daysFromNow(14 * 30), // ~14 months
      notes: 'Renew 6 months before expiry',
    },
    {
      title: 'Car Insurance Policy',
      category: 'INSURANCE' as const,
      expirationDate: daysFromNow(2 * 30), // ~2 months
      issueDate: daysFromNow(-10 * 30),
      notes: 'Progressive — comprehensive coverage. Policy #AC-29481',
    },
    {
      title: 'Lease Agreement',
      category: 'LEASE' as const,
      expirationDate: daysFromNow(8 * 30), // ~8 months
      issueDate: daysFromNow(-4 * 30),
      notes: '12-month lease, renewal clause in Section 8',
    },
    {
      title: 'W-2 Form 2025',
      category: 'TAX' as const,
      issueDate: daysFromNow(-60),
      notes: 'Needed for tax filing',
    },
    {
      title: 'Health Insurance Card',
      category: 'MEDICAL' as const,
      expirationDate: daysFromNow(9 * 30),
      notes: 'Blue Cross Blue Shield — Group #4481',
    },
  ];

  for (const doc of docsData) {
    await prisma.document.create({
      data: { userId, ...doc },
    });
  }

  // ── Appointments ──
  const aptsData = [
    {
      title: 'Dentist — Cleaning',
      dateTime: setTime(daysFromNow(21), 10, 0),
      endTime: setTime(daysFromNow(21), 11, 0),
      location: 'Dr. Smith Dental, 123 Main St',
      notes: 'Regular checkup and cleaning. Bring insurance card.',
      category: 'Health',
      reminderMinutes: 60,
    },
    {
      title: 'Car Service — 45K Mile',
      dateTime: setTime(daysFromNow(42), 8, 30),
      endTime: setTime(daysFromNow(42), 10, 0),
      location: 'Honda Service Center, 456 Oak Ave',
      notes: 'Oil change and tire rotation.',
      category: 'Car',
      reminderMinutes: 120,
    },
  ];

  for (const apt of aptsData) {
    await prisma.appointment.create({
      data: { userId, ...apt },
    });
  }

  // ── Tasks ──
  const tasksData = [
    {
      title: 'File 2024 taxes',
      notes: 'Gather W-2, 1099s, and submit to accountant.',
      dueDate: daysFromNow(14),
      category: 'Finance',
      priority: 'HIGH' as const,
    },
    {
      title: 'Call landlord about lease renewal',
      notes: 'Discuss terms for next year. Current lease expires in 8 months.',
      dueDate: daysFromNow(7),
      category: 'Home',
      priority: 'MEDIUM' as const,
    },
    {
      title: 'Compare car insurance quotes',
      notes: 'Current policy expires in 2 months. Check Progressive, Geico, State Farm.',
      dueDate: daysFromNow(21),
      category: 'Finance',
      priority: 'MEDIUM' as const,
    },
    {
      title: 'Buy groceries',
      notes: 'Weekly grocery run.',
      dueDate: daysFromNow(0),
      category: 'Personal',
      priority: 'LOW' as const,
    },
    {
      title: 'Schedule annual physical',
      notes: 'Call Dr. Patel\'s office for availability.',
      dueDate: daysFromNow(10),
      category: 'Health',
      priority: 'MEDIUM' as const,
    },
  ];

  for (const task of tasksData) {
    await prisma.task.create({
      data: { userId, ...task },
    });
  }

  // ── Reminders ──
  const remindersData = [
    {
      title: 'Renew vehicle registration',
      dateTime: daysFromNow(60),
      isRecurring: true,
      recurrenceRule: 'ANNUALLY',
      linkedType: 'NONE' as const,
    },
    {
      title: 'Gym membership renewal — still worth it?',
      dateTime: daysFromNow(30),
      isRecurring: false,
      linkedType: 'SUBSCRIPTION' as const,
    },
    {
      title: 'Pay electricity bill',
      dateTime: daysFromNow(1),
      isRecurring: false,
      linkedType: 'BILL' as const,
    },
  ];

  for (const reminder of remindersData) {
    await prisma.reminder.create({
      data: { userId, ...reminder },
    });
  }

  // ── AI Conversation (seeded example) ──
  const conversation = await prisma.aiConversation.create({
    data: {
      userId,
      title: 'Weekly check-in',
    },
  });

  const messagesData = [
    {
      role: 'USER' as const,
      content: 'What bills are due this week?',
    },
    {
      role: 'ASSISTANT' as const,
      content:
        'You have **1 bill due this week**:\n\n' +
        '- **Electricity** — $120.00, due in 2 days (not on autopay)\n\n' +
        'Your rent ($1,850) and internet ($79.99) are on autopay and due later this month. ' +
        'Would you like me to set a reminder for the electricity bill?',
    },
    {
      role: 'USER' as const,
      content: 'Yes, remind me tomorrow morning.',
    },
  ];

  for (const msg of messagesData) {
    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        ...msg,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('✓ Seed complete. Demo user: demo@lifeadmin.app / Demo1234!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
