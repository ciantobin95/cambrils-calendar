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

// --- NEW MODAL SYSTEM ---
const Modal = {
    overlay: document.getElementById('systemModal'),
    title: document.getElementById('sysModalTitle'),
    message: document.getElementById('sysModalMessage'),
    input: document.getElementById('sysInput'),
    confirmBtn: document.getElementById('sysConfirmBtn'),
    cancelBtn: document.getElementById('sysCancelBtn'),

    show(type, titleText, messageText, confirmText = "OK", isDanger = false) {
        return new Promise((resolve) => {
            // 1. Setup Content
            this.title.innerText = titleText;
            this.message.innerText = messageText;
            this.confirmBtn.innerText = confirmText;
            
            // 2. Setup Type (Password vs Alert)
            if (type === 'password') {
                this.input.style.display = 'block';
                this.input.value = '';
                this.input.focus();
            } else {
                this.input.style.display = 'none';
            }

            // 3. Setup Style (Danger vs Normal)
            if (isDanger) {
                this.confirmBtn.classList.add('btn-danger');
                this.confirmBtn.classList.remove('btn-confirm');
            } else {
                this.confirmBtn.classList.add('btn-confirm');
                this.confirmBtn.classList.remove('btn-danger');
            }

            // 4. Handle Buttons
            const handleConfirm = () => {
                cleanup();
                if (type === 'password') resolve(this.input.value);
                else resolve(true);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                this.overlay.style.display = 'none';
                this.confirmBtn.onclick = null;
                this.cancelBtn.onclick = null;
            };

            this.confirmBtn.onclick = handleConfirm;
            this.cancelBtn.onclick = handleCancel;

            // 5. Show
            this.overlay.style.display = 'flex';
        });
    }
};

document.addEventListener('DOMContentLoaded', async function() {
    
    // 1. GATEKEEPER (Now using Custom Modal)
    let authenticated = localStorage.getItem("house_auth");
    
    if (authenticated !== "true") {
        const entry = await Modal.show('password', 'Welcome Home', 'Please enter the Family Passcode:', 'Unlock');
        
        if (entry === FAMILY_PASSCODE) { 
            localStorage.setItem("house_auth", "true"); 
        } else { 
            document.body.innerHTML = `
                <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#f0f4f8; flex-direction:column;">
                    <h2 style="font-family:'Inter'; color:#c62828;">Access Denied</h2>
                    <button onclick="location.reload()" style="padding:10px 20px; margin-top:20px; border-radius:10px; border:none; background:#ccc; font-size:16px;">Try Again</button>
                </div>`; 
            return; 
        }
    }

    const calendarEl = document.getElementById('calendar');
    const nameModal = document.getElementById('nameModal'); // Existing Name Picker
    const familySelect = document.getElementById('familySelect');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    let pendingSelection = null;

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'multiMonthYear',
        multiMonthMaxColumns: 1, 
        showNonCurrentDates: false,
        height: 'auto',         
        headerToolbar: false,   

        selectable: true,
        editable: false, 
        selectLongPressDelay: 200, 
        longPressDelay: 200,
        
        select: async function(info) {
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
                // REPLACED standard confirm with Modal
                const proceed = await Modal.show(
                    'confirm', 
                    'Double Booking!', 
                    `This overlaps with ${overlappingName}. Do you want to proceed anyway?`, 
                    'Book Anyway', 
                    true // shows red/danger button
                );
                
                if (!proceed) {
                    calendar.unselect();
                    return;
                }
            }

            pendingSelection = info;
            nameModal.style.display = 'flex';
        },

        eventClick: async function(info) {
            // REPLACED standard confirm with Modal
            const confirmDelete = await Modal.show(
                'confirm', 
                'Delete Booking?', 
                `Are you sure you want to delete the booking for "${info.event.title}"?`, 
                'Yes, Delete', 
                true
            );

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
                todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    confirmBtn.onclick = async () => {
        if (!pendingSelection) return;
        const selectedName = familySelect.value;
        const color = FAMILY_COLORS[selectedName] || "#2e7d32";
        nameModal.style.display = 'none';
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
        nameModal.style.display = 'none';
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