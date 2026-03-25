"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [savedPhone, setSavedPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchUser() {
      const res = await fetch("/api/user");
      if (res.ok) {
        const data = await res.json();
        if (data.phone_number) {
          setSavedPhone(data.phone_number);
          setPhoneNumber(data.phone_number);
        }
      }
    }
    if (isLoaded && user) {
      fetchUser();
    }
  }, [isLoaded, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber }),
    });

    if (res.ok) {
      const data = await res.json();
      setSavedPhone(data.phone_number);
      setMessage("Phone number saved!");
    } else {
      setMessage("Failed to save phone number");
    }
    setLoading(false);
  }

  if (!isLoaded) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return <div className="p-8">Please sign in to view your profile.</div>;
  }

  return (
    <div className="p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="mb-6">
        <p className="text-sm text-gray-500">Email</p>
        <p>{user.primaryEmailAddress?.emailAddress}</p>
      </div>

      <div className="mb-6">
        <p className="text-sm text-gray-500">Current Phone</p>
        <p>{savedPhone || "Not set"}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <label className="block mb-2 text-sm text-gray-500">
          Update Phone Number
        </label>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Enter phone number"
          className="w-full p-2 border rounded mb-4"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
        {message && <p className="mt-2 text-sm">{message}</p>}
      </form>
    </div>
  );
}
