    import React, { useState, useEffect, useMemo } from 'react';
    import { createRoot } from 'react-dom/client';

    const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    function MigraineDiary() {
      const [entries, setEntries] = useState([]);
      const [showForm, setShowForm] = useState(false);
      const [view, setView] = useState('list');
      const [currentMonth, setCurrentMonth] = useState(new Date());

      const emptyForm = {
        date: localDate(),
        hadHeadache: true,
        intensity: 'moderate',
        oneSided: false,
        nausea: false,
        lightSensitivity: false,
        movementDependent: false,
        medCategory: 'triptan',
        medication: '',
        notes: ''
      };

      const [formData, setFormData] = useState(emptyForm);
      const [editingDate, setEditingDate] = useState(null);

      useEffect(() => { try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {} }, []);

      useEffect(() => {
        try {
          const stored = localStorage.getItem('migraine_diary_entries');
          if (stored) setEntries(JSON.parse(stored));
        } catch (e) {
          console.error("Storage load error:", e);
        }
      }, []);

      const saveEntries = (updatedEntries) => {
        const sorted = [...updatedEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
        setEntries(sorted);
        try { localStorage.setItem('migraine_diary_entries', JSON.stringify(sorted)); } catch (e) { alert('Could not save to device storage: ' + e.message); }
      };

      const handleSubmit = (e) => {
        e.preventDefault();
        const clash = formData.date !== editingDate && entries.some(item => item.date === formData.date);
        if (clash && !confirm(`There is already an entry for ${formData.date}. Replace it?`)) return;
        const previous = entries.find(item => item.date === editingDate || item.date === formData.date);
        const updated = [...entries.filter(item => item.date !== editingDate && item.date !== formData.date), { ...formData, id: (previous && previous.id) || Date.now() }];
        saveEntries(updated);
        setShowForm(false);
        setFormData(emptyForm);
      };

      const deleteEntry = (date) => {
        if (confirm(`Delete record for ${date}?`)) {
          saveEntries(entries.filter(e => e.date !== date));
        }
      };

      const stats = useMemo(() => {
        const today = localDate();
        const from = new Date(); from.setDate(from.getDate() - 29);
        const start = localDate(from);

        let attackDays = 0;
        let triptanDays = 0;
        let nsaidDays = 0;

        entries.forEach(e => {
          if (e.date >= start && e.date <= today) {
            if (e.hadHeadache) attackDays++;
            if (e.medCategory === 'triptan') triptanDays++;
            if (e.medCategory === 'nsaid') nsaidDays++;
          }
        });

        return { attackDays, triptanDays, nsaidDays };
      }, [entries]);

      const exportCSV = () => {
        if (!entries.length) return alert('No entries to export yet.');
        const headers = ["Date", "Headache", "Intensity", "One-Sided", "Nausea", "Light Sensitivity", "Movement Aggravated", "Med Category", "Med Details", "Notes"];
        const rows = entries.map(e => [
          `"${e.date}"`,
          e.hadHeadache ? "Yes" : "No",
          `"${e.intensity || '-'}"`,
          e.oneSided ? "Yes" : "No",
          e.nausea ? "Yes" : "No",
          e.lightSensitivity ? "Yes" : "No",
          e.movementDependent ? "Yes" : "No",
          `"${e.medCategory || 'none'}"`,
          `"${(e.medication || '').replace(/"/g, '""')}"`,
          `"${(e.notes || '').replace(/"/g, '""')}"`
        ]);
        const csv = '\uFEFF' + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        link.download = `migraine_diary_${localDate()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDayOfMonth = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

      return (
        <div className="max-w-md mx-auto p-4 pb-24 text-slate-300">
          <header className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
            <div>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">Migraine Diary</h1>
              <p className="text-[11px] text-slate-500 font-mono">Offline • Device Storage</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={exportCSV} 
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition" 
                title="Export CSV"
              >
                📥
              </button>
              <button 
                onClick={() => { const t = entries.find(e => e.date === emptyForm.date); setFormData(t || emptyForm); setEditingDate(t ? t.date : null); setShowForm(true); }} 
                className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium px-3.5 py-1.5 rounded-lg text-sm transition shadow-sm shadow-indigo-950"
              >
                + Log Day
              </button>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-2.5 mb-5">
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                Attacks (30d)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-bold ${
                  stats.attackDays >= 15 ? 'text-rose-400' :
                  stats.attackDays >= 8 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {stats.attackDays}
                </span>
                <span className="text-xs text-slate-500">/ 30 days</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {stats.attackDays >= 15 ? '⚠️ Chronic threshold' : stats.attackDays <= 4 ? 'Low frequency' : 'Moderate frequency'}
              </span>
            </div>

            <div className={`bg-slate-900/80 border rounded-xl p-3 ${
              stats.triptanDays >= 10 ? 'border-rose-900/50 bg-rose-950/10' : 'border-slate-800/80'
            }`}>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                Triptan Days (30d)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-bold ${
                  stats.triptanDays >= 10 ? 'text-rose-400' :
                  stats.triptanDays >= 7 ? 'text-amber-400' : 'text-indigo-300'
                }`}>
                  {stats.triptanDays}
                </span>
                <span className="text-xs text-slate-500">/ 10 max</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {stats.triptanDays >= 10 ? '🚨 MOH Risk reached' : 'MOH Safe limit: <10d'}
              </span>
            </div>
          </section>

          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 mb-4 text-xs font-medium">
            <button 
              onClick={() => setView('list')}
              className={`flex-1 py-1.5 rounded-md transition ${view === 'list' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}
            >
              List View
            </button>
            <button 
              onClick={() => setView('calendar')}
              className={`flex-1 py-1.5 rounded-md transition ${view === 'calendar' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Calendar View
            </button>
          </div>

          {showForm && (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-[#111726] border border-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 border-b border-slate-800/80 pb-2.5">
                  <h2 className="text-base font-semibold text-slate-100">Log Episode / Day</h2>
                  <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-200 text-lg px-2">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Date</label>
                    <input 
                      type="date" 
                      required
                      value={formData.date} 
                      onChange={e => setFormData({ ...formData, date: e.target.value })} 
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="pt-1">
                    <label className="flex items-center gap-2 font-medium text-slate-200 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={formData.hadHeadache} 
                        onChange={e => setFormData({ ...formData, hadHeadache: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <span>Headache or Migraine present</span>
                    </label>
                  </div>

                  {formData.hadHeadache && (
                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Pain Intensity</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {['mild', 'moderate', 'severe'].map(lvl => (
                            <button
                              type="button"
                              key={lvl}
                              onClick={() => setFormData({ ...formData, intensity: lvl })}
                              className={`py-1.5 rounded-lg border text-xs capitalize font-medium transition ${
                                formData.intensity === lvl 
                                  ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300' 
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 pt-1 text-slate-300">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.oneSided} 
                            onChange={e => setFormData({ ...formData, oneSided: e.target.checked })} 
                            className="rounded bg-slate-800 border-slate-700 text-indigo-500"
                          />
                          <span>One-sided pain (unilateral)</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.nausea} 
                            onChange={e => setFormData({ ...formData, nausea: e.target.checked })} 
                            className="rounded bg-slate-800 border-slate-700 text-indigo-500"
                          />
                          <span>Nausea or vomiting</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.lightSensitivity} 
                            onChange={e => setFormData({ ...formData, lightSensitivity: e.target.checked })} 
                            className="rounded bg-slate-800 border-slate-700 text-indigo-500"
                          />
                          <span>Light / Sound sensitivity</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.movementDependent} 
                            onChange={e => setFormData({ ...formData, movementDependent: e.target.checked })} 
                            className="rounded bg-slate-800 border-slate-700 text-indigo-500"
                          />
                          <span>Aggravated by movement</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Medication Category (MOH Tracking)</label>
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      {[
                        { id: 'none', label: 'None' },
                        { id: 'triptan', label: 'Triptan' },
                        { id: 'nsaid', label: 'NSAID' },
                        { id: 'other', label: 'Other' },
                      ].map(cat => (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => setFormData({ ...formData, medCategory: cat.id })}
                          className={`py-1 rounded text-center border text-[11px] font-medium transition ${
                            formData.medCategory === cat.id 
                              ? 'bg-indigo-600 border-indigo-500 text-white' 
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <input 
                      type="text" 
                      placeholder="Med name & dose (e.g. Zolmitriptan 2.5mg)" 
                      value={formData.medication} 
                      onChange={e => setFormData({ ...formData, medication: e.target.value })} 
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Triggers & Notes</label>
                    <textarea 
                      placeholder="e.g. Poor sleep, missed meal, weather change..." 
                      rows="2"
                      value={formData.notes} 
                      onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:border-indigo-500 outline-none"
                    ></textarea>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setShowForm(false)} 
                      className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {view === 'list' && (
            <div className="space-y-2">
              {entries.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/40 rounded-xl border border-dashed border-slate-800 p-4">
                  <p className="text-slate-500 text-xs">No entries recorded yet.</p>
                </div>
              ) : (
                entries.map(e => (
                  <div key={e.date} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 relative">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-slate-200">{e.date}</span>
                          {e.hadHeadache ? (
                            <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              e.intensity === 'severe' ? 'bg-rose-950/70 text-rose-300 border border-rose-800/50' :
                              e.intensity === 'moderate' ? 'bg-amber-950/70 text-amber-300 border border-amber-800/50' :
                              'bg-yellow-950/70 text-yellow-300 border border-yellow-800/50'
                            }`}>
                              {e.intensity}
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">Clear</span>
                          )}
                          
                          {e.medCategory && e.medCategory !== 'none' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                              {e.medCategory.toUpperCase()}
                            </span>
                          )}
                        </div>

                        {e.hadHeadache && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {e.oneSided && <span className="bg-slate-800/70 text-slate-400 text-[10px] px-1.5 py-0.5 rounded">One-sided</span>}
                            {e.nausea && <span className="bg-slate-800/70 text-slate-400 text-[10px] px-1.5 py-0.5 rounded">Nausea</span>}
                            {e.lightSensitivity && <span className="bg-slate-800/70 text-slate-400 text-[10px] px-1.5 py-0.5 rounded">Photophobia</span>}
                            {e.movementDependent && <span className="bg-slate-800/70 text-slate-400 text-[10px] px-1.5 py-0.5 rounded">Movement</span>}
                          </div>
                        )}

                        {e.medication && (
                          <p className="text-xs text-slate-400 mt-1.5">
                            <span className="text-slate-500">Rx:</span> {e.medication}
                          </p>
                        )}
                        {e.notes && (
                          <p className="text-[11px] text-slate-500 mt-1 italic">
                            "{e.notes}"
                          </p>
                        )}
                      </div>

                      <button 
                        onClick={() => deleteEntry(e.date)} 
                        className="text-slate-600 hover:text-rose-400 text-base px-2 py-0.5 transition"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {view === 'calendar' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm text-slate-200">{monthName}</span>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
                    className="p-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
                  >
                    ‹
                  </button>
                  <button 
                    onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
                    className="p-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-500 mb-1.5">
                <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-xs">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={'empty-' + i} className="h-9"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const entry = entries.find(e => e.date === dateStr);

                  return (
                    <div 
                      key={dateStr}
                      onClick={() => {
                        setEditingDate(entry ? entry.date : null);
                        if (entry) {
                          setFormData(entry);
                        } else {
                          setFormData({ ...emptyForm, date: dateStr, hadHeadache: false });
                        }
                        setShowForm(true);
                      }}
                      className={`h-9 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition relative ${
                        entry?.hadHeadache 
                          ? entry.intensity === 'severe' 
                            ? 'bg-rose-950/40 border-rose-800/80 text-rose-300 font-semibold' 
                            : 'bg-amber-950/40 border-amber-800/80 text-amber-300 font-semibold'
                          : entry 
                            ? 'bg-emerald-950/30 border-emerald-900/60 text-emerald-400'
                            : 'border-slate-800 hover:bg-slate-800 text-slate-500'
                      }`}
                    >
                      <span>{dayNum}</span>
                      {entry?.hadHeadache && (
                        <span className={`w-1 h-1 rounded-full mt-0.5 ${
                          entry.intensity === 'severe' ? 'bg-rose-400' : 'bg-amber-400'
                        }`}></span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      );
    }

    createRoot(document.getElementById('root')).render(<MigraineDiary />);