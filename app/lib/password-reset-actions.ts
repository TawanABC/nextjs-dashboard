'use server';

import { sql } from "@vercel/postgres";
import { PasswordResetToken, VerifiedToken } from "./definitions";
import { getUser } from "./actions";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from 'uuid';
import { z } from "zod";
import { sendPasswordResetEmail } from "@/lib/mail";
import bcrypt from 'bcrypt';

const Email = z.object({
    email: z.string().email(),
});
const ResetPassword = z.object({
    password: z.string().min(6),
    token: z.string(),
});
export const getResetTokenByToken = async (
    tok: string
): Promise<PasswordResetToken | null> => {
    try {
        const tokens = await sql<PasswordResetToken>`
        SELECT t.id, t.email, t.token, t.expires
        FROM passwordresettoken t
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

export const getResetTokenByEmail = async (email: string): Promise<PasswordResetToken | null> => {
    try {
        const tokens = await sql<PasswordResetToken>`
        SELECT t.id, t.email, t.token, t.expires
        FROM passwordresettoken t
        WHERE t.email = ${email}
        `;

        // Return the first token or null if no token found
        return tokens.rows[0];
    } catch (error) {
        return null;
    }
}

export const generatePasswordResetToken = async (email: string) => {
    const token = uuidv4();
    const expires = new Date(new Date().getTime() + 3600 * 1000).toISOString();
    const existingToken = await getResetTokenByEmail(email);
    if (existingToken) {
        try {
            await sql`
            DELETE FROM passwordresettoken
            WHERE id = ${existingToken.id}`;
        } catch (error) {

        }
    }
    try {
        await sql`
        INSERT INTO passwordresettoken (email, token, expires)
        VALUES (${email},${token},${expires})
        `;
        console.log("generate successful");
    } catch (error) {

    }
    return { email: email, token: token, expires: expires };
}

export async function validateEmail(prevState: string | undefined, formData: FormData) {
    const validatedEmail = Email.safeParse({
        email: formData.get('email'),
    });
    if (!validatedEmail.success) {
        return 'Invalid Email';
    }
    const { email } = validatedEmail.data;
    const existingUser = getUser(email);
    if (!existingUser) return 'User does not exist!';

    const resetToken = await generatePasswordResetToken(email);
    await sendPasswordResetEmail(resetToken.email, resetToken.token);
    return 'email sent!'
}


export async function resetPassword(prevState: string | undefined, formData: FormData) {
    // console.log(formData.get('token'));
    const validatedField = ResetPassword.safeParse({
        password: formData.get('password'),
        token: formData.get('token'),
    })
    if (!validatedField.success) return 'Invalid password';
    const { password, token } = validatedField.data;
    // console.log(password, token);

    const checkToken = await sql<PasswordResetToken>`
        SELECT t.id, t.email, t.token, t.expires
        FROM passwordresettoken t
        WHERE t.token = ${token}`
    console.log("sss",checkToken.rows[0]);
    if (checkToken.rows[0] == undefined){
        console.log('undefined');
        return "token does not exist!";
    }

    if (!token) return "token does not exist!";
    const existingToken = await getResetTokenByToken(token);
    if (!existingToken) return "token cannot be reached!";

    const hasExpired = new Date() > new Date(existingToken.expires);
    if (hasExpired) return "token has expired";

    const existingUser = await getUser(existingToken.email);
    if (!existingUser) return "user does not exist!"
    const salt = await bcrypt.genSalt(10); // 10 is the salt rounds, you can adjust
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
        await sql`s
        UPDATE users
        SET password = ${hashedPassword}
        WHERE id = ${existingUser.id};
        `;
        await sql`
        DELETE FROM passwordresettoken
        WHERE id = ${existingToken.id};
        `;
    } catch (error) {
        console.log(error);
    }
    console.log("reset success");
    revalidatePath('/login');
    redirect('/login');
}
