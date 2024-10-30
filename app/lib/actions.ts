'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import bcrypt from 'bcrypt';
import { db } from '@vercel/postgres';
import { getVerificationTokenByEmail } from '../data/verification-token';
import { generateVerificationToken } from './tokens';
import { sendVerificationEmail } from '@/lib/mail';
import { User } from './definitions';

export async function getUser(email: string): Promise<User | undefined> {
    try {
        const user = await sql<User>`SELECT * FROM users WHERE email=${email}`;
        return user.rows[0];
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

async function checkEmailExists(email: string): Promise<boolean> {
    try {
        // Run a query to check if the email exists
        const result = await db.query(
            'SELECT email FROM users WHERE email = $1 LIMIT 1',
            [email]
        );

        // Check if any rows were returned
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error checking email:', error);
        throw error;
    }
}


export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};

export type RegisterState = {
    errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
    };
    message?: string | null;
};

const RegisterSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(6)
});
const CreateAccount = RegisterSchema.omit({ id: true })

export async function createAccount(prevState: RegisterState, formData: FormData) {
    // Validate form using Zod
    const validatedFields = CreateAccount.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password')
    });

    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Account.',
        };
    }

    // Prepare data for insertion into the database
    const { name, email, password } = validatedFields.data;
    const salt = await bcrypt.genSalt(10); // 10 is the salt rounds, you can adjust
    const hashedPassword = await bcrypt.hash(password, salt);
    const existingUser = await checkEmailExists(email);
    if (existingUser) {
        return {
            errors: {
                name: [],
                email: ['This email is already in use.'],
                password: []
            },
            message: null,
        };
    }


    // Insert data into the database
    try {
        await sql`
        INSERT INTO users (name, email, password)
        VALUES (${name}, ${email}, ${hashedPassword})
      `;
    } catch (error) {
        // If a database error occurs, return a more specific error.
        return {
            message: 'Database Error: Failed to Create Account.',
        };
    }
    const verifcationToken = await generateVerificationToken(email);
    await sendVerificationEmail(verifcationToken.email, verifcationToken.token);


    // Revalidate the cache for the invoices page and redirect the user.
    revalidatePath('/login');
    redirect('/login');
}

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.' }), //gt = greater than or else will message
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
});
const CreateInvoice = FormSchema.omit({ id: true, date: true });


export async function createInvoice(prevState: State, formData: FormData) {
    // Validate form using Zod
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
    }

    // Prepare data for insertion into the database
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    // Insert data into the database
    try {
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      `;
    } catch (error) {
        // If a database error occurs, return a more specific error.
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };
    }

    // Revalidate the cache for the invoices page and redirect the user.
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

// ...

export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    const amountInCents = amount * 100;

    try {
        await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
    } catch (error) {
        return { message: 'Database Error: Failed to Update Invoice.' };
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`;
    } catch (error) {
        return { message: 'Database Error: Failed to Delete Invoice.' };
    }

    revalidatePath('/dashboard/invoices');
}


// ...
const loginEmail = z.object({ email: z.string().email() })
export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    const { email } = loginEmail.parse({ email: formData.get('email') });
    const existingUser = await getUser(email);
    if (!existingUser?.emailverified) {
        // const verifcationToken = await generateVerificationToken(email);
        // await sendVerificationEmail(verifcationToken.email, verifcationToken.token);
        return 'Confirmation email sent!';
    }
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}