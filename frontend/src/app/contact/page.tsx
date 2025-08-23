"use client";
import { useState } from "react";

export default function Contact() {
    const [form, setForm] = useState({ name: "", email: "", message: "" });
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setSubmitted(false);

        // You can send the form data to your backend here
        // For now, just simulate a successful submission
        if (!form.name || !form.email || !form.message) {
            setError("Please fill in all fields.");
            return;
        }
        setSubmitted(true);
        setForm({ name: "", email: "", message: "" });
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#23272f] flex flex-col items-center justify-center px-4 py-12">
            <div className="max-w-lg w-full bg-[#181c23] rounded-2xl shadow-xl border border-[#23272f] p-8 space-y-6">
                <h1 className="text-3xl font-extrabold text-white text-center mb-2">
                    Contact Us
                </h1>
                <p className="text-gray-400 text-center mb-6">
                    Have a question or feedback? Fill out the form below and we'll get back to you!
                </p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {error && <div className="text-red-400 text-center text-sm">{error}</div>}
                    {submitted && <div className="text-green-400 text-center text-sm">Thank you! Your message has been sent.</div>}
                    <div>
                        <label className="block text-gray-200 font-medium mb-1" htmlFor="name">Name</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            value={form.name}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 rounded-lg bg-[#23272f] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Your Name"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-200 font-medium mb-1" htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 rounded-lg bg-[#23272f] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-200 font-medium mb-1" htmlFor="message">Message</label>
                        <textarea
                            id="message"
                            name="message"
                            value={form.message}
                            onChange={handleChange}
                            required
                            rows={5}
                            className="w-full px-4 py-2 rounded-lg bg-[#23272f] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Type your message here..."
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 mt-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-full shadow-lg text-lg transition-all duration-200"
                    >
                        Send Message
                    </button>
                </form>
            </div>
        </main>
    );
}