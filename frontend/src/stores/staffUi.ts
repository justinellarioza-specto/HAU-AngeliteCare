import { reactive } from "vue";

// Shared state for the staff portal: which dialog is open, and a counter that
// views watch to reload their data after something changes.
export const staffUi = reactive({
  refreshKey: 0,
  visitId: null as string | null,          // consultation / record dialog
  restockId: null as string | null,        // receive stock dialog
  patientNumber: null as string | null,    // patient profile + history dialog
  walkInOpen: false,
  vitalsOpen: false,
  createPatientOpen: false,
  createItemOpen: false,
  searchOpen: false,
  supportOpen: false,
});

export function refresh() {
  staffUi.refreshKey += 1;
}
