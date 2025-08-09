interface HeaderProps {
  selectedWeek: string;
  onWeekChange: (week: string) => void;
}

export default function Header({ selectedWeek, onWeekChange }: HeaderProps) {
  const weeks = [
    '2025-W32', '2025-W31', '2025-W30', '2025-W29', '2025-W28'
  ];

  return (
    <header className="flex items-center justify-between mb-8 py-4 border-b border-slate-700">
      <div className="flex items-center gap-3">
        <div className="text-2xl">🪙</div>
        <h1 className="text-2xl font-bold text-emerald-400">
          CryptoStock Tracker
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <label className="text-slate-400 text-sm">週期選擇:</label>
        <select 
          value={selectedWeek}
          onChange={(e) => onWeekChange(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-400"
        >
          {weeks.map(week => (
            <option key={week} value={week}>{week}</option>
          ))}
        </select>
      </div>
    </header>
  );
}