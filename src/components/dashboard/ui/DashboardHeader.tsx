'use client';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function DashboardHeader({ title, subtitle, action }: DashboardHeaderProps) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h1 className="font-quicksand text-3xl font-bold text-neutro-carbon mb-2">{title}</h1>
        {subtitle && (
          <p className="font-outfit text-neutro-piedra">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
