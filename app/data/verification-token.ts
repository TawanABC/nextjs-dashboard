import { db } from '@vercel/postgres';
import { sql } from '@vercel/postgres';
import { VerifiedToken } from '../lib/definitions';

export const getVerificationTokenByEmail = async (
    email: string
): Promise<VerifiedToken | null> => {
    try {
        const tokens = await sql<VerifiedToken>`
        SELECT t.id, t.email, t.token, t.expires
        FROM verificationtoken t
        WHERE t.email = ${email}
        `;

        // Return the first token or null if no token found
        return tokens.rows[0];
    } catch (error) {
        return null;
    }
}


export const getVerificationTokenByToken = async (
    tok: string
): Promise<VerifiedToken | null> => {
    try {
        const tokens = await sql<VerifiedToken>`
        SELECT t.id, t.email, t.token, t.expires
        FROM verificationtoken t
        WHERE t.token = ${tok}
        `;
        console.log("pass");
        // Return the first token or null if no token found
        return tokens.rows[0];
    } catch (error) {
        console.error(error);
        return null;
    }
}