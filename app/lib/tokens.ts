import { sql } from "@vercel/postgres";
import { getVerificationTokenByEmail } from "../data/verification-token";
import { VerifiedToken } from '../lib/definitions';
import { v4 as uuidv4 } from 'uuid';

export const generateVerificationToken = async (email: string) => {
    const token = uuidv4();
    const expires = new Date(new Date().getTime() + 3600 * 1000).toISOString();
    const existingToken = await getVerificationTokenByEmail(email);
    console.log(existingToken);
    if (existingToken) {
        try {
            await sql`
            DELETE FROM verificationtoken
            WHERE id = ${existingToken.id}`;
        } catch (error) {

        }
    }
    try {
        await sql`
        INSERT INTO verificationtoken (email, token, expires)
        VALUES (${email},${token},${expires})
        `;
        console.log("gg successful");
    } catch (error) {

    }
    return { email: email, token: token, expires: expires };
}