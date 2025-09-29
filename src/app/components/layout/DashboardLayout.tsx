import React, { ReactNode } from 'react';

type Props = {
	children: ReactNode;
};

export default function DashboardLayout({ children }: Props) {
	return (
		<div className="min-h-screen bg-gray-50 text-gray-900">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">


				<main>{children}</main>
			</div>
		</div>
	);
}
