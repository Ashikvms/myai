'use client';

import Link from 'next/link';
import { Sparkles, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center pt-16">
      <div className="mx-auto max-w-md w-full px-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-card-dark p-8 shadow-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-purple-500 shadow-lg shadow-primary-500/25 mb-6">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sign In
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Coming in Section 9
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
