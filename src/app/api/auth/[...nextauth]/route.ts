// This file initializes the NextAuth.js library and creates the API endpoint
// that will handle all authentication-related requests (e.g., login, logout, session checks).

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };