'use client';

import { LucideIcon } from 'lucide-react';

interface DashboardMetricCardProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  sublabel?: string;
  colorClass: 'impulso' | 'sol' | 'crecimiento' | 'teal' | 'purple';
  pulseColor?: string; // override pulse dot color
}

const colorMap = {
  impulso: {
    cardBg: 'bg-gradient-to-br from-impulso-500 to-impulso-600',
    iconBg: 'bg-white/20',
    iconText: 'text-white',
    valueText: 'text-white',
    labelText: 'text-white/80',
    sublabelText: 'text-white/70',
    shadow: 'shadow-[0_10px_40px_-10px_rgba(230,57,70,0.45)] hover:shadow-[0_20px_50px_-10px_rgba(230,57,70,0.55)]',
    pulse: 'bg-white/60',
  },
  sol: {
    cardBg: 'bg-gradient-to-br from-sol-400 to-sol-500',
    iconBg: 'bg-white/20',
    iconText: 'text-white',
    valueText: 'text-white',
    labelText: 'text-white/80',
    sublabelText: 'text-white/70',
    shadow: 'shadow-[0_10px_40px_-10px_rgba(242,201,76,0.45)] hover:shadow-[0_20px_50px_-10px_rgba(242,201,76,0.55)]',
    pulse: 'bg-white/60',
  },
  crecimiento: {
    cardBg: 'bg-gradient-to-br from-crecimiento-500 to-crecimiento-600',
    iconBg: 'bg-white/20',
    iconText: 'text-white',
    valueText: 'text-white',
    labelText: 'text-white/80',
    sublabelText: 'text-white/70',
    shadow: 'shadow-[0_10px_40px_-10px_rgba(164,198,57,0.45)] hover:shadow-[0_20px_50px_-10px_rgba(164,198,57,0.55)]',
    pulse: 'bg-white/60',
  },
  teal: {
    cardBg: 'bg-gradient-to-br from-teal-500 to-teal-600',
    iconBg: 'bg-white/20',
    iconText: 'text-white',
    valueText: 'text-white',
    labelText: 'text-white/80',
    sublabelText: 'text-white/70',
    shadow: 'shadow-[0_10px_40px_-10px_rgba(20,184,166,0.45)] hover:shadow-[0_20px_50px_-10px_rgba(20,184,166,0.55)]',
    pulse: 'bg-white/60',
  },
  purple: {
    cardBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    iconBg: 'bg-white/20',
    iconText: 'text-white',
    valueText: 'text-white',
    labelText: 'text-white/80',
    sublabelText: 'text-white/70',
    shadow: 'shadow-[0_10px_40px_-10px_rgba(168,85,247,0.45)] hover:shadow-[0_20px_50px_-10px_rgba(168,85,247,0.55)]',
    pulse: 'bg-white/60',
  },
};

export default function DashboardMetricCard({
  icon: Icon,
  value,
  label,
  sublabel,
  colorClass,
}: DashboardMetricCardProps) {
  const colors = colorMap[colorClass];

  return (
    <div
      className={`relative group ${colors.cardBg} rounded-[2rem] p-6 transition-all duration-300 ${colors.shadow} hover:-translate-y-1`}
    >
      <div
        className={`h-12 w-12 rounded-2xl ${colors.iconBg} flex items-center justify-center mb-4 ${colors.iconText} group-hover:scale-110 transition-transform`}
      >
        <Icon className="w-6 h-6" strokeWidth={2.5} />
      </div>
      <h3 className={`font-quicksand font-bold text-4xl ${colors.valueText} mb-1`}>{value}</h3>
      <p className={`font-outfit font-medium text-sm mb-1 ${colors.labelText}`}>{label}</p>
      {sublabel && (
        <p className={`font-outfit text-xs ${colors.sublabelText}`}>{sublabel}</p>
      )}
      <div className={`absolute top-5 right-5 h-2.5 w-2.5 rounded-full ${colors.pulse} animate-pulse`} />
    </div>
  );
}

/** Skeleton para usar mientras isLoading = true */
export function DashboardMetricCardSkeleton() {
  return (
    <div className="bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/60 p-6 animate-pulse">
      <div className="h-14 w-14 rounded-2xl bg-gray-200 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-28" />
    </div>
  );
}
