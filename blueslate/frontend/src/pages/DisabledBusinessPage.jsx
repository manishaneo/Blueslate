import { Ban, Mail } from "lucide-react";
import { logout } from "../utils/auth";

export default function DisabledBusinessPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
            <div className="w-full max-w-md text-center">

                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/20 mb-6">
                    <Ban size={32} className="text-red-600 dark:text-red-400" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Business Account Disabled
                </h1>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                    Your access to Blueslate has been suspended. Please contact support if you believe this is an error.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <a
                        href="mailto:support@blueslate.com"
                        className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <Mail size={16} />
                        Contact Support
                    </a>
                    <button
                        onClick={logout}
                        className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
                    >
                        Sign Out
                    </button>
                </div>

            </div>
        </div>
    );
}
