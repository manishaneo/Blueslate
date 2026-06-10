import { useState, useEffect } from "react";
import AIConversationTester from "../components/AIConversationTester";
import { getSettings } from "../services/settingsService";

const loadContexts = () => {
    try { return JSON.parse(localStorage.getItem("businessContexts")) || []; }
    catch { return []; }
};

export default function ReceptionistPage() {
    const [agentName, setAgentName] = useState(null);

    useEffect(() => {
        getSettings()
            .then((s) => setAgentName(s.settings?.aiPersonaName ?? "Virtual Receptionist"))
            .catch(() => setAgentName("Virtual Receptionist"));
    }, []);

    const businessContextId = localStorage.getItem("businessContextId");

    if (!businessContextId) {
        window.location.href = "/setup";
        return null;
    }

    if (!agentName) return null;

    const contexts    = loadContexts();
    const currentCtx  = contexts.find((c) => String(c.id) === String(businessContextId));
    const businessName = currentCtx?.title || currentCtx?.url || "";

    const greeting = businessName
        ? `Hi, thank you for calling ${businessName}. This is ${agentName}, your virtual receptionist. How may I help you today?`
        : `Hi, thank you for calling. This is ${agentName}, your virtual receptionist. How may I help you today?`;

    return (
        <AIConversationTester
            greeting={greeting}
            businessName={businessName}
            businessContextId={businessContextId}
            businessContextUrl={currentCtx?.url}
            mode="receptionist"
            agentName={agentName}
        />
    );
}
