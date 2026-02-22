import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');

    // 1. Initialize the calendar with NO events initially
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        selectable: true,
        editable: true,
        headerToolbar: {
            left: 'prev,next',
            center: 'title',
            right: 'today'
        },
        
        // 2. CREATE: Save new booking
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

        // 3. EDIT/DELETE
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

        // 4. DRAG & DROP
        eventDrop: async function(info) {
            const eventRef = doc(db, "bookings", info.event.id);
            await updateDoc(eventRef, {
                start: info.event.startStr,
                end: info.event.endStr
            });
        }
    });

    calendar.render();

    // 5. THE REAL-TIME SYNC ENGINE
    // This sits outside the calendar config and "pushes" updates to the UI
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

        // This removes all old events and replaces them with the fresh ones from Firebase
        calendar.removeAllEvents();
        calendar.addEventSource(eventArray);
        console.log("Calendar UI updated with", eventArray.length, "bookings.");
    });
});