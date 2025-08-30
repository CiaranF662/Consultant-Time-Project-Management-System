// This file is a TypeScript declaration file used to augment the default types provided
// by the 'next-auth' library. It extends the JWT and Session interfaces to include the
// custom 'id' and 'role' properties, ensuring type safety throughout the application
// when accessing session data.

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