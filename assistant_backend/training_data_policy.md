# Training Data Policy

We can prepare training or fine-tuning data later, but only from safe sources.

Allowed:
- Public/open-source food, recipe, nutrition, and cooking instruction data with licenses that allow model training.
- App route/action examples written by us.
- User interaction summaries only when the user has given clear consent.
- Anonymized preference signals such as "likes spicy food" or "prefers high-protein dinners".

Not allowed:
- Passwords.
- Raw addresses, payment details, government IDs, document numbers, or exact phone/email.
- Private chat messages unless explicit consent exists and the text is anonymized.
- Health diagnoses or sensitive medical claims as training labels.

First training target:
- Intent/action routing examples, not a full base LLM.
- Example input: "I want to book someone for dinner Friday."
- Example output: `{"routeIntent":"booking","actions":[{"route":"/booking-request","label":"Start booking"}]}`

