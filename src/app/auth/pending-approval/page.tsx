import Link from 'next/link';

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 text-center border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-green-600">
          Registration Successful!
        </h1>
        <p className="mt-4 text-card-foreground">
          Your account has been created and is now pending approval from an administrator.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          You will be unable to log in until your account has been approved. Please check back later.
        </p>
        <div className="mt-8">
          <Link
            href="/auth/login"
            className="inline-block rounded-md bg-blue-500 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}