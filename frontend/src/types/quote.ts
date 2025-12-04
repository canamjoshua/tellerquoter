export interface DiscountConfig {
  saas_year1_pct?: number; // Percentage discount on SaaS Year 1
  saas_all_years_pct?: number; // Percentage discount on SaaS all years
  setup_fixed?: number; // Fixed dollar discount on Setup
  setup_pct?: number; // Percentage discount on Setup
}

export interface ClientData {
  [key: string]: string | number | boolean | null | undefined;
}

export interface TravelConfig {
  [key: string]: string | number | boolean | null | undefined;
}

export interface Quote {
  Id: string;
  QuoteNumber: string;
  ClientName: string;
  ClientOrganization: string | null;
  CreatedBy: string;
  CreatedAt: string;
  UpdatedAt: string;
  Status: string;
}

export interface QuoteVersion {
  Id: string;
  QuoteId: string;
  VersionNumber: number;
  VersionDescription: string | null;
  PricingVersionId: string;
  ClientData: ClientData;
  ProjectionYears: number;
  EscalationModel: string;
  MultiYearFreezeYears: number | null;
  LevelLoadingEnabled: boolean;
  TellerPaymentsEnabled: boolean;
  DiscountConfig: DiscountConfig | null;
  ReferrerId: string | null;
  ReferralRateOverride: number | null;
  MilestoneStyle: string;
  InitialPaymentPercentage: number;
  ProjectDurationMonths: number;
  TravelZoneId: string | null;
  TravelConfig: TravelConfig | null;
  TotalSaaSMonthly: number | null;
  TotalSaaSAnnualYear1: number | null;
  TotalSetupPackages: number | null;
  TotalTravel: number | null;
  TotalContractedAmount: number | null;
  CreatedBy: string;
  CreatedAt: string;
  VersionStatus: string;
  SaaSProducts: QuoteVersionSaaSProduct[];
  SetupPackages: QuoteVersionSetupPackage[];
}

export interface QuoteVersionSaaSProduct {
  Id: string;
  SaaSProductId: string;
  Quantity: number;
  CalculatedMonthlyPrice: number;
  Notes: string | null;
}

export interface QuoteVersionSetupPackage {
  Id: string;
  SKUDefinitionId: string;
  Quantity: number;
  CalculatedPrice: number;
  CustomScopeNotes: string | null;
  SequenceOrder: number | null;
}

export interface QuoteWithVersions extends Quote {
  Versions: QuoteVersion[];
}

export interface NewQuote {
  ClientName: string;
  ClientOrganization: string;
  CreatedBy: string;
}

export interface NewQuoteVersion {
  PricingVersionId: string;
  ClientData: ClientData;
  ProjectionYears: number;
  CreatedBy: string;
  SaaSProducts: {
    SaaSProductId: string;
    Quantity: string;
    Notes?: string;
  }[];
  SetupPackages: {
    SKUDefinitionId: string;
    Quantity: number;
    CustomScopeNotes?: string;
    SequenceOrder?: number;
  }[];
}

export interface PricingVersion {
  Id: string;
  VersionNumber: string;
  Description: string | null;
  IsCurrent: boolean;
}

export interface SaaSProduct {
  Id: string;
  ProductCode: string;
  Name: string;
  Description: string | null;
  Category: string;
  PricingModel: string;
  Tier1Min: number;
  Tier1Max: number;
  Tier1Price: number;
  Tier2Min: number | null;
  Tier2Max: number | null;
  Tier2Price: number | null;
  Tier3Min: number | null;
  Tier3Max: number | null;
  Tier3Price: number | null;
  IsActive: boolean;
}

export interface SKUDefinition {
  Id: string;
  SKUCode: string;
  Name: string;
  Description: string | null;
  Category: string;
  FixedPrice: number | null;
  IsActive: boolean;
}
