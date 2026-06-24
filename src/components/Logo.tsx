import React from 'react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "text-2xl" }: LogoProps) {
  // Dynamic sizing: Smaller height for Navbar (h-10) and larger for Footer (h-20)
  const isLarge = className.includes('text-3xl');
  const imgHeight = isLarge ? 'h-20' : 'h-10';
  const textClass = isLarge ? 'text-2xl' : 'text-[11px]';

  return (
    <div className="flex flex-col items-center leading-none">
      <img 
        src="/uploads/Logo.png" 
        alt="Su9.ma" 
        className={`${imgHeight} w-auto object-contain`} 
      />
      <div className={`font-black tracking-tighter ${textClass} uppercase mt-1`}>
        <span className="text-orange-600">Su9</span>
        <span className="text-gray-900">.ma</span>
      </div>
    </div>
  );
}