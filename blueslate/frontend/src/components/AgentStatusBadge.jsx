export default function AgentStatusBadge({ status }) {
    const available = status === "available";
    return (
        <div className="flex items-center gap-1.5">
            <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                    available ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
            />
            <span
                className={`text-sm font-semibold ${
                    available
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                }`}
            >
                {available ? "AI Receptionist Available" : "AI Receptionist Busy"}
            </span>
        </div>
    );
}
