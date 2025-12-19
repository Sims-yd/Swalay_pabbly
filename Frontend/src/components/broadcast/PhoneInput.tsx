import React from 'react';
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
    value?: string;
    onChange?: (value: string) => void;
    countryCode?: string;
    onCountryCodeChange?: (code: string) => void;
    className?: string;
    placeholder?: string;
}

const COUNTRY_CODES = [
    { code: '+91', country: 'IN' },
    { code: '+1', country: 'US' },
    { code: '+44', country: 'UK' },
];

export default function PhoneInput({
    value,
    onChange,
    countryCode = '+91',
    onCountryCodeChange,
    className,
    placeholder = "Enter phone number"
}: PhoneInputProps) {
    return (
        <div className={cn("flex", className)}>
            <select
                className="flex h-10 w-[80px] rounded-l-md border border-r-0 border-input bg-background px-2 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={countryCode}
                onChange={(e) => onCountryCodeChange?.(e.target.value)}
            >
                {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                        {c.code}
                    </option>
                ))}
            </select>
            <Input
                className="rounded-l-none"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                type="tel"
            />
        </div>
    );
}
