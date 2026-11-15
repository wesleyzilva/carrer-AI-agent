import type { IndustryId } from "./industries.js";

export interface CompanyConfig {
  name: string;
  /** Nomes alternativos / normalizados (lowercase) para casar com o texto da vaga. */
  aliases: string[];
  industry: IndustryId;
  country: string;
  international: boolean;
}

const c = (
  name: string,
  industry: IndustryId,
  country = "US",
  aliases: string[] = [],
  international = true,
): CompanyConfig => ({
  name,
  aliases: [name.toLowerCase(), ...aliases.map((a) => a.toLowerCase())],
  industry,
  country,
  international,
});

export const PRIORITY_COMPANIES: CompanyConfig[] = [
  // Cybersecurity
  c("CrowdStrike", "cybersecurity"),
  c("Palo Alto Networks", "cybersecurity", "US", ["palo alto"]),
  c("Wiz", "cybersecurity", "US", ["wiz.io"]),
  c("Veracode", "cybersecurity"),
  c("Rapid7", "cybersecurity"),
  c("Checkmarx", "cybersecurity", "IL"),
  c("Snyk", "cybersecurity", "UK"),
  c("SentinelOne", "cybersecurity"),
  c("Zscaler", "cybersecurity"),
  c("Cloudflare", "cybersecurity"),
  // Payments
  c("Stripe", "payments"),
  c("Adyen", "payments", "NL"),
  c("Checkout.com", "payments", "UK", ["checkout"]),
  c("Fiserv", "payments"),
  c("FIS", "payments", "US", ["fis global"]),
  c("Worldpay", "payments", "UK"),
  c("Wise", "payments", "UK", ["transferwise"]),
  c("Mastercard", "payments"),
  c("Visa", "payments"),
  c("Payoneer", "payments"),
  // Observability
  c("Datadog", "observability"),
  c("New Relic", "observability"),
  c("Dynatrace", "observability", "AT"),
  c("Grafana Labs", "observability", "US", ["grafana"]),
  c("Elastic", "observability", "NL", ["elastic.co", "elasticsearch"]),
  c("Splunk", "observability"),
  // Data
  c("Databricks", "data_platforms"),
  c("Snowflake", "data_platforms"),
  c("Confluent", "data_platforms"),
  c("dbt Labs", "data_platforms", "US", ["dbt"]),
  c("Fivetran", "data_platforms"),
  c("Starburst", "data_platforms"),
  // Cloud
  c("AWS", "cloud_infrastructure", "US", ["amazon web services", "amazon"]),
  c("Microsoft", "cloud_infrastructure", "US", ["azure"]),
  c("Google", "cloud_infrastructure", "US", ["google cloud", "gcp", "alphabet"]),
  c("IBM", "mainframe_modernization"),
  c("Kyndryl", "mainframe_modernization"),
  // HR Tech
  c("Deel", "hr_tech"),
  c("Remote", "hr_tech", "US", ["remote.com"]),
  c("Rippling", "hr_tech"),
  c("BambooHR", "hr_tech"),
  c("Gusto", "hr_tech"),
  c("Workday", "hr_tech"),
  // CRM
  c("Salesforce", "crm"),
  c("HubSpot", "crm"),
  c("Zendesk", "crm"),
  c("Freshworks", "crm", "US"),
  c("Zoho", "crm", "IN"),
  // Legal Tech
  c("Clio", "legal_tech", "CA"),
  c("Ironclad", "legal_tech"),
  c("Relativity", "legal_tech"),
  c("LexisNexis", "legal_tech"),
  c("Thomson Reuters", "legal_tech", "CA"),
  // Mainframe
  c("Rocket Software", "mainframe_modernization"),
  c("BMC", "mainframe_modernization", "US", ["bmc software"]),
  c("Broadcom", "mainframe_modernization"),
  c("DXC", "mainframe_modernization", "US", ["dxc technology"]),
  c("Ensono", "mainframe_modernization"),
  // Logistics
  c("Expresso São Miguel", "logistics_tech", "BR", ["expresso sao miguel"], false),
  c("JSL", "logistics_tech", "BR", [], false),
  c("Tegma", "logistics_tech", "BR", [], false),
  c("FedEx", "logistics_tech"),
  c("DHL", "logistics_tech", "DE"),
  c("Flexport", "logistics_tech"),
  c("Uber Freight", "logistics_tech"),
];
