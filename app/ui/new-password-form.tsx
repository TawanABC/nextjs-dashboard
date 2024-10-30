'use client';

import { lusitana } from '@/app/ui/fonts';
import {
    AtSymbolIcon,
    KeyIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import { useActionState, useState } from 'react';
import { Button } from './button';
import { resetPassword } from '../lib/password-reset-actions';
import { useSearchParams } from 'next/navigation';

export default function ResetForm() {
    const [errorMessage, formAction, isPending] = useActionState(
        resetPassword,
        undefined
    );
    const searchParams = useSearchParams();
    const [password, setPassword] = useState('');

    const handleSubmit = async () => {
        const token = searchParams.get("token");
        if (!token) {
            console.error("Token is missing from the URL");
            return;
        }
        // Create a FormData object and append the token
        const formData = new FormData();
        formData.append("password", password)
        formData.append("token", token);

        // Call formAction (which is linked to verifyNewAccount) with formData
        await formAction(formData);

    };

    return (
        <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
            <h1 className={`${lusitana.className} mb-3 text-2xl`}>
                Please log in to continue.
            </h1>
            <div className="w-full">
                <div>
                    <label
                        className="mb-3 mt-5 block text-xs font-medium text-gray-900"
                        htmlFor="password"
                    >
                        New Password
                    </label>
                    <div className="relative">
                        <input
                            className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                            id="password"
                            type="password"
                            name="password"
                            placeholder="Enter your new password"
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <AtSymbolIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
                    </div>
                </div>
            </div>
            <div className="flex h-8 items-end space-x-1">
                {/* Add form errors here */}
                {errorMessage && (
                    <>
                        <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                        <p className="text-sm text-red-500">{errorMessage}XD</p>
                    </>
                )}
            </div>
            <Button className="mt-4 w-full " aria-disabled={isPending}
                onClick={handleSubmit}>
                Reset your password <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-50" />
            </Button>
        </div>
    );
}
