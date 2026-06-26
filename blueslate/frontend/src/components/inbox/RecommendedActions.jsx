import React from 'react';
import { Phone, MessageSquare, CheckCircle2, UserPlus, PhoneCall, Calendar } from 'lucide-react';

export const RecommendedActions = ({ request, onResolve }) => {
    const customerPhone = request.lead?.phone || request.snapshotPhone;
    const hasTranscript = request.conversation?.transcript && request.conversation?.transcript.length > 0;
    const isResolved = request.status === 'RESOLVED' || request.status === 'CLOSED';
    
    // Note: VAPI calls are marked in metadata. We'll heuristically check if it's a voice call
    // by seeing if callType exists in metadata or source is voice.
    const isVoiceCall = request.conversation?.source === 'customer_portal_voice' || request.conversation?.metadata?.callType;

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                Recommended Next Actions
            </h3>
            
            <div className="flex flex-wrap gap-3">
                {/* 1. Mark Resolved */}
                {!isResolved && (
                    <button 
                        onClick={onResolve}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                    >
                        <CheckCircle2 size={16} /> Mark as Resolved
                    </button>
                )}

                {/* 2. Call Customer */}
                {customerPhone && (
                    <a 
                        href={`tel:${customerPhone}`}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-xl text-sm font-semibold transition-colors border border-blue-200 dark:border-blue-800/50"
                    >
                        <Phone size={16} /> Call Customer
                    </a>
                )}

                {/* 3. Open Conversation / View Voice Call */}
                {hasTranscript && (
                    <button 
                        onClick={() => {
                            document.getElementById('transcript-section')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold transition-colors border border-gray-200 dark:border-gray-700"
                    >
                        {isVoiceCall ? (
                            <><PhoneCall size={16} /> View Voice Call</>
                        ) : (
                            <><MessageSquare size={16} /> Open Conversation</>
                        )}
                    </button>
                )}

                {/* 4. Schedule Callback (Placeholder) */}
                {request.requestType === 'CALLBACK_REQUEST' && !isResolved && (
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded-xl text-sm font-semibold transition-colors border border-indigo-200 dark:border-indigo-800/50">
                        <Calendar size={16} /> Schedule Callback
                    </button>
                )}
                
                {/* 5. Convert Lead (Placeholder if new lead) */}
                {request.requestType === 'NEW_LEAD' && !isResolved && (
                    <button className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-400 rounded-xl text-sm font-semibold transition-colors border border-purple-200 dark:border-purple-800/50">
                        <UserPlus size={16} /> Convert Lead
                    </button>
                )}
            </div>
        </div>
    );
};
