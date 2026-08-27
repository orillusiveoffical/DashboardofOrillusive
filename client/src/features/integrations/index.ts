/**
 * OTA Integration Client Stub
 *
 * Future UI for connecting Booking.com, Airbnb, etc.
 * Will consume server/src/modules/integrations/ API endpoints.
 */
export const OTA_PROVIDERS = [
  { id: 'booking-com', name: 'Booking.com', status: 'coming_soon' },
  { id: 'airbnb', name: 'Airbnb', status: 'coming_soon' },
] as const;
