const API_URL = "http://localhost:5000/api";

export const createBusinessContext = async (websiteUrl) => {
  const response = await fetch(
    `${API_URL}/business-context`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        websiteUrl,
      }),
    }
  );

  return response.json();
};