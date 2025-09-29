'use client';

import React, { ReactNode } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import Sidebar from './add-sidebar';

type Props = {
	children: ReactNode;
};

export default function DashboardLayout({ children }: Props) {
	const { theme } = useTheme();
	
	return (
		<Sidebar>
			<div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
				<main className="h-full max-w-7xl mx-auto">{children}</main>
			</div>
		</Sidebar>
	);
}
