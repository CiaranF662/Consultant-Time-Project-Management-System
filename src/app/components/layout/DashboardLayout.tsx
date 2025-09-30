'use client';

import React, { ReactNode } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';

type Props = {
	children: ReactNode;
};

export default function DashboardLayout({ children }: Props) {
	const { theme } = useTheme();

	return (
		<div className={`min-h-screen transition-colors duration-200 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
			{/* Main content wrapper mirrors add-sidebar spacing so pages align with the sidebar */}
			<div className={`transition-all duration-300 ease-in-out min-h-screen lg:ml-16`}>
				<main className="pt-16 lg:pt-0">
					<div className="h-full max-w-7xl mx-auto">{children}</div>
				</main>
			</div>
		</div>
	);
}
