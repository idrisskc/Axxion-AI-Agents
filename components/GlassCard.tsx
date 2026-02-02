import * as React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`glass rounded-2xl p-5 flex flex-col ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">{title}</h3>
          <div className="w-2 h-2 rounded-full bg-citron animate-pulse shadow-[0_0_8px_#DFFF00]"></div>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};