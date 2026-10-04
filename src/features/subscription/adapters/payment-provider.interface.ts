import type { PaymentMethodType } from "../models/subscription.model";

export interface NormalizedPaymentResult {
  status: "succeeded" | "failed" | "cancelled" | "pending";
  providerTransactionId: string;
  providerSessionRef: string;
  errorCode?: string;
  errorMessage?: string;
  simulatedPaymentMethodSummary: string;
  methodType: PaymentMethodType;
  timestamp: Date;
}

export type MockScenarioType =
  | "success"
  | "insufficient_funds"
  | "user_cancelled"
  | "network_timeout"
  | "invalid_credentials";

export interface IPaymentProviderAdapter {
  createPaymentSession(params: {
    orderId: string;
    amountMinorUnits: number;
    currency: string;
    customerId: string;
    customerEmail?: string;
  }): Promise<{
    providerSessionRef: string;
    paymentUrl?: string;
    expiresAt: Date;
  }>;

  processPaymentSimulation(params: {
    providerSessionRef: string;
    methodType: PaymentMethodType;
    scenario?: MockScenarioType;
    methodDetails?: Record<string, any>;
  }): Promise<NormalizedPaymentResult>;
}
