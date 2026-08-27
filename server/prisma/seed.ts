import { PrismaClient, UserRole, RoomStatus, BookingStatus, PaymentStatus, PaymentMethod, BookingSource } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Orillusive Hotel Suite database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const hotel = await prisma.hotel.upsert({
    where: { slug: 'orillusive-grand' },
    update: {},
    create: {
      name: 'Orillusive Grand Hotel',
      slug: 'orillusive-grand',
      description: 'A premium boutique hotel experience in the heart of the city.',
      address: '123 Luxury Avenue',
      city: 'New York',
      country: 'USA',
      phone: '+1 (555) 123-4567',
      email: 'info@orillusive.com',
      timezone: 'America/New_York',
      currency: 'USD',
      settings: {
        create: {
          checkInTime: '15:00',
          checkOutTime: '11:00',
          defaultTaxRate: 8.875,
          allowOnlineBooking: true,
          cancellationPolicy: 'Free cancellation up to 24 hours before check-in.',
        },
      },
    },
  });

  const [owner, manager, staff] = await Promise.all([
    prisma.user.upsert({
      where: { hotelId_email: { hotelId: hotel.id, email: 'owner@orillusive.com' } },
      update: {},
      create: {
        hotelId: hotel.id,
        email: 'owner@orillusive.com',
        passwordHash,
        firstName: 'Alexander',
        lastName: 'Orillusive',
        role: UserRole.OWNER,
        phone: '+1 (555) 100-0001',
      },
    }),
    prisma.user.upsert({
      where: { hotelId_email: { hotelId: hotel.id, email: 'manager@orillusive.com' } },
      update: {},
      create: {
        hotelId: hotel.id,
        email: 'manager@orillusive.com',
        passwordHash,
        firstName: 'Maria',
        lastName: 'Chen',
        role: UserRole.MANAGER,
        phone: '+1 (555) 100-0002',
      },
    }),
    prisma.user.upsert({
      where: { hotelId_email: { hotelId: hotel.id, email: 'staff@orillusive.com' } },
      update: {},
      create: {
        hotelId: hotel.id,
        email: 'staff@orillusive.com',
        passwordHash,
        firstName: 'James',
        lastName: 'Wilson',
        role: UserRole.STAFF,
        phone: '+1 (555) 100-0003',
      },
    }),
  ]);

  const roomTypes = await Promise.all([
    prisma.roomType.upsert({
      where: { hotelId_name: { hotelId: hotel.id, name: 'Standard King' } },
      update: {},
      create: {
        hotelId: hotel.id,
        name: 'Standard King',
        description: 'Comfortable king bed room with city view.',
        basePrice: 149.99,
        maxOccupancy: 2,
        amenities: ['WiFi', 'TV', 'Mini Bar', 'Air Conditioning'],
        imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
      },
    }),
    prisma.roomType.upsert({
      where: { hotelId_name: { hotelId: hotel.id, name: 'Deluxe Suite' } },
      update: {},
      create: {
        hotelId: hotel.id,
        name: 'Deluxe Suite',
        description: 'Spacious suite with separate living area and premium amenities.',
        basePrice: 299.99,
        maxOccupancy: 4,
        amenities: ['WiFi', 'TV', 'Mini Bar', 'Air Conditioning', 'Jacuzzi', 'Room Service'],
        imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
      },
    }),
    prisma.roomType.upsert({
      where: { hotelId_name: { hotelId: hotel.id, name: 'Executive Room' } },
      update: {},
      create: {
        hotelId: hotel.id,
        name: 'Executive Room',
        description: 'Business-friendly room with work desk and lounge access.',
        basePrice: 219.99,
        maxOccupancy: 2,
        amenities: ['WiFi', 'TV', 'Mini Bar', 'Air Conditioning', 'Work Desk', 'Lounge Access'],
        imageUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
      },
    }),
  ]);

  const [standardType, deluxeType, executiveType] = roomTypes;

  const roomsData = [
    { number: '101', floor: 1, roomTypeId: standardType.id, status: RoomStatus.OCCUPIED },
    { number: '102', floor: 1, roomTypeId: standardType.id, status: RoomStatus.AVAILABLE },
    { number: '103', floor: 1, roomTypeId: standardType.id, status: RoomStatus.AVAILABLE },
    { number: '201', floor: 2, roomTypeId: executiveType.id, status: RoomStatus.AVAILABLE },
    { number: '202', floor: 2, roomTypeId: executiveType.id, status: RoomStatus.MAINTENANCE },
    { number: '301', floor: 3, roomTypeId: deluxeType.id, status: RoomStatus.AVAILABLE },
    { number: '302', floor: 3, roomTypeId: deluxeType.id, status: RoomStatus.OCCUPIED },
  ];

  const rooms = await Promise.all(
    roomsData.map((r) =>
      prisma.room.upsert({
        where: { hotelId_number: { hotelId: hotel.id, number: r.number } },
        update: {},
        create: { hotelId: hotel.id, ...r },
      })
    )
  );

  for (const room of rooms.slice(0, 3)) {
    await prisma.roomImage.create({
      data: {
        roomId: room.id,
        url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
        caption: 'Room view',
        isPrimary: true,
        sortOrder: 0,
      },
    });
  }

  const guests = await Promise.all([
    prisma.guest.create({
      data: {
        hotelId: hotel.id,
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@email.com',
        phone: '+1 (555) 200-0001',
        city: 'Boston',
        country: 'USA',
        notes: 'Prefers high floor, allergic to feather pillows.',
      },
    }),
    prisma.guest.create({
      data: {
        hotelId: hotel.id,
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.j@email.com',
        phone: '+1 (555) 200-0002',
        city: 'Chicago',
        country: 'USA',
      },
    }),
    prisma.guest.create({
      data: {
        hotelId: hotel.id,
        firstName: 'Michael',
        lastName: 'Brown',
        email: 'michael.b@email.com',
        phone: '+1 (555) 200-0003',
        city: 'Los Angeles',
        country: 'USA',
        notes: 'VIP guest - complimentary upgrade when available.',
      },
    }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const addDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const bookings = await Promise.all([
    prisma.booking.create({
      data: {
        hotelId: hotel.id,
        roomId: rooms[0].id,
        guestId: guests[0].id,
        createdById: manager.id,
        bookingNumber: 'BK-2025-0001',
        checkIn: addDays(today, -1),
        checkOut: addDays(today, 2),
        adults: 2,
        status: BookingStatus.CHECKED_IN,
        source: BookingSource.DIRECT,
        totalAmount: 449.97,
        paidAmount: 449.97,
        checkedInAt: addDays(today, -1),
        checkedInById: staff.id,
      },
    }),
    prisma.booking.create({
      data: {
        hotelId: hotel.id,
        roomId: rooms[6].id,
        guestId: guests[2].id,
        createdById: manager.id,
        bookingNumber: 'BK-2025-0002',
        checkIn: today,
        checkOut: addDays(today, 3),
        adults: 2,
        children: 1,
        status: BookingStatus.CHECKED_IN,
        source: BookingSource.PHONE,
        totalAmount: 899.97,
        paidAmount: 500,
        checkedInAt: today,
        checkedInById: staff.id,
      },
    }),
    prisma.booking.create({
      data: {
        hotelId: hotel.id,
        roomId: rooms[1].id,
        guestId: guests[1].id,
        createdById: staff.id,
        bookingNumber: 'BK-2025-0003',
        checkIn: addDays(today, 1),
        checkOut: addDays(today, 4),
        adults: 1,
        status: BookingStatus.CONFIRMED,
        source: BookingSource.DIRECT,
        totalAmount: 449.97,
        paidAmount: 0,
        specialRequests: 'Late check-in after 10 PM',
      },
    }),
    prisma.booking.create({
      data: {
        hotelId: hotel.id,
        roomId: rooms[3].id,
        guestId: guests[0].id,
        createdById: manager.id,
        bookingNumber: 'BK-2025-0004',
        checkIn: addDays(today, 5),
        checkOut: addDays(today, 8),
        adults: 2,
        status: BookingStatus.CONFIRMED,
        source: BookingSource.WALK_IN,
        totalAmount: 659.97,
        paidAmount: 659.97,
      },
    }),
    prisma.booking.create({
      data: {
        hotelId: hotel.id,
        roomId: rooms[2].id,
        guestId: guests[1].id,
        createdById: staff.id,
        bookingNumber: 'BK-2025-0005',
        checkIn: addDays(today, -5),
        checkOut: addDays(today, -2),
        adults: 1,
        status: BookingStatus.CHECKED_OUT,
        source: BookingSource.DIRECT,
        totalAmount: 449.97,
        paidAmount: 449.97,
        checkedInAt: addDays(today, -5),
        checkedOutAt: addDays(today, -2),
        checkedInById: staff.id,
      },
    }),
  ]);

  await Promise.all([
    prisma.payment.create({
      data: {
        hotelId: hotel.id,
        bookingId: bookings[0].id,
        amount: 449.97,
        method: PaymentMethod.CARD,
        status: PaymentStatus.COMPLETED,
        reference: 'PAY-001',
        paidAt: addDays(today, -1),
      },
    }),
    prisma.payment.create({
      data: {
        hotelId: hotel.id,
        bookingId: bookings[1].id,
        amount: 500,
        method: PaymentMethod.CARD,
        status: PaymentStatus.COMPLETED,
        reference: 'PAY-002',
        paidAt: today,
      },
    }),
    prisma.payment.create({
      data: {
        hotelId: hotel.id,
        bookingId: bookings[3].id,
        amount: 659.97,
        method: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        reference: 'PAY-003',
        paidAt: addDays(today, -1),
      },
    }),
  ]);

  await prisma.roomBlock.create({
    data: {
      hotelId: hotel.id,
      roomId: rooms[4].id,
      startDate: addDays(today, -2),
      endDate: addDays(today, 5),
      reason: 'MAINTENANCE',
      notes: 'Bathroom renovation in progress',
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log(`   Hotel: ${hotel.name}`);
  console.log(`   Users: ${owner.email}, ${manager.email}, ${staff.email}`);
  console.log(`   Rooms: ${rooms.length}, Bookings: ${bookings.length}, Guests: ${guests.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
