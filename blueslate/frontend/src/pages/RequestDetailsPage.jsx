import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRequestById, updateRequestStatus, assignRequest, addInternalNote } from '../services/requestService';
import { getCurrentUser } from '../utils/auth';
import { PriorityBadge } from '../components/inbox/PriorityBadge';
import { StatusBadge } from '../components/inbox/StatusBadge';
import { RequestTypeBadge } from '../components/inbox/RequestTypeBadge';
import { AISummaryCard } from '../components/inbox/AISummaryCard';
import { Timeline } from '../components/inbox/Timeline';
import { InternalNotesPanel } from '../components/inbox/InternalNotesPanel';
import { LoadingSkeleton } from '../components/inbox/LoadingSkeleton';
import { QuickInsightsSidebar } from '../components/inbox/QuickInsightsSidebar';
import { CustomerHistory } from '../components/inbox/CustomerHistory';
import { RecommendedActions } from '../components/inbox/RecommendedActions';
import { ScheduleMeetingModal } from '../components/inbox/ScheduleMeetingModal';
import { ArrowLeft, UserPlus, Phone, Mail, User, ChevronDown, ChevronUp, Calendar, Clock, Video } from 'lucide-react';
import { format } from 'date-fns';

export default function RequestDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submittingNote, setSubmittingNote] = useState(false);
    const [notesExpanded, setNotesExpanded] = useState(false);
    const [meetingModalOpen, setMeetingModalOpen] = useState(false);
    const currentUser = getCurrentUser();

    const fetchRequest = async () => {
        try {
            const data = await getRequestById(id);
            setRequest(data);
        } catch (error) {
            console.error("Failed to fetch request details", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequest();
    }, [id]);

    const handleAddNote = async (content) => {
        try {
            setSubmittingNote(true);
            await addInternalNote(id, content);
            await fetchRequest();
        } catch (error) {
            console.error("Failed to add note", error);
        } finally {
            setSubmittingNote(false);
        }
    };

    const handleAssign = async () => {
        if (!currentUser) return;
        try {
            await assignRequest(id, currentUser.id);
            await fetchRequest();
        } catch (error) {
            console.error("Failed to assign", error);
        }
    };

    const handleResolve = async () => {
        try {
            await updateRequestStatus(id, 'RESOLVED');
            await fetchRequest();
        } catch (error) {
            console.error("Failed to resolve", error);
        }
    };

    if (loading) {
        return <div className="p-8 max-w-7xl mx-auto"><LoadingSkeleton count={1} type="card" /><div className="mt-8"><LoadingSkeleton count={3} /></div></div>;
    }

    if (!request) {
        return <div className="p-8 text-center text-gray-500">Request not found.</div>;
    }

    const customerName = request.lead?.name || request.snapshotName || "Unknown Customer";
    const customerPhone = request.lead?.phone || request.snapshotPhone || "N/A";
    const customerEmail = request.lead?.email || request.snapshotEmail || "N/A";

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 overflow-y-auto">
            {/* Header (Customer Overview) */}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-5 sticky top-0 z-10 shadow-sm">
                <div className="max-w-[1400px] mx-auto">
                    <button 
                        onClick={() => navigate('/inbox')}
                        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors mb-5"
                    >
                        <ArrowLeft size={16} /> Back to Inbox
                    </button>
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/50 dark:to-blue-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-2xl border border-indigo-200 dark:border-indigo-800 shrink-0">
                                {customerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-1.5">
                                    {customerName}
                                </h1>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 font-medium">
                                    <span className="flex items-center gap-1.5"><Phone size={14} className="text-gray-400" /> {customerPhone}</span>
                                    <span className="flex items-center gap-1.5"><Mail size={14} className="text-gray-400" /> {customerEmail}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                                <StatusBadge status={request.status} />
                                <PriorityBadge priority={request.priority} />
                                <RequestTypeBadge type={request.requestType} />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                Created {format(new Date(request.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                            <button
                                onClick={() => setMeetingModalOpen(true)}
                                className="mt-2 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                                <Calendar size={16} /> Schedule Meeting
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Layout */}
            <main className="flex-1 p-6">
                <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
                    
                    {/* Left/Main Column (3/4 width) */}
                    <div className="lg:col-span-3 space-y-6">
                        
                        {/* 1. AI Analysis Card */}
                        <AISummaryCard 
                            summary={request.aiSummary}
                            reason={request.aiReason}
                            recommendation={request.suggestedAction}
                            priority={request.priority}
                        />

                        {/* 2. Recommended Next Actions */}
                        <RecommendedActions 
                            request={request} 
                            onResolve={handleResolve} 
                        />

                        {/* 3. Conversation Transcript */}
                        <div id="transcript-section" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                Conversation Transcript
                            </h3>
                            {request.conversation ? (
                                <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl p-5 max-h-[400px] overflow-y-auto flex flex-col gap-3">
                                    {Array.isArray(request.conversation.transcript) ? (
                                        request.conversation.transcript.map((msg, i) => (
                                            <div key={i} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                                                <div className={`px-4 py-2.5 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm shadow-sm' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm shadow-sm'}`}>
                                                    {msg.content}
                                                </div>
                                                <span className="text-[10px] text-gray-400 mt-1 px-1 capitalize font-medium">{msg.role}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
                                            {typeof request.conversation.transcript === 'string' 
                                                ? request.conversation.transcript 
                                                : JSON.stringify(request.conversation.transcript, null, 2)}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                    No conversation transcript available for this request.
                                </div>
                            )}
                        </div>

                        {/* Meetings */}
                        {request.scheduledMeetings && request.scheduledMeetings.length > 0 && (
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Video size={18} className="text-blue-500" />
                                    Upcoming Meetings
                                </h3>
                                <div className="space-y-3">
                                    {request.scheduledMeetings.map(meeting => (
                                        <div key={meeting.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
                                                    <Calendar size={14} className="text-gray-500" />
                                                    {format(new Date(meeting.scheduledAt), "MMMM d, yyyy 'at' h:mm a")}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                                                    <Clock size={12} /> {meeting.duration} Minutes
                                                </p>
                                                {meeting.notes && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                                                        "{meeting.notes}"
                                                    </p>
                                                )}
                                            </div>
                                            <div className="mt-3 sm:mt-0">
                                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                                    meeting.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    meeting.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                                }`}>
                                                    {meeting.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. Customer Timeline */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Customer Timeline</h3>
                            <Timeline activities={request.activities} />
                        </div>

                        {/* 5. Advanced Team Notes (Demoted & Collapsed) */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                            <button 
                                onClick={() => setNotesExpanded(!notesExpanded)}
                                className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                            >
                                <div className="flex flex-col items-start text-left">
                                    <span className="font-bold text-gray-900 dark:text-white">Advanced Team Notes</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Private notes for future multi-admin collaboration.</span>
                                </div>
                                {notesExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                            </button>
                            
                            {notesExpanded && (
                                <div className="p-6 border-t border-gray-200 dark:border-gray-800 min-h-[300px]">
                                    <InternalNotesPanel 
                                        notes={request.notes} 
                                        onAddNote={handleAddNote}
                                        isSubmitting={submittingNote}
                                    />
                                    
                                    {/* Demoted Admin Assignment Section */}
                                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Admin Assignment
                                        </div>
                                        {!request.assignedUser ? (
                                            <button 
                                                onClick={handleAssign}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <UserPlus size={14} /> Assign to me
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium">
                                                <User size={14} /> Assigned to {request.assignedUser.name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Right Column (1/4 width) */}
                    <div className="space-y-6">
                        <QuickInsightsSidebar request={request} />
                        <CustomerHistory request={request} />
                    </div>

                </div>
            </main>

            <ScheduleMeetingModal 
                isOpen={meetingModalOpen}
                onClose={() => setMeetingModalOpen(false)}
                request={request}
                onScheduled={(newMeeting) => {
                    setRequest(prev => ({
                        ...prev,
                        scheduledMeetings: [...(prev.scheduledMeetings || []), newMeeting]
                    }));
                }}
            />
        </div>
    );
}
