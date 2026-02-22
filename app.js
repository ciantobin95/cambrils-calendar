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

const FAMILY_PASSCODE = "Becky"; 

// --- COLOR MAP ---
const FAMILY_COLORS = {
    "Mum & Dad": "#B8860B", // yellow
    "Cian": "#2196f3",  // Blue
    "Mark": "#008000", // Green
    "Erica": "#FF69B4",  // Pink
};

document.addEventListener('DOMContentLoaded', function() {
    
    // 1. GATEKEEPER
    let authenticated = localStorage.getItem("house_auth");
    if (authenticated !== "true") {
        const entry = prompt("Please enter the Family Passcode:");
        if (entry === FAMILY_PASSCODE) { localStorage.setItem("house_auth", "true"); } 
        else { document.body.innerHTML = `<h2 style="text-align:center; margin-top:100px;">Access Denied</h2>`; return; }
    }

    const calendarEl = document.getElementById('calendar');
    const modal = document.getElementById('nameModal');
    const familySelect = document.getElementById('familySelect');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        selectable: true,
        editable: true,
        selectLongPressDelay: 200, 
        longPressDelay: 200,
        headerToolbar: { left: 'prev,next', center: 'title', right: 'today' },
        
        select: async function(info) {
            // Check for conflict
            const existingEvents = calendar.getEvents();
            let overlapFound = false;
            let overlappingName = "";
            existingEvents.forEach(event => {
                if (info.start < event.end && info.end > event.start) {
                    overlapFound = true;
                    overlappingName = event.title;
                }
            });

            if (overlapFound) {
                if (!confirm(`CONFLICT: These dates overlap with "${overlappingName}". Proceed anyway?`)) {
                    calendar.unselect();
                    return;
                }
            }

            // SHOW MODAL instead of prompt
            modal.style.display = 'flex';

            confirmBtn.onclick = async () => {
                const selectedName = familySelect.value;
                modal.style.display = 'none';
                
                try {
                    await addDoc(bookingsRef, {
                        title: selectedName,
                        start: info.startStr,
                        end: info.endStr,
                        color: FAMILY_COLORS[selectedName] // Save the color to the database
                    });
                } catch (e) { console.error(e); }
                calendar.unselect();
            };

            cancelBtn.onclick = () => {
                modal.style.display = 'none';
                calendar.unselect();
            };
        },

        eventClick: async function(info) {
            const action = prompt(`Selected: ${info.event.title}\nType 'delete' to remove:`);
            if (action && action.toLowerCase() === 'delete') {
                if (confirm("Are you sure?")) await deleteDoc(doc(db, "bookings", info.event.id));
            }
        },

        eventDrop: async function(info) {
            const eventRef = doc(db, "bookings", info.event.id);
            await updateDoc(eventRef, { start: info.event.startStr, end: info.event.endStr });
        }
    });

    calendar.render();

    // 2. REAL-TIME SYNC (Now pulls color from Firestore)
    onSnapshot(bookingsRef, (snapshot) => {
        const eventArray = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                start: data.start,
                end: data.end,
                allDay: true,
                backgroundColor: data.color || '#2e7d32', // Use saved color or default green
                borderColor: 'white',
                textColor: 'white'
            };
        });
        calendar.removeAllEvents();
        calendar.addEventSource(eventArray);
    });
});