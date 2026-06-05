import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 shadow-sm px-8 py-20 flex flex-col items-center text-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                    <BarChart3 size={28} className="text-violet-400 dark:text-violet-500" />
                </div>
                <div>
                    <h1 className="text-base font-semibold text-gray-900 dark:text-white">Analytics</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs">
                        Detailed lead trends, conversion funnels, and performance charts will appear here.
                    </p>
                </div>
                <span className="text-xs font-semibold bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-3 py-1 rounded-full">
                    Coming soon
                </span>
            </div>
        </div>
    );
}
