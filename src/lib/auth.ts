import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient, UserStatus, UserRole, ProjectRole } from '@prisma/client';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Remove the declare module blocks - they're now in next-auth.d.ts

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing email or password');
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            projectAssignments: {
              where: {
                role: ProjectRole.PRODUCT_MANAGER
              }
            }
          }
        });
        
        if (!user || !user.password) {
          throw new Error('No user found with that email or password');
        }
        
        const passwordsMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );
        
        if (!passwordsMatch) {
          throw new Error('Incorrect password');
        }

        if (user.role === UserRole.GROWTH_TEAM && user.status !== UserStatus.APPROVED) {
          throw new Error('Your account is pending approval by an administrator.');
        }

        const isProductManager = user.projectAssignments.length > 0;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isProductManager,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 4 * 60 * 60, // 4 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isProductManager = user.isProductManager;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.isProductManager = token.isProductManager;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};