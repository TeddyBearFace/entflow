// lib/sample-workflow.ts
// Sample HubSpot-style workflow definition for testing the analyst

export const SAMPLE_WORKFLOW = `{
  "name": "MQL Lead Nurture Sequence",
  "objectType": "contact",
  "enrollmentTrigger": {
    "type": "property_change",
    "property": "lifecyclestage",
    "value": "marketingqualifiedlead"
  },
  "steps": [
    {
      "id": "1",
      "type": "delay",
      "name": "Wait 1 day",
      "config": { "delayMs": 86400000 }
    },
    {
      "id": "2",
      "type": "action",
      "name": "Send email: Welcome to Our Platform",
      "config": { "emailId": "em_001", "type": "marketing_email" }
    },
    {
      "id": "3",
      "type": "delay",
      "name": "Wait 3 days",
      "config": { "delayMs": 259200000 }
    },
    {
      "id": "4",
      "type": "condition",
      "name": "Has opened welcome email?",
      "config": { "property": "email_opened", "emailId": "em_001" },
      "branches": {
        "yes": ["5"],
        "no": ["6"]
      }
    },
    {
      "id": "5",
      "type": "action",
      "name": "Send email: Case Study Deep Dive",
      "config": { "emailId": "em_002", "type": "marketing_email" }
    },
    {
      "id": "6",
      "type": "action",
      "name": "Send email: Re-engagement Nudge",
      "config": { "emailId": "em_003", "type": "marketing_email" }
    },
    {
      "id": "7",
      "type": "delay",
      "name": "Wait 5 days",
      "config": { "delayMs": 432000000 }
    },
    {
      "id": "8",
      "type": "action",
      "name": "Set property: Lead Score += 10",
      "config": { "property": "lead_score", "operation": "increment", "value": 10 }
    },
    {
      "id": "9",
      "type": "condition",
      "name": "Lead score > 50?",
      "config": { "property": "lead_score", "operator": "gt", "value": 50 },
      "branches": {
        "yes": ["10"],
        "no": ["11"]
      }
    },
    {
      "id": "10",
      "type": "action",
      "name": "Create task for sales rep",
      "config": { "taskType": "follow_up", "assignTo": "owner" }
    },
    {
      "id": "11",
      "type": "action",
      "name": "Send email: Final Value Prop",
      "config": { "emailId": "em_004", "type": "marketing_email" }
    },
    {
      "id": "12",
      "type": "delay",
      "name": "Wait 7 days",
      "config": { "delayMs": 604800000 }
    },
    {
      "id": "13",
      "type": "action",
      "name": "Set lifecycle stage to Opportunity",
      "config": { "property": "lifecyclestage", "value": "opportunity" }
    }
  ]
}`;
