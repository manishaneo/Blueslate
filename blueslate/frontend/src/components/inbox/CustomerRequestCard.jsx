import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { User, MessageSquare, AlertTriangle, PhoneCall, HelpCircle, ChevronRight, CheckCircle2, UserPlus } from 'lucide-react';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';
import { RequestTypeBadge } from './RequestTypeBadge';

export const CustomerRequestCard = ({ request, onClick, onAssign, onResolve }) => {
    const { 
        id, 
        requestType, 
        status, 
        priority, 
        aiSummary, 
        snapshotName, 
        createdAt, 
        lead,
        assignedUser,
        activities,
        notes
    } = request;

    const customerName = lead?.name || snapshotName || "Unknown Customer";
    const isUnread = status === 'NEW'; // Using NEW status as proxy for unread in inbox list

    return (
        <div 
            onClick={() => onClick(id)}
            className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col sm:flex-row gap-5"
        >
            {isUnread && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl"></div>
            )}
            
            {/* Left Column: Avatar & Core Info */}
            <div className="flex gap-4 sm:w-1/3 min-w-[200px]">
                <div className="shrink-0 relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                        {customerName.charAt(0).toUpperCase()}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-base truncate ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                        {customerName}
                    </h3>
                    <div className="flex flex-col gap-1.5 mt-1">
                        <RequestTypeBadge type={requestType} className="!text-xs" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Middle Column: Summary & Badges */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <StatusBadge status={status} />
                    <PriorityBadge priority={priority} />
                    {assignedUser && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 uppercase tracking-wide">
                            <User size={10} />
                            {assignedUser.name.split(' ')[0]}
                        </span>
                    )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {aiSummary || "No summary provided."}
                </p>
            </div>

            {/* Right Column: Actions */}
            <div className="flex sm:flex-col justify-end items-end gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {status !== 'RESOLVED' && status !== 'CLOSED' && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onResolve(id); }}
                        className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 rounded-lg transition-colors flex items-center justify-center"
                        title="Resolve Request"
                    >
                        <CheckCircle2 size={18} />
                    </button>
                )}
                {!assignedUser && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAssign(id); }}
                        className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded-lg transition-colors flex items-center justify-center"
                        title="Assign to me"
                    >
                        <UserPlus size={18} />
                    </button>
                )}
                <div className="p-2 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 rounded-lg transition-colors flex items-center justify-center">
                    <ChevronRight size={18} />
                </div>
            </div>
        </div>
    );
};
