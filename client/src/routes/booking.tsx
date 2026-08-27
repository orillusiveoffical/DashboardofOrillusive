import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { CheckCircle2, Users, Sparkles, Calendar, ShieldCheck, ArrowRight, Star, Coffee, Wifi } from 'lucide-react';
import { api } from '@/lib/api';

export const Route = createFileRoute('/booking')({
  component: DirectHotelBookingEngine,
});

const defaultPhotos = [
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1000&q=80',
];

function DirectHotelBookingEngine() {
  const [tenantSlug, setTenantSlug] = useState('orillusive-grand-hotel');
  const [checkIn, setCheckIn] = useState('2026-09-10');
  const [checkOut, setCheckOut] = useState('2026-09-14');
  const [adults] = useState(2);

  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);

  // Guest Details Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearching(true);
    setErrorMsg('');
    setBookingSuccess(null);

    try {
      const res = await api<any>(`/public/${tenantSlug}/availability?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`);
      setAvailableRooms(res.availableRoomTypes || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Hotel website API error');
    } finally {
      setSearching(false);
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api<any>(`/public/${tenantSlug}/bookings`, {
        method: 'POST',
        body: JSON.stringify({
          roomTypeId: selectedRoom.typeId,
          checkIn,
          checkOut,
          firstName,
          lastName,
          email,
          phone,
        }),
      });
      setBookingSuccess(res);
      setSelectedRoom(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Direct booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-12">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Luxury Hero Banner */}
        <div className="relative rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-950 p-8 md:p-12 shadow-2xl overflow-hidden text-center space-y-4">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" /> ORILLUSIVE HMS DIRECT BOOKING ENGINE
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Reserve Your Luxury Stay Direct
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Real-time direct reservation engine connected directly to hotel inventory and automated OTA channel manager.
          </p>

          <div className="flex items-center justify-center gap-6 text-xs text-slate-400 pt-2">
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Star className="w-4 h-4 fill-amber-400" /> 5-Star Luxury Resort
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" /> Instant Confirmation
            </span>
          </div>
        </div>

        {/* Search Bar Box */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl space-y-4">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Hotel Property Slug</label>
              <input
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Check-in Date</label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Check-out Date</label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              disabled={searching}
              className="py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
            >
              {searching ? 'Checking Live Inventory...' : 'Check Availability'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center">
            {errorMsg}
          </div>
        )}

        {/* Booking Confirmation Receipt Banner */}
        {bookingSuccess && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-2xl space-y-3">
            <div className="flex items-center gap-3 text-emerald-400 font-bold text-lg">
              <CheckCircle2 className="w-6 h-6" /> Direct Booking Confirmed!
            </div>
            <p className="text-xs text-slate-300">
              Reservation ID: <span className="font-bold text-white">{bookingSuccess.booking?.bookingId}</span> | Confirmation Code: <span className="font-mono text-emerald-300 font-bold">{bookingSuccess.booking?.bookingNumber}</span>
            </p>
            <p className="text-[11px] text-slate-400">
              Room reserved in HMS tenant database. Availability deducted and synced across connected OTA channels.
            </p>
          </div>
        )}

        {/* Available Room Cards */}
        {availableRooms.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" /> Available Room Suites
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableRooms.map((room, idx) => (
                <div
                  key={room.typeId}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl hover:border-slate-700 transition flex flex-col justify-between"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={room.imageUrl || defaultPhotos[idx % defaultPhotos.length]}
                      alt={room.name}
                      className="w-full h-full object-cover transition transform hover:scale-105 duration-500"
                    />
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 text-xs font-extrabold text-indigo-400">
                      {Number(room.basePrice).toLocaleString()} PKR / night
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="font-bold text-white text-lg">{room.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">{room.description || 'Luxury room category with premium amenities'}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-300 border-t border-b border-slate-800/80 py-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-indigo-400" /> Max {room.maxOccupancy} Guests
                      </span>
                      <span className="flex items-center gap-1">
                        <Wifi className="w-3.5 h-3.5 text-slate-400" /> Free Wi-Fi
                      </span>
                      <span className="flex items-center gap-1">
                        <Coffee className="w-3.5 h-3.5 text-slate-400" /> Breakfast Included
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedRoom(room)}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/20"
                    >
                      Select Room Suite
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Guest Details */}
        {selectedRoom && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">Complete Reservation: {selectedRoom.name}</h3>
                <button onClick={() => setSelectedRoom(null)} className="text-slate-400 hover:text-white font-bold text-lg">
                  ✕
                </button>
              </div>

              <form onSubmit={handleConfirmBooking} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Phone Contact</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div className="pt-3 flex gap-3">
                  <button type="button" onClick={() => setSelectedRoom(null)} className="flex-1 py-2.5 rounded-lg bg-slate-800 text-slate-300">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50"
                  >
                    {submitting ? 'Confirming...' : 'Confirm Reservation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
