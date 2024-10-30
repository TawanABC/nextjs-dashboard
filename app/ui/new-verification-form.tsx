'use client';


import { Button } from '@/app/ui/button';
import { useActionState } from 'react';
import { lusitana } from '@/app/ui/fonts';
import {
    AtSymbolIcon,
    ExclamationCircleIcon,
    KeyIcon
} from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import React from 'react'
import { verifyNewAccount } from '../lib/verification-actions';
import { useSearchParams } from 'next/navigation';
// import { BarLoader } from 'react-spinners'


export default function VerificationForm() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [errorMessage, formAction] = useActionState(verifyNewAccount, undefined);
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const handleSubmit = async () => {
        if (!token) {
            console.error("Token is missing from the URL");
            return;
        }
        // Create a FormData object and append the token
        const formData = new FormData();
        formData.append("token", token);

        // Call formAction (which is linked to verifyNewAccount) with formData
        await formAction(formData);

    };

    return (
        <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
            <h1 className={`${lusitana.className} mb-3 text-2xl`}>
                Please verify your email
            </h1>
            {/* <BarLoader></BarLoader> */}
            <br />
            <div id="customer-error" aria-live="polite" aria-atomic="true">
                {errorMessage && (
                    <>
                        <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                        <p className="text-sm text-red-500">{errorMessage}</p>
                    </>
                )}
            </div>
            <Button onClick={handleSubmit}
                id="email"
                type="submit"
                name="email"
                className="mt-4 w-full">Back to login<ArrowRightIcon className="ml-auto h-5 w-5 text-gray-50" /></Button>
        </div>

    );
}

