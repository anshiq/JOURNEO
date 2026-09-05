TOOL_SCHEMAS=[
    {"name":"create_campaign","description":"Create a campaign on Meta or Google","parameters":{"type":"object","properties":{"platform":{"type":"string","enum":["meta","google"]},"name":{"type":"string"},"objective":{"type":"string"},"daily_budget":{"type":"number"}},"required":["platform","name"]}},
    {"name":"pause_campaign","description":"Pause a campaign","parameters":{"type":"object","properties":{"platform":{"type":"string","enum":["meta","google"]},"campaignId":{"type":"string"}},"required":["platform","campaignId"]}},
    {"name":"reallocate_budget","description":"Reallocate budget between campaigns","parameters":{"type":"object","properties":{"platform":{"type":"string","enum":["meta","google"]},"fromCampaign":{"type":"string"},"toCampaign":{"type":"string"},"amount":{"type":"number"}},"required":["platform","fromCampaign","toCampaign","amount"]}},
    {"name":"query_data_catalog","description":"Query normalized metrics from Data Catalog","parameters":{"type":"object","properties":{"campaignId":{"type":"string"},"metrics":{"type":"string"},"from":{"type":"string"},"to":{"type":"string"}},"required":["campaignId"]}},
]
