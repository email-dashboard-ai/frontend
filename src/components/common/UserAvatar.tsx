import React, { useState, useEffect } from 'react';
import md5 from 'md5';
import { useAppSelector } from '../../store';

interface UserAvatarProps {
    email: string;
    name: string;
    size?: string; // Tailwind size class (e.g., "w-10 h-10")
    className?: string;
}

const GENERIC_DOMAINS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'protonmail.com'
];

const UserAvatar: React.FC<UserAvatarProps> = ({ email, name, size = "w-10 h-10", className = "" }) => {
    const { user } = useAppSelector(state => state.auth);
    const { knownUsers } = useAppSelector(state => state.gmail);

    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [loadError, setLoadError] = useState(false);

    // 1. Determine the best initial source
    useEffect(() => {
        setLoadError(false);
        const cleanEmail = email.trim().toLowerCase();

        // A. Internal Profile (Logged in user or Known User)
        if (user?.email === cleanEmail && user.avatar) {
            setImgSrc(user.avatar);
            return;
        }
        if (knownUsers?.[cleanEmail]?.avatar) {
            setImgSrc(knownUsers[cleanEmail].avatar);
            return;
        }

        // B. Gravatar
        const gravatarUrl = `https://www.gravatar.com/avatar/${md5(cleanEmail)}?d=404`;
        setImgSrc(gravatarUrl);
    }, [email, user, knownUsers]);

    const handleImgError = () => {
        if (!imgSrc) return;

        // If Gravatar failed (404), try Brand Logo
        if (imgSrc.includes('gravatar.com')) {
            const domain = email.split('@')[1]?.toLowerCase();
            if (domain && !GENERIC_DOMAINS.includes(domain)) {
                // Try Clearbit logo API
                setImgSrc(`https://logo.clearbit.com/${domain}`);
            } else {
                // Generic domain -> Fallback to Initials
                setImgSrc(null);
            }
        }
        // If Brand Logo failed (or it was already a brand logo attempt), fallback to Initials
        else {
            setImgSrc(null);
        }
    };

    // Render Initials if no image or error
    if (!imgSrc || loadError) {
        const initial = name ? name[0].toUpperCase() : email[0].toUpperCase();
        // Generate a consistent pastel color based on email
        const colors = [
            'bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-amber-100 text-amber-700',
            'bg-green-100 text-green-700', 'bg-emerald-100 text-emerald-700', 'bg-teal-100 text-teal-700',
            'bg-cyan-100 text-cyan-700', 'bg-blue-100 text-blue-700', 'bg-indigo-100 text-indigo-700',
            'bg-violet-100 text-violet-700', 'bg-purple-100 text-purple-700', 'bg-fuchsia-100 text-fuchsia-700',
            'bg-pink-100 text-pink-700', 'bg-rose-100 text-rose-700'
        ];
        const colorIndex = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        const colorClass = colors[colorIndex];

        return (
            <div className={`${size} rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${colorClass} ${className}`}>
                {initial}
            </div>
        );
    }

    return (
        <div className={`${size} rounded-full overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200 ${className}`}>
            <img
                src={imgSrc}
                alt={name}
                className="w-full h-full object-cover"
                onError={handleImgError}
            />
        </div>
    );
};

export default UserAvatar;
