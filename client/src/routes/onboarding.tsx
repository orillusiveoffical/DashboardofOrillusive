import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CheckCircle2, ArrowRight, Building2, BedDouble, Calendar, Sparkles } from 'lucide-react';
import { roomsService } from '@/services/rooms.service';

export const Route = createFileRoute('/onboarding')({
  component: HotelOnboardingWizard,
});

function HotelOnboardingWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Info
  const [hotelName, setHotelName] = useState('Orillusive Grand Hotel');
  const [city, setCity] = useState('Islamabad');

  // Step 2: Room Type
  const [typeName, setTypeName] = useState('Deluxe Room');
  const [basePrice, setBasePrice] = useState(15000);
  const [maxOccupancy, setMaxOccupancy] = useState(2);

  // Step 3: Rooms
  const [roomNumber, setRoomNumber] = useState('101');

  const handleCreateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await roomsService.createType({
        name: typeName,
        basePrice,
        maxOccupancy,
      });
      setCurrentStep(3);
    } catch (err) {
      setCurrentStep(3);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const types = await roomsService.getRoomTypes();
      if (types && types.length > 0) {
        await roomsService.create({
          number: roomNumber,
          roomTypeId: (types[0] as any).typeId || types[0].id,
        });
      }
    } catch (err) {}
    setCurrentStep(4);
  };

  return (
    <div className="min-h-screen bg-[#F3E3D0] text-[#0F172A] flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full bg-white border border-[#D2C4B4] rounded-3xl p-8 shadow-sm space-y-8">
        <div className="flex items-center justify-between border-b border-[#D2C4B4] pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#81A6C6] text-white">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#0F172A]">Hotel Onboarding Wizard</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Step {currentStep} of 5 — Setup HMS Inventory</p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-[#AACDDC]/30 text-[#0F172A] border border-[#81A6C6]/30 font-bold">
            <Sparkles className="w-3.5 h-3.5 inline mr-1 text-[#81A6C6]" /> Initializing Tenant
          </span>
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`h-2 rounded-full transition-all duration-300 ${
                step <= currentStep ? 'bg-[#81A6C6]' : 'bg-[#FAF5EF] border border-[#D2C4B4]'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Hotel Profile */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#81A6C6]" /> Step 1: Hotel Information
            </h2>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Hotel / Resort Name</label>
                <input
                  type="text"
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">City / Location</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>
            </div>
            <button
              onClick={() => setCurrentStep(2)}
              className="w-full h-12 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
            >
              Continue to Room Types <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Add Room Type */}
        {currentStep === 2 && (
          <form onSubmit={handleCreateRoomType} className="space-y-5">
            <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-[#81A6C6]" /> Step 2: Add First Room Type
            </h2>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Room Type Name</label>
                <input
                  type="text"
                  required
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Base Price (PKR)</label>
                  <input
                    type="number"
                    required
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Max Occupancy</label>
                  <input
                    type="number"
                    required
                    value={maxOccupancy}
                    onChange={(e) => setMaxOccupancy(Number(e.target.value))}
                    className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] outline-none focus:ring-2 focus:ring-[#81A6C6]"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
            >
              Save Room Type & Continue <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Step 3: Add Room */}
        {currentStep === 3 && (
          <form onSubmit={handleCreateRoom} className="space-y-5">
            <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-[#81A6C6]" /> Step 3: Add Initial Room Number
            </h2>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Room Number</label>
                <input
                  type="text"
                  required
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
            >
              Add Room & Set Availability <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Step 4: Availability */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#81A6C6]" /> Step 4: Verify Initial Inventory Availability
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Rooms added are marked <span className="text-emerald-800 font-bold">AVAILABLE</span> by default. You can block or update dates at any time from the Availability module.
            </p>
            <button
              onClick={() => setCurrentStep(5)}
              className="w-full h-12 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
            >
              Proceed to OTA Channel Connections <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 5: Finish */}
        {currentStep === 5 && (
          <div className="space-y-6 text-center">
            <div className="inline-flex p-4 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-[#0F172A]">Hotel Setup Completed!</h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 font-medium">
                Your isolated tenant database is initialized and ready. Launch your dashboard to manage rooms, bookings, and OTA channels.
              </p>
            </div>
            <button
              onClick={() => navigate({ to: '/dashboard' })}
              className="w-full h-12 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white font-bold text-sm transition shadow-sm active:scale-[0.98]"
            >
              Launch Operational Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
