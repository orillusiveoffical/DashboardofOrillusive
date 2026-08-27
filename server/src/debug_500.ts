import { getBookings } from './modules/bookings/bookings.service.js';
import { getCalendarGrid } from './modules/calendar/calendar.service.js';
import prisma from './lib/prisma.js';

async function testEndpoints() {
  console.log('--- DEBUGGING 500 ERRORS ---');
  
  const hotel = await prisma.hotel.findFirst();
  if (!hotel) {
    console.error('No hotel found in database');
    return;
  }
  
  console.log(`Using hotelId: ${hotel.id}`);

  try {
    console.log('Testing getBookings...');
    const bookings = await getBookings(hotel.id, {});
    console.log('getBookings SUCCESS:', bookings.items.length, 'items');
  } catch (err: any) {
    console.error('getBookings FAILED with Error:', err);
  }

  try {
    console.log('Testing getCalendarGrid...');
    const calendar = await getCalendarGrid(hotel.id, 2026, 8);
    console.log('getCalendarGrid SUCCESS:', calendar.grid.length, 'cells');
  } catch (err: any) {
    console.error('getCalendarGrid FAILED with Error:', err);
  }
}

testEndpoints()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
