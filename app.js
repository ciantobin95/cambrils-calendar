import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCbnDtx47cXLFYmHtN_rG1McLWItIS_Vrk",
  authDomain: "cambrils-calendar.firebaseapp.com",
  projectId: "cambrils-calendar",
  storageBucket: "cambrils-calendar.firebasestorage.app",
  messagingSenderId: "20334837629",
  appId: "1:20334837629:web:08992865bfd9042d98d614",
  measurementId: "G-QLMW5KEDPK"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const bookingsRef = collection(db, "bookings");

// 2. The Secret Password
const FAMILY_PASSCODE = "Becky"; 

document.addEventListener('DOMContentLoaded', function() {
    
    // --- GATEKEEPER START ---
    // This checks if the phone "remembers" the password
    let authenticated = localStorage.getItem("house_auth");

    if (authenticated !== "true") {
        const entry = prompt("Please enter the Family Passcode:");
        
        if (entry === FAMILY_PASSCODE) {
            localStorage.setItem("house_auth", "true");
        } else {
            // If they fail, we replace the screen with a message and STOP
            document.body.innerHTML = `
                <div style="text-align:center; margin-top:100px; font-family:sans-serif;">
                    <h2>Access Denied</h2>
                    <p>Incorrect passcode. Refresh to try again.</p>
                </div>`;
            return; // This is the 'kill switch' that prevents crashes
        }
    }
    // --- GATEKEEPER END ---

    const calendarEl = document.getElementById('calendar');

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        selectable: true,
        editable: true,
        selectLongPressDelay: 200, 
        longPressDelay: 200,
        headerToolbar: {
            left: 'prev,next',
            center: 'title',
            right: 'today'
        },
        
        // 3. CREATE: Save new booking
        select: async function(info) {
            const name = prompt("Who is booking the house?");
            if (name && name.trim() !== "") {
                try {
                    await addDoc(bookingsRef, {
                        title: name,
                        start: info.startStr,
                        end: info.endStr
                    });
                } catch (e) {
                    console.error("Error adding document: ", e);
                }
            }
            calendar.unselect();
        },

        // 4. EDIT/DELETE
        eventClick: async function(info) {
            const action = prompt(`Selected: ${info.event.title}\nType 'delete' to remove or enter a new name to edit:`);
            if (action === null) return; 

            const eventRef = doc(db, "bookings", info.event.id);
            if (action.toLowerCase() === 'delete') {
                if (confirm("Are you sure?")) await deleteDoc(eventRef);
            } else if (action.trim() !== "") {
                await updateDoc(eventRef, { title: action });
            }
        },

        // 5. DRAG & DROP
        eventDrop: async function(info) {
            const eventRef = doc(db, "bookings", info.event.id);
            await updateDoc(eventRef, {
                start: info.event.startStr,
                end: info.event.endStr
            });
        }
    });

    calendar.render();

    // 6. REAL-TIME SYNC
    onSnapshot(bookingsRef, (snapshot) => {
        const eventArray = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            eventArray.push({
                id: doc.id,
                title: data.title,
                start: data.start,
                end: data.end,
                allDay: true,
                backgroundColor: '#2e7d32',
                borderColor: '#1b5e20'
            });
        });
        calendar.removeAllEvents();
        calendar.addEventSource(eventArray);
    });
});