import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCbnDtx47cXLFYmHtN_rG1McLWItIS_Vrk",
  authDomain: "cambrils-calendar.firebaseapp.com",
  projectId: "cambrils-calendar",
  storageBucket: "cambrils-calendar.firebasestorage.app",
  messagingSenderId: "20334837629",
  appId: "1:20334837629:web:08992865bfd9042d98d614",
  measurementId: "G-QLMW5KEDPK"
};

// 2. Initialize
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const bookingsRef = collection(db, "bookings");

// 3. Set Passcode
const FAMILY_PASSCODE = "Cambrils2024"; 

document.addEventListener('DOMContentLoaded', function() {
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
        
        // --- PROTECTED SELECT ---
        select: async function(info) {
            const secret = prompt("Enter the Family Passcode to book:");
            if (secret !== FAMILY_PASSCODE) {
                alert("Incorrect passcode!");
                calendar.unselect();
                return;
            }

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

        // --- PROTECTED EDIT/DELETE ---
        eventClick: async function(info) {
            const secret = prompt("Enter passcode to edit or delete:");
            if (secret !== FAMILY_PASSCODE) {
                alert("Incorrect passcode!");
                return;
            }

            const action = prompt(`Selected: ${info.event.title}\nType 'delete' to remove or enter a new name to edit:`);
            if (action === null) return; 

            const eventRef = doc(db, "bookings", info.event.id);
            if (action.toLowerCase() === 'delete') {
                if (confirm("Are you sure?")) await deleteDoc(eventRef);
            } else if (action.trim() !== "") {
                await updateDoc(eventRef, { title: action });
            }
        },

        // --- PROTECTED DRAG & DROP ---
        eventDrop: async function(info) {
            const secret = prompt("Enter passcode to move booking:");
            if (secret !== FAMILY_PASSCODE) {
                alert("Incorrect passcode!");
                info.revert(); 
                return;
            }

            const eventRef = doc(db, "bookings", info.event.id);
            await updateDoc(eventRef, {
                start: info.event.startStr,
                end: info.event.endStr
            });
        }
    });

    calendar.render();

    // 4. REAL-TIME SYNC
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