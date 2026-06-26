import React from 'react';
import { MessageSquare, PhoneCall, AlertTriangle, HelpCircle } from 'lucide-react';

export const RequestTypeBadge = ({ type, className = "", iconOnly = false }) => {
    const config = {
        CALLBACK_REQUEST: { icon: PhoneCall, label: "Callback" },
        COMPLAINT: { icon: AlertTriangle, label: "Complaint" },
        ESCALATION: { icon: MessageSquare, label: "Escalation" },
        GENERAL: { icon: HelpCircle, label: "General" },
        NEW_LEAD: { icon: HelpCircle, label: "New Lead" } // Adding fallback for NEW_LEAD
    };

    const current = config[type] || config.GENERAL;
    const Icon = current.icon;

    if (iconOnly) {
        return <Icon size={14} className={className} />;
    }

    return (
        <div className={`flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-sm font-medium ${className}`}>
            <Icon size={14} />
            <span>{current.label}</span>
        </div>
    );
};
