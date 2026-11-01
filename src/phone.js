// Phone layout model (issue #2, T5). Under 600px: list with a segmented
// control, full-screen task with three tabs, approval sheet. No bottom tab bar.
export const PHONE_BREAKPOINT = 600;
export const SEGMENTS = ["Needs you", "Running", "Done"];
export const PHONE_TABS = ["Steps", "Changes", "Outcome"];
export const SHEET_ACTIONS = ["Approve plan", "Request changes"];
export const hasBottomTabBar = (_width) => false;
export const isPhone = (width) => width < PHONE_BREAKPOINT;
