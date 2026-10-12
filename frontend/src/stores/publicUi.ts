import { reactive } from "vue";

// Lets the header / footer open dialogs that live elsewhere in the app
export const publicUi = reactive({
  requestSignal: 0, // bumped by "Request a Visit" in the header → HomeView opens the request dialog
  hoursOpen: false,
  accessOpen: false,
  loginPortal: null as null | "staff" | "developer",
  loginRedirect: null as string | null,
});
