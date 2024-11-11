import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
    apiKey: "AIzaSyCd8kGbOGBCYhPMmV-TmgjVglhYy05HR7w",
    authDomain: "my-apps-60a89.firebaseapp.com",
    projectId: "my-apps-60a89",
    storageBucket: "my-apps-60a89.firebasestorage.app",
    messagingSenderId: "356104198428",
    appId: "1:356104198428:web:14d60cc295514af4dd82d9",
    measurementId: "G-VHP5DTGR1W"
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);