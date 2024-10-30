'use server';

import { sql } from "@vercel/postgres";
import { getVerificationTokenByToken } from "../data/verification-token";
import { getUser } from "./actions"
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';


export async function verifyNewAccount(prevState: string | undefined, formData: FormData) {
    const token = formData.get('token')?.toString()
    if (!token) return "token does not exist!";
    const existingToken = await getVerificationTokenByToken(token);
    if (!existingToken) return "token cannot be reached!";

    const hasExpired = new Date() > new Date(existingToken.expires);
    if (hasExpired) return "token has expired";

    const existingUser = await getUser(existingToken.email);
    if (!existingUser) return "user does not exist!"
    // console.log(existingUser.id, existingToken.id);
    try {
        await sql`
        UPDATE users
        SET emailverified = ${new Date().toISOString()}
        WHERE id = ${existingUser.id};
        `;
        await sql`
        DELETE FROM verificationtoken
        WHERE id = ${existingToken.id};
        `;
    } catch (error) {
        console.log(error);
    }
    revalidatePath('/login');
    redirect('/login');
}