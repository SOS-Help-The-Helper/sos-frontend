export default function CitizenHome() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <img src="/logomark.svg" alt="SOS" className="h-16 w-16 mb-4" />
      <h1 className="text-2xl font-bold text-sos-blue-800">SOS | Connect</h1>
      <p className="text-sos-gray-600 mt-2 max-w-sm">Everyone is a helper. Need something? We&apos;ll match you. Have something to offer? We&apos;ll connect you.</p>
      <p className="text-sm text-sos-gray-400 mt-6">Citizen experience — Phase 2</p>
    </div>
  );
}
