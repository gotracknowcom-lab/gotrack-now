import React from 'react';
import { TimelineEvent } from '../types';
import { CheckCircle2, Circle, Clock, MapPin, AlertCircle, ShieldCheck, Truck, Plane, Building2, PackageCheck, AlertTriangle } from 'lucide-react';

interface ShipmentTimelineProps {
  timeline: TimelineEvent[];
  currentStatus: string;
}

export const ShipmentTimeline: React.FC<ShipmentTimelineProps> = ({ timeline, currentStatus }) => {
  const getStageIcon = (status: string, completed: boolean, current?: boolean) => {
    if (completed) {
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    }
    if (current) {
      return <Clock className="w-5 h-5 text-sky-400 animate-pulse" />;
    }
    return <Circle className="w-4 h-4 text-slate-600" />;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-400" />
            Shipment Milestone Timeline
          </h3>
          <p className="text-xs text-slate-400">Real-time status tracking & checkpoint events</p>
        </div>
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
          Live Sync Active
        </span>
      </div>

      <div className="relative pt-6">
        {/* Timeline Line */}
        <div className="absolute left-6 top-8 bottom-6 w-0.5 bg-slate-800" />

        <div className="space-y-8 relative">
          {timeline.map((event, index) => {
            const isCompleted = event.completed;
            const isCurrent = event.current || event.status === currentStatus;

            return (
              <div
                key={event.id || index}
                className="relative flex items-start gap-4 group"
              >
                {/* Stage Icon Node */}
                <div className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10'
                    : isCurrent
                    ? 'bg-sky-950/60 border-sky-400 text-sky-300 ring-4 ring-sky-500/20 shadow-lg shadow-sky-500/20'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  {getStageIcon(event.status, isCompleted, isCurrent)}
                </div>

                {/* Stage Content */}
                <div className={`flex-1 rounded-xl p-4 border transition-all ${
                  isCurrent
                    ? 'bg-sky-950/20 border-sky-500/40 shadow-md shadow-sky-500/5'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        STAGE {index + 1} OF {timeline.length}
                      </span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-sky-500 text-slate-950 rounded tracking-wider animate-pulse">
                          Current Location
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                          Cleared
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {event.timestamp}
                    </span>
                  </div>

                  <h4 className={`text-base font-bold mt-1 ${
                    isCurrent ? 'text-sky-400' : isCompleted ? 'text-white' : 'text-slate-400'
                  }`}>
                    {event.title || event.status}
                  </h4>

                  <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="font-medium">{event.location}</span>
                  </div>

                  {event.description && (
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
