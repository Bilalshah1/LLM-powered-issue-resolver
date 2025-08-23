"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebaseConfig";












export default function Signup() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [step, setStep] = useState<"signup" | "verify" | "success">("signup");
  const [codeSent, setCodeSent] = useState(false); // not used in Firebase UI, just logic
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await sendEmailVerification(userCredential.user);
      setStep("verify");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        setStep("success");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#23272f] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#181c23] rounded-2xl shadow-xl border border-[#23272f] p-8 space-y-6">
        {step === "signup" && (
          <>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white text-center mb-2">
              Create your Account
            </h1>
            <form onSubmit={handleSignup} className="flex flex-col gap-5">
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
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 mt-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-full shadow-lg text-lg transition-all duration-200"
              >
                Sign Up
              </button>
            </form>
            <div className="flex items-center my-4">
              <div className="flex-grow h-px bg-gray-700" />
              <span className="mx-3 text-gray-400 text-sm">or</span>
              <div className="flex-grow h-px bg-gray-700" />
            </div>
            <button
              type="button"
              onClick={handleGoogleSignup}
              aria-label="Sign up with Google"
              className="w-full flex items-center justify-center gap-3 py-2 mb-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold rounded-full shadow-sm text-base transition-all duration-200 hover:scale-[1.03] hover:shadow-md active:scale-100"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_17_40)">
                  <path d="M23.766 12.276c0-.818-.074-1.604-.213-2.356H12.24v4.451h6.48a5.537 5.537 0 0 1-2.4 3.637v3.017h3.877c2.27-2.09 3.569-5.17 3.569-8.749z" fill="#4285F4" />
                  <path d="M12.24 24c3.24 0 5.963-1.07 7.95-2.91l-3.877-3.017c-1.08.726-2.457 1.16-4.073 1.16-3.13 0-5.78-2.11-6.73-4.946H1.53v3.09A11.997 11.997 0 0 0 12.24 24z" fill="#34A853" />
                  <path d="M5.51 14.287a7.19 7.19 0 0 1 0-4.574V6.623H1.53a12.002 12.002 0 0 0 0 10.754l3.98-3.09z" fill="#FBBC05" />
                  <path d="M12.24 4.771c1.765 0 3.34.607 4.583 1.797l3.428-3.428C18.2 1.07 15.477 0 12.24 0A11.997 11.997 0 0 0 1.53 6.623l3.98 3.09c.95-2.836 3.6-4.946 6.73-4.946z" fill="#EA4335" />
                </g>
                <defs>
                  <clipPath id="clip0_17_40">
                    <rect width="24" height="24" fill="white" />
                  </clipPath>
                </defs>
              </svg>
              {/* <span>Sign Up with Google</span> */}
            </button>
            <div className="text-center mt-4">
              <Link href="/" className="text-blue-400 hover:underline">Back to Home</Link>
            </div>
          </>
        )}
        {step === "verify" && (
          <div className="text-blue-300 text-center py-6">
            A verification email has been sent. Please check your inbox.
            <div className="mt-6">
              <button
                onClick={() => router.push("/connect")}
                className="text-blue-400 hover:underline"
              >
                Go to Sign In
              </button>
            </div>
          </div>
        )}
        {step === "success" && (
          <div className="text-green-400 text-center text-lg font-semibold py-8">
            🎉 Signed up successfully using Google!
            <div className="mt-6">
              <Link href="/signin" className="text-blue-400 hover:underline">Go to Sign In</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}










// "use client";

// import { useState } from "react";
// import Link from "next/link";
// import { useSignUp } from "@clerk/nextjs";
// import { useRouter } from "next/navigation";

// export default function Signup() {
//   const [form, setForm] = useState({ email: "", password: "" });
//   const [error, setError] = useState("");
//   const [step, setStep] = useState<"signup" | "verify" | "success">("signup");
//   const [code, setCode] = useState("");
//   const { signUp, isLoaded } = useSignUp();
//   const router = useRouter();

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   const handleSignup = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError("");
//     if (!isLoaded) return;
//     try {
//       await signUp.create({
//         emailAddress: form.email,
//         password: form.password,
//       });
//       await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
//       setStep("verify");
//     } catch (err: any) {
//       setError(err.errors?.[0]?.message || "Signup failed. Please try again.");
//     }
//   };

//   const handleGoogleSignup = async () => {
//     setError("");
//     if (!isLoaded) return;
//     try {
//       await signUp.authenticateWithRedirect({
//         strategy: "oauth_google",
//         redirectUrl: "/verify",
//         redirectUrlComplete: "/verify",
//       });
//     } catch (err: any) {
//       setError("Google sign up failed. Please try again.");
//     }
//   };

//   const handleVerify = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError("");
//     if (!isLoaded) return;
//     try {
//       const res = await signUp.attemptEmailAddressVerification({ code });
//       if (res.status === "complete") {
//         setStep("success");
//         // Optionally, you can redirect to sign-in after a delay
//         // setTimeout(() => router.push("/signin"), 2000);
//       } else {
//         setError("Verification failed. Please try again.");
//       }
//     } catch (err: any) {
//       setError(err.errors?.[0]?.message || "Verification failed. Please try again.");
//     }
//   };

//   return (
//     <main className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#23272f] flex flex-col items-center justify-center px-4 py-12">
//       <div className="max-w-md w-full bg-[#181c23] rounded-2xl shadow-xl border border-[#23272f] p-8 space-y-6">
//         {step === "signup" && (
//           <>
//             <h1 className="text-2xl md:text-3xl font-extrabold text-white text-center mb-2">
//               Create your Account
//             </h1>
//             <form onSubmit={handleSignup} className="flex flex-col gap-5">
//               {error && <div className="text-red-400 text-center text-sm">{error}</div>}
//               <div>
//                 <label className="block text-gray-200 font-medium mb-1" htmlFor="email">Email</label>
//                 <input
//                   id="email"
//                   type="email"
//                   name="email"
//                   value={form.email}
//                   onChange={handleChange}
//                   required
//                   className="w-full px-4 py-2 rounded-lg bg-[#23272f] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   placeholder=""
//                 />
//               </div>
//               <div>
//                 <label className="block text-gray-200 font-medium mb-1" htmlFor="password">Password</label>
//                 <input
//                   id="password"
//                   type="password"
//                   name="password"
//                   value={form.password}
//                   onChange={handleChange}
//                   required
//                   className="w-full px-4 py-2 rounded-lg bg-[#23272f] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
//                   placeholder=""
//                 />
//               </div>
//               <button
//                 type="submit"
//                 className="w-full py-3 mt-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-full shadow-lg text-lg transition-all duration-200"
//               >
//                 Sign Up
//               </button>
//             </form>
//             <div className="flex items-center my-4">
//               <div className="flex-grow h-px bg-gray-700" />
//               <span className="mx-3 text-gray-400 text-sm">or</span>
//               <div className="flex-grow h-px bg-gray-700" />
//             </div>
//             <button
//               type="button"
//               onClick={handleGoogleSignup}
//               aria-label="Sign up with Google"
//               className="w-full flex items-center justify-center gap-3 py-2 mb-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold rounded-full shadow-sm text-base transition-all duration-200 hover:scale-[1.03] hover:shadow-md active:scale-100"
//             >
//               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//                 <g clipPath="url(#clip0_17_40)">
//                   <path d="M23.766 12.276c0-.818-.074-1.604-.213-2.356H12.24v4.451h6.48a5.537 5.537 0 0 1-2.4 3.637v3.017h3.877c2.27-2.09 3.569-5.17 3.569-8.749z" fill="#4285F4"/>
//                   <path d="M12.24 24c3.24 0 5.963-1.07 7.95-2.91l-3.877-3.017c-1.08.726-2.457 1.16-4.073 1.16-3.13 0-5.78-2.11-6.73-4.946H1.53v3.09A11.997 11.997 0 0 0 12.24 24z" fill="#34A853"/>
//                   <path d="M5.51 14.287a7.19 7.19 0 0 1 0-4.574V6.623H1.53a12.002 12.002 0 0 0 0 10.754l3.98-3.09z" fill="#FBBC05"/>
//                   <path d="M12.24 4.771c1.765 0 3.34.607 4.583 1.797l3.428-3.428C18.2 1.07 15.477 0 12.24 0A11.997 11.997 0 0 0 1.53 6.623l3.98 3.09c.95-2.836 3.6-4.946 6.73-4.946z" fill="#EA4335"/>
//                 </g>
//                 <defs>
//                   <clipPath id="clip0_17_40">
//                     <rect width="24" height="24" fill="white"/>
//                   </clipPath>
//                 </defs>
//               </svg>
//               {/* <span>Sign Up with Google</span> */}
//             </button>
//             <div className="text-center mt-4">
//               <Link href="/" className="text-blue-400 hover:underline">Back to Home</Link>
//             </div>
//           </>
//         )}
//         {step === "verify" && (
//           <>
//             <h1 className="text-2xl md:text-3xl font-extrabold text-white text-center mb-2">
//               Verify your Email
//             </h1>
//             <form onSubmit={handleVerify} className="flex flex-col gap-5">
//               <div className="text-blue-300 text-center text-base">A verification code has been sent to your email.</div>
//               {error && <div className="text-red-400 text-center text-sm">{error}</div>}
//               <div>
//                 <label className="block text-gray-200 font-medium mb-1" htmlFor="code">Verification Code</label>
//                 <input
//                   id="code"
//                   type="text"
//                   name="code"
//                   value={code}
//                   onChange={e => setCode(e.target.value)}
//                   required
//                   className="w-full px-4 py-2 rounded-lg bg-[#23272f] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   placeholder="Enter code"
//                 />
//               </div>
//               <button
//                 type="submit"
//                 className="w-full py-3 mt-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-full shadow-lg text-lg transition-all duration-200"
//               >
//                 Verify Email
//               </button>
//             </form>
//             <div className="text-center mt-4">
//               <Link href="/" className="text-blue-400 hover:underline">Back to Home</Link>
//             </div>
//           </>
//         )}
//         {step === "success" && (
//           <div className="text-green-400 text-center text-lg font-semibold py-8">
//             🎉 Your account has been created and verified!<br />You can now sign in.
//             <div className="mt-6">
//               <Link href="/signin" className="text-blue-400 hover:underline">Go to Sign In</Link>
//             </div>
//           </div>
//         )}
//       </div>
//     </main>
//   );
// }


