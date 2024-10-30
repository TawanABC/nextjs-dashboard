"use client";


import React from 'react'
import { signIn } from 'next-auth/react';
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa"
import { Button2 } from '@/components/ui/button';
export default function Social() {
    const default_login_redirect = '/dashboard';
    const onClick = (provider: "google" | "github") => {
        signIn(provider, {
            callbackUrl: default_login_redirect
        })
    }
    return (<div className='flex items-center w-full gap-x-2'>

        <Button2 size="lg"
            className="w-full"
            variant="outline"
            onClick={() => { onClick("google") }}
        >
            <FcGoogle />
        </Button2>
        <Button2 size="lg"
            className="w-full"
            variant="outline"
            onClick={() => { onClick("github") }}
        >
            <FaGithub />
        </Button2>
    </div>
    )
}
