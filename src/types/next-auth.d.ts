import { UserRole } from '@prisma/client';
import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      isProductManager: boolean;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: UserRole;
    isProductManager: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    isProductManager: boolean;
  }
}