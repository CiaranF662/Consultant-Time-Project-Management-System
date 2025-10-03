import Link from 'next/link';

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
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
            href="/login"
            className="inline-block rounded-md bg-blue-500 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}