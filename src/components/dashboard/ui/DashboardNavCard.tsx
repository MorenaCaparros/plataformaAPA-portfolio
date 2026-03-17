'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface DashboardNavCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  colorClass: 'impulso' | 'sol' | 'crecimiento' | 'teal' | 'purple' | 'neutral';
  badge?: string; // ej. 'IA', 'RAG', 'Matching', number
  badgeVariant?: 'gradient' | 'solid';
}

const colorMap = {
  impulso: {
    iconBg: 'bg-impulso-50',
    iconText: 'text-impulso-500',
    shadow: 'shadow-[0_8px_32px_-8px_rgba(230,57,70,0.12)] hover:shadow-[0_16px_48px_-8px_rgba(230,57,70,0.2)]',
    linkText: 'text-impulso-600',
    badge: 'bg-impulso-400',
  },
  sol: {
    iconBg: 'bg-sol-50',
    iconText: 'text-sol-500',
    shadow: 'shadow-[0_8px_32px_-8px_rgba(242,201,76,0.12)] hover:shadow-[0_16px_48px_-8px_rgba(242,201,76,0.2)]',
    linkText: 'text-sol-600',
    badge: 'bg-sol-400',
  },
  crecimiento: {
    iconBg: 'bg-crecimiento-50',
    iconText: 'text-crecimiento-500',
    shadow: 'shadow-[0_8px_32px_-8px_rgba(164,198,57,0.12)] hover:shadow-[0_16px_48px_-8px_rgba(164,198,57,0.2)]',
    linkText: 'text-crecimiento-600',
    badge: 'bg-crecimiento-500',
  },
  teal: {
    iconBg: 'bg-teal-50',
    iconText: 'text-teal-500',
    shadow: 'shadow-[0_8px_32px_-8px_rgba(20,184,166,0.12)] hover:shadow-[0_16px_48px_-8px_rgba(20,184,166,0.2)]',
    linkText: 'text-teal-600',
    badge: 'bg-teal-500',
  },
  purple: {
    iconBg: 'bg-gradient-to-br from-purple-100 to-impulso-100',
    iconText: 'text-impulso-500',
    shadow: 'shadow-[0_8px_32px_-8px_rgba(168,85,247,0.12)] hover:shadow-[0_16px_48px_-8px_rgba(168,85,247,0.2)]',
    linkText: 'text-impulso-500',
    badge: 'bg-gradient-to-r from-impulso-400 to-impulso-500',
  },
  neutral: {
    iconBg: 'bg-neutro-piedra/10',
    iconText: 'text-neutro-piedra',
    shadow: 'shadow-lg shadow-neutro-piedra/5 hover:shadow-neutro-piedra/10',
    linkText: 'text-neutro-piedra',
    badge: 'bg-neutro-piedra',
  },
};

export default function DashboardNavCard({
  href,
  icon: Icon,
  title,
  description,
  colorClass,
  badge,
  badgeVariant = 'solid',
}: DashboardNavCardProps) {
  const colors = colorMap[colorClass];

  return (
    <Link
      href={href}
      className={`group bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/60 p-6 transition-all duration-300 ${colors.shadow} hover:-translate-y-1 flex flex-col`}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`h-12 w-12 rounded-2xl ${colors.iconBg} flex items-center justify-center ${colors.iconText} group-hover:scale-110 transition-transform`}
        >
          <Icon className="w-6 h-6" strokeWidth={2.5} />
        </div>
        {badge && (
          <span
            className={`px-2 py-0.5 rounded-full text-white text-xs font-semibold flex items-center gap-1 ${
              badgeVariant === 'gradient' ? colors.badge : colors.badge
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      <h3 className="font-quicksand text-lg font-semibold text-neutro-carbon mb-2">{title}</h3>
      <p className="font-outfit text-sm text-neutro-piedra flex-1">{description}</p>
      <p className={`font-outfit text-sm font-medium mt-4 ${colors.linkText}`}>Ver →</p>
    </Link>
  );
}

/** Skeleton para grid de nav cards */
export function DashboardNavCardSkeleton() {
  return (
    <div className="bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/60 p-6 animate-pulse">
      <div className="h-12 w-12 rounded-2xl bg-gray-200 mb-4" />
      <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-full mb-1" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
    </div>
  );
}
