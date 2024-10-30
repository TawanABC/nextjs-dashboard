import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcrypt';

import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

async function getUser(email: string): Promise<User | undefined> {
    try {
        const user = await sql<User>`SELECT * FROM users WHERE email=${email}`;
        return user.rows[0];
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    session: { strategy: "jwt" },
    ...authConfig,
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ user, account }) {
            if (account?.provider === "credentials") {
                if (user.email) {
                    const existingUser = await getUser(user.email);
                    if (existingUser?.emailverified) return true;
                }

                return false;
            }


            return true;
        },
        async session({ session }) {
            // console.log({ session });
            return session
        },
        async jwt({ token, account, user }) {
            // console.log({ account });
            if (account?.provider === "google") {
                try {
                    await sql`
                    INSERT INTO users (id, name, email, image, emailverified)
                    VALUES (${user.id}, ${user.name}, ${user.email},${user.image},${new Date().toISOString()})
                    ON CONFLICT (email)
                    DO UPDATE
                    SET name = EXCLUDED.name,
                    image = EXCLUDED.image,
                    emailverified = EXCLUDED.emailverified
                    `;
                    console.log("pass1");
                } catch (error) {
                    console.log("fail1");
                    console.log(error);
                    // If a database error occurs, return a more specific error.
                    return {
                        message: 'Database Error: Failed to Create Account.',
                    };
                }
                try {
                    await sql`
                    INSERT INTO accounts (id, access_token, scope, token_type, id_token, expires_at, provider, type, provideraccountid)
                    SELECT u.id, ${account.access_token}, ${account.scope}, ${account.token_type}, 
                    ${account.id_token}, ${account.expires_at}, ${account.type}, ${account.provider}, ${account.providerAccountId}
                    FROM users u
                    WHERE u.email = ${user.email}
                    ON CONFLICT (id)
                    DO UPDATE
                    SET access_token = EXCLUDED.access_token,
                    scope = EXCLUDED.scope,
                    token_type = EXCLUDED.token_type,
                    id_token = EXCLUDED.id_token,
                    expires_at = EXCLUDED.expires_at,
                    provider = EXCLUDED.provider,
                    type = EXCLUDED.type,
                    provideraccountid = EXCLUDED.provideraccountid;
                    `;
                    console.log("pass2");
                } catch (error) {
                    console.log("fail2");
                    console.log(error);
                    // If a database error occurs, return a more specific error.
                    return {
                        message: 'Database Error: Failed to Create Account.',
                    };
                }
            }
            // console.log({ user });
            // console.log({ profile });
            return token;
        }
    },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        GitHub({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        }),
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getUser(email);
                    if (!user) return null;
                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) return user;
                }

                console.log('Invalid credentials');
                return null;
            },
        }),
    ],
});