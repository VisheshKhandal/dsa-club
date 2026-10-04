import type {
  IPaymentProviderAdapter,
  NormalizedPaymentResult,
  MockScenarioType,
} from "./payment-provider.interface";
import type { PaymentMethodType } from "../models/subscription.model";

/**
 * Replaceable Mock Payment Provider Adapter.
 * Provides a faithful simulation of synchronous/asynchronous payment lifecycles
 * without processing real funds or accepting real payment credentials.
 */
export class MockPaymentProviderAdapter implements IPaymentProviderAdapter {
  private static instance: MockPaymentProviderAdapter;

  static getInstance(): MockPaymentProviderAdapter {
    if (!MockPaymentProviderAdapter.instance) {
      MockPaymentProviderAdapter.instance = new MockPaymentProviderAdapter();
    }
    return MockPaymentProviderAdapter.instance;
  }

  async createPaymentSession(params: {
    orderId: string;
    amountMinorUnits: number;
    currency: string;
    customerId: string;
    customerEmail?: string;
  }): Promise<{
    providerSessionRef: string;
    paymentUrl?: string;
    expiresAt: Date;
  }> {
    const providerSessionRef = `mock_sess_${params.orderId}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    return {
      providerSessionRef,
      paymentUrl: `/checkout/simulate?session=${providerSessionRef}`,
      expiresAt,
    };
  }

  async processPaymentSimulation(params: {
    providerSessionRef: string;
    methodType: PaymentMethodType;
    scenario?: MockScenarioType;
    methodDetails?: Record<string, any>;
  }): Promise<NormalizedPaymentResult> {
    const { providerSessionRef, methodType, scenario = "success" } = params;
    const providerTransactionId = `mock_txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date();

    // 1. Summarize simulated payment method safely without sensitive data
    let simulatedSummary = "";
    switch (methodType) {
      case "upi":
        simulatedSummary = `UPI (Simulated: ${params.methodDetails?.upiId || "demo-learner@okhdfcbank"})`;
        break;
      case "card":
        simulatedSummary = `Card (Simulated: •••• 4242 / ${params.methodDetails?.brand || "Visa"})`;
        break;
      case "netbanking":
        simulatedSummary = `Net Banking (Simulated: ${params.methodDetails?.bankName || "HDFC Bank"})`;
        break;
      case "wallet":
        simulatedSummary = `Wallet (Simulated: ${params.methodDetails?.walletProvider || "Demonstration Wallet"})`;
        break;
      default:
        simulatedSummary = "Demonstration Payment Method";
    }

    // 2. Handle Test Scenarios
    switch (scenario) {
      case "insufficient_funds":
        return {
          status: "failed",
          providerTransactionId,
          providerSessionRef,
          errorCode: "INSUFFICIENT_FUNDS",
          errorMessage: "Simulated payment failed: Insufficient balance in mock account.",
          simulatedPaymentMethodSummary: simulatedSummary,
          methodType,
          timestamp: now,
        };

      case "user_cancelled":
        return {
          status: "cancelled",
          providerTransactionId,
          providerSessionRef,
          errorCode: "USER_CANCELLED",
          errorMessage: "Simulated payment was cancelled by the learner.",
          simulatedPaymentMethodSummary: simulatedSummary,
          methodType,
          timestamp: now,
        };

      case "network_timeout":
        return {
          status: "failed",
          providerTransactionId,
          providerSessionRef,
          errorCode: "GATEWAY_TIMEOUT",
          errorMessage: "Simulated gateway timed out. Please retry.",
          simulatedPaymentMethodSummary: simulatedSummary,
          methodType,
          timestamp: now,
        };

      case "invalid_credentials":
        return {
          status: "failed",
          providerTransactionId,
          providerSessionRef,
          errorCode: "INVALID_CREDENTIALS",
          errorMessage: "Simulated authentication failed for test account.",
          simulatedPaymentMethodSummary: simulatedSummary,
          methodType,
          timestamp: now,
        };

      case "success":
      default:
        return {
          status: "succeeded",
          providerTransactionId,
          providerSessionRef,
          simulatedPaymentMethodSummary: simulatedSummary,
          methodType,
          timestamp: now,
        };
    }
  }
}

export const mockPaymentProvider = MockPaymentProviderAdapter.getInstance();
