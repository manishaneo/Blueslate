export const extractLeadData = (message) => {
    const emailMatch = message.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : null;

    const phoneMatch = message.match(/(\+?\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0].trim() : null;

    const nameMatch = message.match(
        /(?:my name is|i am|i'm)\s+([a-z]+)/i
    );

    const name = nameMatch
        ? nameMatch[1].charAt(0).toUpperCase() +
        nameMatch[1].slice(1).toLowerCase()
        : null;

    return {
        name,
        email,
        phone,
        interest: message,
    };
};
