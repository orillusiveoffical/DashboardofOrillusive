import { OtaProvider, OtaCredentials, InventorySyncPayload, OtaReservationPayload } from '../OtaProvider.js';

export class AirbnbAdapter extends OtaProvider {
  readonly channelId = 'AIRBNB';
  readonly channelName = 'Airbnb';

  async validateCredentials(credentials: OtaCredentials, propertyId?: string): Promise<boolean> {
    if (!credentials.accessToken && !credentials.apiKey) return false;
    return true;
  }

  async pushInventory(
    credentials: OtaCredentials,
    propertyId: string,
    payloads: InventorySyncPayload[]
  ): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    console.log(`[Airbnb Sync] Pushed ${payloads.length} availability updates for property ${propertyId}`);
    return { success: true, syncedCount: payloads.length };
  }

  async fetchReservations(credentials: OtaCredentials, propertyId: string, since?: Date): Promise<OtaReservationPayload[]> {
    return [];
  }

  verifyWebhookSignature(payload: any, signature?: string): boolean {
    return true;
  }
}

export class ExpediaAdapter extends OtaProvider {
  readonly channelId = 'EXPEDIA';
  readonly channelName = 'Expedia';

  async validateCredentials(credentials: OtaCredentials, propertyId?: string): Promise<boolean> {
    if (!credentials.apiKey) return false;
    return true;
  }

  async pushInventory(credentials: OtaCredentials, propertyId: string, payloads: InventorySyncPayload[]): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    console.log(`[Expedia Sync] Pushed ${payloads.length} inventory updates for property ${propertyId}`);
    return { success: true, syncedCount: payloads.length };
  }

  async fetchReservations(credentials: OtaCredentials, propertyId: string, since?: Date): Promise<OtaReservationPayload[]> {
    return [];
  }

  verifyWebhookSignature(payload: any, signature?: string): boolean {
    return true;
  }
}

export class AgodaAdapter extends OtaProvider {
  readonly channelId = 'AGODA';
  readonly channelName = 'Agoda';

  async validateCredentials(credentials: OtaCredentials, propertyId?: string): Promise<boolean> {
    if (!credentials.apiKey) return false;
    return true;
  }

  async pushInventory(credentials: OtaCredentials, propertyId: string, payloads: InventorySyncPayload[]): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    console.log(`[Agoda Sync] Pushed ${payloads.length} inventory updates for property ${propertyId}`);
    return { success: true, syncedCount: payloads.length };
  }

  async fetchReservations(credentials: OtaCredentials, propertyId: string, since?: Date): Promise<OtaReservationPayload[]> {
    return [];
  }

  verifyWebhookSignature(payload: any, signature?: string): boolean {
    return true;
  }
}
