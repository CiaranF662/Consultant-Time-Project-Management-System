import { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';

// Extend the built-in JWT type
declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
  }
}

// Extend the built-in Session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }
}