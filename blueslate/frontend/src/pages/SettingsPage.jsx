import { Settings } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 shadow-sm px-8 py-20 flex flex-col items-center text-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                    <Settings size={28} className="text-gray-400 dark:text-gray-500" />
                </div>
                <div>
                    <h1 className="text-base font-semibold text-gray-900 dark:text-white">Settings</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs">
                        Configure your AI receptionist behavior, notifications, and account preferences.
                    </p>
                </div>
                <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-3 py-1 rounded-full">
                    Coming soon
                </span>
            </div>
        </div>
    );
}
