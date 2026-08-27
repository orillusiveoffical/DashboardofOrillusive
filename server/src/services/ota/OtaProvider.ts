export interface OtaCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  hotelId?: string;
  propertyId?: string;
}

export interface InventorySyncPayload {
  hmsRoomTypeId: string;
  otaRoomTypeId: string;
  date: string; // YYYY-MM-DD
  availableUnits: number;
  price?: number;
}

export interface OtaReservationPayload {
  externalBookingId: string;
  channelId: 'BOOKING_COM' | 'AIRBNB' | 'EXPEDIA' | 'AGODA';
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  otaRoomTypeId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults: number;
  children: number;
  totalPrice: number;
  currency: string;
  specialRequests?: string;
}

export abstract class OtaProvider {
  abstract readonly channelId: 'BOOKING_COM' | 'AIRBNB' | 'EXPEDIA' | 'AGODA';
  abstract readonly channelName: string;

  /**
   * Validate API credentials against OTA endpoint
   */
  abstract validateCredentials(credentials: OtaCredentials, propertyId?: string): Promise<boolean>;

  /**
   * Push real-time inventory updates to OTA
   */
  abstract pushInventory(
    credentials: OtaCredentials,
    propertyId: string,
    payloads: InventorySyncPayload[]
  ): Promise<{ success: boolean; syncedCount: number; error?: string }>;

  /**
   * Pull recent bookings directly from OTA channel
   */
  abstract fetchReservations(
    credentials: OtaCredentials,
    propertyId: string,
    since?: Date
  ): Promise<OtaReservationPayload[]>;

  /**
   * Verify signature for incoming webhooks
   */
  abstract verifyWebhookSignature(payload: any, signature?: string): boolean;
}
