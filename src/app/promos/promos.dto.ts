export interface PromoCheckResponse {
  valid: boolean;
  code: string;
  discountPercent: number;
}

export interface PromoConfigurationUpsertDTO {
  requiredTransactions: number;
}
