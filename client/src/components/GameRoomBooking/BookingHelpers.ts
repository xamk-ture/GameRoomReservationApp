import { BookingStatus } from "../../api";

export const getStatusColor = (status: string) => {
  if (status === BookingStatus.ONGOING) return "orange";
  if (status === BookingStatus.COMPLETED) return "gray";
  if (status === BookingStatus.CANCELLED) return "red";
  return BookingStatus.UPCOMING;
};

// Note: This function is used in Calendar component which doesn't have access to useTranslation
// The tooltip text is handled by the component that uses this function
export const getStatusTooltip = (status: string, t?: (key: string) => string) => {
  if (!t) {
    // Fallback to English if translation not available
    if (status === BookingStatus.ONGOING) return "Ongoing";
    if (status === BookingStatus.COMPLETED) return "Past";
    if (status === BookingStatus.CANCELLED) return "Cancelled";
    return BookingStatus.UPCOMING;
  }
  
  if (status === BookingStatus.ONGOING) return t("bookings.statusOngoing");
  if (status === BookingStatus.COMPLETED) return t("bookings.statusPast");
  if (status === BookingStatus.CANCELLED) return t("bookings.statusCancelled");
  return t("bookings.upcoming");
};
