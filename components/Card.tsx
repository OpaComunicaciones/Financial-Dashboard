
import React from 'react';

interface CardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'positive' | 'negative';
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, value, icon, change, changeType, className = '' }) => {
  const changeColor = changeType === 'positive' ? 'text-green-400' : 'text-red-400';

  return (
    <div className={`bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col justify-between hover:border-indigo-500 transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-400">{title}</span>
        <div className="text-indigo-400">{icon}</div>
      </div>
      <div>
        <h3 className="text-3xl font-bold text-white">{value}</h3>
        {change && (
          <p className={`text-sm mt-1 ${changeColor}`}>
            {change}
          </p>
        )}
      </div>
    </div>
  );
};

export default Card;
