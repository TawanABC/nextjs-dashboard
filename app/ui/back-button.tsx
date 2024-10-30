"use client"
import { Button2 } from "@/components/ui/button"
import Link from "next/link";

interface BackButtonProps {
    href: string;
    label: string;
}

export const BackButton = ({ href, label }: BackButtonProps) => {
    return (
        <Button2
            variant="link"
            className="font-normal w-full"
            size='sm'
            asChild>
            <Link href={href}>{label}</Link>
        </Button2>
    )
}