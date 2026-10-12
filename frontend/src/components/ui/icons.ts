export type IconName =
  | "arrow" | "calendar" | "check" | "clock" | "file" | "heart" | "info"
  | "menu" | "plus" | "search" | "user" | "logout" | "refresh" | "box";

// Inner SVG markup for each icon (24×24 viewBox, stroked)
export const ICON_PATHS: Record<IconName, string> = {
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5" />',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 10h18" />',
  check: '<path d="m5 12 4 4L19 6" />',
  clock: '<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />',
  file: '<path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6m-6 4h5" />',
  heart: '<path d="M20.8 5.7a5.5 5.5 0 0 0-7.8 0L12 6.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 22l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />',
  info: '<circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10h.01" />',
  menu: '<path d="M4 7h16M4 12h16M4 17h16" />',
  plus: '<path d="M12 5v14M5 12h14" />',
  search: '<circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />',
  user: '<circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" />',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3.5M4 5v4h4" /><path d="M4 13a8 8 0 0 0 14.9 3.5M20 19v-4h-4" />',
  box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="m3 7.5 9 4.5 9-4.5M12 12v9" />',
};
