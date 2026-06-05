import { useState } from "react";
import theme from "../config/theme.json";
import { createBusinessContext } from "../services/businessContextService";
function WebsiteInputForm() {
    const [websiteUrl, setWebsiteUrl] = useState("");

    const handleAnalyze = async () => {
        try {
            const data = await createBusinessContext(websiteUrl);

            console.log(data);

            alert(`Saved with ID ${data.data.id}`);
        } catch (error) {
            console.error(error);
            alert("Something went wrong");
        }
    };

    return (
        <div className={theme.card.className}>
            <h2 className="text-xl font-semibold mb-2">
                Website Analysis
            </h2>

            <p className="text-slate-500 mb-4">
                Enter a franchise website URL to begin analysis
            </p>

            <div className="flex gap-3">
                <input
                    type="text"
                    placeholder="https://example.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className={theme.input.className}
                />

                <button
                    className={theme.button.className}
                    onClick={handleAnalyze}
                >
                    Analyze
                </button>
            </div>
        </div>
    );
}

export default WebsiteInputForm;