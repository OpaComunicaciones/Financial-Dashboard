import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeSelectorProps {
  onDateRangeChange: (range: DateRange) => void;
}

const PRESET_RANGES = {
  today: 'Hoy',
  last7: 'Últimos 7 días',
  last30: 'Últimos 30 días',
  last90: 'Últimos 90 días',
  custom: 'Personalizado',
};

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ onDateRangeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('today');
  const [customRange, setCustomRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  });

  useEffect(() => {
    const getRange = (): DateRange => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const to = new Date();
      to.setHours(23, 59, 59, 999);

      switch (selectedPreset) {
        case 'today':
          return { from: today, to };
        case 'last7':
          const from7 = new Date(today);
          from7.setDate(today.getDate() - 6);
          return { from: from7, to };
        case 'last30':
          const from30 = new Date(today);
          from30.setDate(today.getDate() - 29);
          return { from: from30, to };
        case 'last90':
            const from90 = new Date(today);
            from90.setDate(today.getDate() - 89);
            return { from: from90, to };
        case 'custom':
          return customRange;
        default:
          return { from: today, to };
      }
    };

    onDateRangeChange(getRange());
  }, [selectedPreset, customRange, onDateRangeChange]);

  const handlePresetClick = (preset: string) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      setIsOpen(false);
    }
  };

  const handleCustomDateChange = (field: 'from' | 'to', date: string) => {
    const newDate = new Date(date);
    setCustomRange(prev => ({ ...prev, [field]: newDate }));
  };

  const formatDate = (date: Date) => {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const displayLabel = selectedPreset === 'custom' 
    ? `${formatDate(customRange.from)} - ${formatDate(customRange.to)}`
    : PRESET_RANGES[selectedPreset as keyof typeof PRESET_RANGES];

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          className="inline-flex justify-center w-full rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-700 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Calendar className="mr-2 h-5 w-5" />
          {displayLabel}
          <ChevronDown className="-mr-1 ml-2 h-5 w-5" />
        </button>
      </div>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {Object.entries(PRESET_RANGES).map(([key, value]) => (
                 key !== 'custom' && (
                    <a
                        key={key}
                        href="#"
                        className={`block px-4 py-2 text-sm ${selectedPreset === key ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                        onClick={(e) => { e.preventDefault(); handlePresetClick(key); }}
                    >
                        {value}
                    </a>
                )
            ))}
            <div className="border-t border-gray-700 my-1"></div>
            <div className="px-4 py-2">
                <p className={`text-sm ${selectedPreset === 'custom' ? 'text-white' : 'text-gray-300'}`} onClick={() => handlePresetClick('custom')}>Personalizado</p>
                {selectedPreset === 'custom' && (
                    <div className="mt-2 space-y-2">
                        <div>
                            <label htmlFor="from-date" className="text-xs text-gray-400">Desde</label>
                            <input 
                                type="date" 
                                id="from-date"
                                value={customRange.from.toISOString().split('T')[0]}
                                onChange={e => handleCustomDateChange('from', e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md py-1 px-2 text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="to-date" className="text-xs text-gray-400">Hasta</label>
                            <input 
                                type="date" 
                                id="to-date"
                                value={customRange.to.toISOString().split('T')[0]}
                                onChange={e => handleCustomDateChange('to', e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md py-1 px-2 text-sm"
                            />
                        </div>
                    </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangeSelector;
