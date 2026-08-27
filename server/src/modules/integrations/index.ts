/**
 * OTA Integration Module — Architecture Stub
 *
 * Future integrations (Booking.com, Airbnb, Expedia) will implement
 * the OtaProvider interface. Each provider lives in its own subfolder:
 *
 *   integrations/
 *   ├── types.ts           — Shared interfaces
 *   ├── registry.ts        — Provider registration
 *   ├── booking-com/       — Booking.com adapter (Phase 2)
 *   └── airbnb/            — Airbnb adapter (Phase 2)
 *
 * Bookings synced from OTAs use BookingSource.OTA with externalId
 * and externalSource fields for deduplication and reconciliation.
 */

import type { BookingSource } from '@prisma/client';

export interface OtaBookingPayload {
  externalId: string;
  externalSource: string;
  roomExternalId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  status: string;
  specialRequests?: string;
}

export interface OtaProvider {
  name: string;
  source: BookingSource;
  connect(credentials: Record<string, string>): Promise<void>;
  disconnect(): Promise<void>;
  syncBookings(since?: Date): Promise<OtaBookingPayload[]>;
  pushAvailability(roomId: string, dates: { date: string; available: boolean }[]): Promise<void>;
  pushRates(roomTypeId: string, rates: { date: string; price: number }[]): Promise<void>;
}

export interface OtaProviderRegistry {
  register(provider: OtaProvider): void;
  get(name: string): OtaProvider | undefined;
  list(): string[];
}

/** Placeholder registry — providers registered at runtime in Phase 2 */
export const otaRegistry: OtaProviderRegistry = {
  providers: new Map<string, OtaProvider>(),

  register(provider: OtaProvider) {
    this.providers.set(provider.name, provider);
  },

  get(name: string) {
    return this.providers.get(name);
  },

  list() {
    return Array.from(this.providers.keys());
  },
} as OtaProviderRegistry & { providers: Map<string, OtaProvider> };

export function getIntegrationStatus() {
  return {
    enabled: false,
    providers: otaRegistry.list(),
    message: 'OTA integrations are not yet configured. Architecture is ready for Phase 2.',
  };
}
