import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRequests, updateRequestStatus, assignRequest } from '../services/requestService';
import { getCurrentUser } from '../utils/auth';
import { CustomerRequestCard } from '../components/inbox/CustomerRequestCard';
import { LoadingSkeleton } from '../components/inbox/LoadingSkeleton';
import { EmptyState } from '../components/inbox/EmptyState';
import { Search, Filter, Inbox } from 'lucide-react';

const TABS = [
    { id: 'ALL', label: 'All' },
    { id: 'NEW_LEADS', label: 'New Leads' },
    { id: 'CALLBACK_REQUEST', label: 'Callback Requests' },
    { id: 'COMPLAINT', label: 'Complaints' },
    { id: 'ESCALATION', label: 'Escalations' },
    { id: 'GENERAL', label: 'General' },
    { id: 'RESOLVED', label: 'Resolved' },
];

export default function CustomerInboxPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const currentUser = getCurrentUser();

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await getRequests();
            setRequests(data);
        } catch (error) {
            console.error("Failed to fetch requests", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAssign = async (id) => {
        if (!currentUser) return;
        try {
            await assignRequest(id, currentUser.id);
            // Optimistic update
            setRequests(prev => prev.map(r => 
                r.id === id ? { ...r, status: 'ASSIGNED', assignedUser: { id: currentUser.id, name: currentUser.name } } : r
            ));
        } catch (error) {
            console.error("Failed to assign request", error);
        }
    };

    const handleResolve = async (id) => {
        try {
            await updateRequestStatus(id, 'RESOLVED');
            setRequests(prev => prev.map(r => 
                r.id === id ? { ...r, status: 'RESOLVED' } : r
            ));
        } catch (error) {
            console.error("Failed to resolve request", error);
        }
    };

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            // Tab filtering
            if (activeTab === 'RESOLVED' && req.status !== 'RESOLVED') return false;
            if (activeTab !== 'RESOLVED' && req.status === 'RESOLVED') return false;
            
            if (activeTab === 'NEW_LEADS' && !req.leadId) return false;
            if (['CALLBACK_REQUEST', 'COMPLAINT', 'ESCALATION', 'GENERAL'].includes(activeTab) && req.requestType !== activeTab) return false;

            // Search filtering
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const name = (req.lead?.name || req.snapshotName || '').toLowerCase();
                const summary = (req.aiSummary || '').toLowerCase();
                if (!name.includes(query) && !summary.includes(query)) return false;
            }

            return true;
        });
    }, [requests, activeTab, searchQuery]);

    // Metrics calculation
    const metrics = useMemo(() => {
        const open = requests.filter(r => r.status !== 'RESOLVED' && r.status !== 'CLOSED').length;
        const highPriority = requests.filter(r => r.status !== 'RESOLVED' && (r.priority === 'HIGH' || r.priority === 'CRITICAL')).length;
        const assigned = requests.filter(r => r.status !== 'RESOLVED' && r.assignedUser).length;
        const resolvedToday = requests.filter(r => r.status === 'RESOLVED' && new Date(r.updatedAt).toDateString() === new Date().toDateString()).length;
        
        return { open, highPriority, assigned, resolvedToday };
    }, [requests]);

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto w-full space-y-6">
                
                {/* Header & Metrics */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Customer Inbox</h1>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Open Requests</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{metrics.open}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30 shadow-sm">
                            <p className="text-sm font-medium text-orange-600 dark:text-orange-400">High Priority</p>
                            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-1">{metrics.highPriority}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{metrics.assigned}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Resolved Today</p>
                            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{metrics.resolvedToday}</p>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex overflow-x-auto pb-2 sm:pb-0 hide-scrollbar w-full sm:w-auto">
                        <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-800">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                                        activeTab === tab.id 
                                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search requests..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                        />
                    </div>
                </div>

                {/* List Content */}
                <div className="bg-transparent flex-1">
                    {loading ? (
                        <LoadingSkeleton count={5} />
                    ) : filteredRequests.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 min-h-[400px]">
                            <EmptyState 
                                icon={Inbox}
                                title={searchQuery ? "No matches found" : "Your inbox is clear"} 
                                description={searchQuery ? "Try adjusting your search query." : "New AI escalations, callback requests and complaints will appear here automatically."} 
                            />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredRequests.map(req => (
                                <CustomerRequestCard 
                                    key={req.id} 
                                    request={req} 
                                    onClick={(id) => navigate(`/inbox/${id}`)}
                                    onAssign={handleAssign}
                                    onResolve={handleResolve}
                                />
                            ))}
                        </div>
                    )}
                </div>
                
            </div>
        </div>
    );
}
