import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAGgDstb_F_xXKCrJYAWFewWjWwCiLW90s",
  authDomain: "saas-project-8e6a7.firebaseapp.com",
  projectId: "saas-project-8e6a7",
  storageBucket: "saas-project-8e6a7.appspot.com",
  messagingSenderId: "732966717872",
  appId: "1:732966717872:web:44e9b2cdd05323afabae75",
  measurementId: "G-0B004SZKTV"
};

// Always initialize app (only once)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Analytics: only on client and only if supported
let analytics: ReturnType<typeof getAnalytics> | undefined = undefined;
if (typeof window !== "undefined") {
  isSupported().then((yes) => {
    if (yes) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, googleProvider, analytics };