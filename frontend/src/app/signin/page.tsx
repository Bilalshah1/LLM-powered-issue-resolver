"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebaseConfig";




export default function Login() {
  const [email, password] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });

  }
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      const res = await signInWithEmailAndPassword(auth, form.email, form.password);
      router.push("/connect");
    } catch (err) {
      setError("Failed to sign in. Please check your credentials.");
      console.error("Sign-in error:", err);
    }
  };


  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#23272f] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#181c23] rounded-2xl shadow-xl border border-[#23272f] p-8 space-y-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white text-center mb-2">
          Sign In
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && <div className="text-red-400 text-center text-sm">{error}</div>}
          <div>
            <label className="block text-gray-200 font-medium mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg bg-[#23272f] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder=""
            />
          </div>
          <div> 
            <label className="block text-gray-200 font-medium mb-1" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg bg-[#23272f] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder=""
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 mt-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-full shadow-lg text-lg transition-all duration-200"
          >
            Sign In
          </button>
        </form>
        <div className="flex flex-col items-center gap-2 mt-6">
          <Link href="/signup" className="text-blue-400 hover:underline">Sign up</Link>
          <Link href="/" className="text-blue-400 hover:underline">Back to Home</Link>
        </div>
      </div>
    </main>
  );
} 