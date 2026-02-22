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

const FAMILY_COLORS = {
    "Mum & Dad": "#FFD93D", 
    "Cian": "#6BCBFF",      
    "Mark": "#4D96FF",      
    "Erica": "#FF6B6B",     
};

document.addEventListener('DOMContentLoaded', function() {
    
    let authenticated = localStorage.getItem("house_auth");
    if (authenticated !== "true") {
        const entry = prompt("Please enter the Family Passcode:");
        if (entry === FAMILY_PASSCODE) { 
            localStorage.setItem("house_auth", "true"); 
        } else { 
            document.body.innerHTML = `<h2 style="text-align:center; margin-top:100px; font-family:sans-serif;">Access Denied</h2>`; 
            return; 
        }
    }

    const calendarEl = document.getElementById('calendar');
    const modal = document.getElementById('nameModal');
    const familySelect = document.getElementById('familySelect');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    let pendingSelection = null;

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'multiMonthYear',
        multiMonthMaxColumns: 1, 
        showNonCurrentDates: false,
        
        // --- THE FIXES ---
        height: 'auto',         // Fixes the squished layout 
        headerToolbar: false,   // Removes the giant sticky "2026" and greyed out button
        // -----------------

        selectable: true,
        editable: false, 
        selectLongPressDelay: 200, 
        longPressDelay: 200,
        
        select: function(info) {
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
                if (!confirm(`CONFLICT: Overlaps with "${overlappingName}". Proceed anyway?`)) {
                    calendar.unselect();
                    return;
                }
            }

            pendingSelection = info;
            modal.style.display = 'flex';
        },

        eventClick: async function(info) {
            const confirmDelete = confirm(`Would you like to delete the booking for "${info.event.title}"?`);
            if (confirmDelete) {
                const eventRef = doc(db, "bookings", info.event.id);
                try {
                    await deleteDoc(eventRef);
                } catch (e) {
                    console.error("Error deleting:", e);
                }
            }
        }
    });

    calendar.render();

    // CUSTOM TODAY BUTTON LOGIC
    const todayBtn = document.getElementById('customTodayBtn');
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            const todayElement = document.querySelector('.fc-day-today');
            if (todayElement) {
                // Smoothly scroll the today square into the center of the screen
                todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    confirmBtn.onclick = async () => {
        if (!pendingSelection) return;
        const selectedName = familySelect.value;
        const color = FAMILY_COLORS[selectedName] || "#2e7d32";
        modal.style.display = 'none';
        try {
            await addDoc(bookingsRef, {
                title: selectedName,
                start: pendingSelection.startStr,
                end: pendingSelection.endStr,
                color: color
            });
        } catch (e) { console.error(e); }
        pendingSelection = null;
        calendar.unselect();
    };

    cancelBtn.onclick = () => {
        modal.style.display = 'none';
        pendingSelection = null;
        calendar.unselect();
    };

    onSnapshot(bookingsRef, (snapshot) => {
        const eventArray = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                start: data.start,
                end: data.end,
                allDay: true,
                backgroundColor: data.color || '#2e7d32',
                borderColor: 'white',
                textColor: 'white'
            };
        });
        calendar.removeAllEvents();
        calendar.addEventSource(eventArray);
    });
});