import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/fi";
import "dayjs/locale/en";

dayjs.extend(utc);
import { RoomBookingDto, DeviceDto, BookingStatus } from "../../api";
import { useTranslation } from "react-i18next";
import { OpenAPI } from "../../api/core/OpenAPI";

interface DeviceAvailability {
  deviceId: number;
  deviceName: string;
  totalQuantity: number;
  availableQuantity: number;
  nextAvailableTime?: string; // ISO string of when the device becomes available next
}

export enum ModalMode {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
}

import { PlayerDto } from "../../api";

export interface BookingFormProps {
  mode: ModalMode;
  booking: RoomBookingDto;
  allDevices: DeviceDto[];
  selectedBooking: RoomBookingDto | null;
  allBookings?: RoomBookingDto[]; // Optional: all bookings for availability calculation
  players?: PlayerDto[]; // Optional: list of players for admin selection
  onBookingDateTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDurationChange: (e: { target: { value: number } }) => void;
  onPlayingAloneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFellowsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeviceChange: (deviceId: number, checked: boolean) => void;
  onPlayerChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; // Optional: handler for player selection
  onSubmit: () => void;
  onCancel: () => void;
  checkFieldsValidation: () => boolean;
  onCancelBooking: () => Promise<void>;
  onDeleteBooking: () => Promise<void>;
  onFieldChange: () => boolean;
  onUpdateBooking: () => Promise<void>;
}

const BookingForm = (props: BookingFormProps) => {
  const { t, i18n } = useTranslation();
  const {
    mode,
    booking,
    allDevices,
    selectedBooking,
    allBookings: propsAllBookings,
    players,
    onBookingDateTimeChange,
    onDurationChange,
    onPlayingAloneChange,
    onFellowsChange,
    onDeviceChange,
    onPlayerChange,
    onSubmit,
    onCancel,
    checkFieldsValidation,
    onCancelBooking,
    onDeleteBooking,
    onFieldChange,
    onUpdateBooking,
  } = props;

  const isCancelled = booking.status === BookingStatus.CANCELLED;
  const isCompleted = booking.status === BookingStatus.COMPLETED;
  const isDisabled = isCancelled || isCompleted;

  const currentDevices = mode === ModalMode.CREATE ? booking.devices ?? [] : selectedBooking?.devices ?? [];
  const deviceIds = currentDevices.map(device => device.id!).filter(Boolean) as number[];

  // State for all bookings (to calculate availability)
  const [fetchedAllBookings, setFetchedAllBookings] = useState<RoomBookingDto[]>([]);

  // Fetch all bookings when component mounts or when booking date/time changes
  // Always fetch from API to get all bookings (not just user's own)
  useEffect(() => {
    const fetchAllBookings = async () => {
      if (isDisabled || !booking.bookingDateTime || !booking.duration) {
        setFetchedAllBookings([]);
        return;
      }

      // Always fetch from API to ensure we have all bookings for accurate availability calculation
      try {
        const base = (OpenAPI as any).BASE || "";
        const headers = { ...(OpenAPI as any).HEADERS } as Record<string, string>;
        const response = await fetch(`${base}/api/gameroombookings/bookings-for-availability`, { headers });

        if (response.ok) {
          const bookings = await response.json();
          setFetchedAllBookings(Array.isArray(bookings) ? bookings : []);
        } else {
          // Fallback to props bookings if API fails
          setFetchedAllBookings(propsAllBookings || []);
        }
      } catch (error) {
        // Fallback to props bookings if API fails
        setFetchedAllBookings(propsAllBookings || []);
      }
    };

    const timeoutId = setTimeout(fetchAllBookings, 300);
    return () => clearTimeout(timeoutId);
  }, [booking.bookingDateTime, booking.duration, isDisabled, propsAllBookings]);

  // Use fetched bookings (preferred) or fallback to props bookings
  const allBookings = fetchedAllBookings.length > 0 ? fetchedAllBookings : (propsAllBookings || []);

  // Calculate device availability based on bookings
  const availabilityMap = useMemo(() => {
    const map = new Map<number, DeviceAvailability>();

    if (!booking.bookingDateTime || !booking.duration) {
      return map;
    }

    // Normalize the selected time for consistent comparison
    // booking.bookingDateTime can be a string from DateTimePicker (local time) or a Date object
    // DateTimePicker returns "YYYY-MM-DDTHH:mm" format in local time
    const startTime = dayjs(booking.bookingDateTime);
    const endTime = startTime.add(booking.duration, 'hour');

    // Filter out cancelled bookings and the current booking being edited (if in update mode)
    const activeBookings = allBookings.filter(
      bookingItem => {
        if (bookingItem.status === BookingStatus.CANCELLED || !bookingItem.bookingDateTime) return false;
        // Exclude the current booking from availability check if we're updating it
        if (mode === ModalMode.UPDATE && selectedBooking && bookingItem.id === selectedBooking.id) {
          return false;
        }
        return true;
      }
    );

    // Calculate availability for each device
    allDevices.forEach(device => {
      if (!device.id) return;

      const totalQuantity = device.quantity ?? 0;

      // Count how many of this device are booked during the requested time
      let bookedCount = 0;
      activeBookings.forEach(bookingItem => {
        if (!bookingItem.bookingDateTime) return;

        // Normalize booking time - server returns ISO strings which may include timezone
        // If it's a string without timezone, treat it as local time
        const bookingStart = dayjs(bookingItem.bookingDateTime);
        const bookingEnd = bookingStart.add(bookingItem.duration ?? 0, 'hour');

        // Check if booking overlaps with requested time
        // Overlap: bookingStart < endTime AND bookingEnd > startTime
        const overlaps = bookingStart.isBefore(endTime) && bookingEnd.isAfter(startTime);

        if (overlaps && bookingItem.devices) {
          // Check if this booking uses the device
          const usesDevice = bookingItem.devices.some(deviceInBooking => deviceInBooking.id === device.id);
          if (usesDevice) {
            bookedCount++;
          }
        }
      });

      const availableQuantity = Math.max(0, totalQuantity - bookedCount);

      // If device is fully booked, find when it becomes available next
      let nextAvailableTime: string | undefined;
      if (availableQuantity === 0) {
        // Find all bookings that use this device and overlap with requested time
        const overlappingBookings = activeBookings
          .filter(bookingItem => {
            if (!bookingItem.bookingDateTime) return false;
            const bookingStart = dayjs(bookingItem.bookingDateTime);
            const bookingEnd = bookingStart.add(bookingItem.duration ?? 0, 'hour');
            const overlaps = bookingStart.isBefore(endTime) && bookingEnd.isAfter(startTime);
            return overlaps && bookingItem.devices?.some(deviceInBooking => deviceInBooking.id === device.id);
          })
          .map(bookingItem => {
            const bookingStart = dayjs(bookingItem.bookingDateTime);
            return bookingStart.add(bookingItem.duration ?? 0, 'hour');
          });

        // Find the earliest end time (when device becomes available)
        if (overlappingBookings.length > 0) {
          const earliestEnd = overlappingBookings.reduce((earliest, current) =>
            current.isBefore(earliest) ? current : earliest
          );
          nextAvailableTime = earliestEnd.toISOString();
        }
      }

      map.set(device.id, {
        deviceId: device.id,
        deviceName: device.name ?? `Device ${device.id}`,
        totalQuantity: totalQuantity,
        availableQuantity: availableQuantity,
        nextAvailableTime
      });
    });

    return map;
  }, [allDevices, allBookings, booking.bookingDateTime, booking.duration, mode, selectedBooking]);

  // Check if device is fully booked (availableQuantity === 0)
  const isDeviceFullyBooked = (deviceId: number): boolean => {
    const availability = availabilityMap.get(deviceId);
    if (!availability) return false; // If we don't have data, don't block
    return availability.availableQuantity === 0;
  };

  // Get dayjs locale based on i18n language
  const dayjsLocale = i18n.language === "en" ? "en" : "fi";

  return (
    <>
      <DialogContent>
        {players && players.length > 0 && (
          <FormControl fullWidth margin="dense">
            <InputLabel>{t("admin.bookings.player")}</InputLabel>
            <Select
              value={booking.playerId || ""}
              label={t("admin.bookings.player")}
              onChange={(e) => onPlayerChange && onPlayerChange({ target: { value: e.target.value } } as any)}
              disabled={isDisabled}
            >
              {players.map((player) => (
                <MenuItem key={player.id} value={player.id}>
                  {player.email ? player.email.split("@")[0] : `Player ${player.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={dayjsLocale}>
          <DateTimePicker
            label={t("admin.bookings.start")}
            value={booking.bookingDateTime ? dayjs(booking.bookingDateTime) : null}
            onChange={(newValue) => {
              if (newValue) {
                // Create a synthetic event similar to TextField's onChange
                const syntheticEvent = {
                  target: {
                    value: newValue.format("YYYY-MM-DDTHH:mm"),
                  },
                } as React.ChangeEvent<HTMLInputElement>;
                onBookingDateTimeChange(syntheticEvent);
              }
            }}
            disabled={isDisabled}
            slotProps={{
              textField: {
                fullWidth: true,
                margin: "dense" as const,
              },
            }}
            format={i18n.language === "en" ? "MM/DD/YYYY hh:mm A" : "DD.MM.YYYY HH:mm"}
          />
        </LocalizationProvider>

        <FormControl fullWidth margin="dense">
          <InputLabel>{t("admin.bookings.durationHours")}</InputLabel>
          <Select
            value={booking.duration || 1}
            label={t("admin.bookings.durationHours")}
            onChange={(e) => onDurationChange({ target: { value: Number(e.target.value) } })}
            disabled={isDisabled}
          >
            <MenuItem value={0.5}>0.5</MenuItem>
            <MenuItem value={1}>1</MenuItem>
            <MenuItem value={1.5}>1.5</MenuItem>
            <MenuItem value={2}>2</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Checkbox
              checked={booking.isPlayingAlone ?? true}
              onChange={onPlayingAloneChange}
              disabled={isDisabled}
            />
          }
          label={t("admin.bookings.playingAlone")}
        />

        <TextField
          fullWidth
          margin="dense"
          type="number"
          label={t("admin.bookings.fellows")}
          value={booking.fellows ?? (booking.isPlayingAlone ? 0 : 1)}
          onChange={onFellowsChange}
          disabled={booking.isPlayingAlone || isDisabled}
          inputProps={{ min: 1 }}
        />

        <FormControl fullWidth margin="dense">
          <InputLabel>{t("admin.bookings.devices")}</InputLabel>
          <Select
            value={deviceIds.length > 0 ? deviceIds[0] : ""}
            label={t("admin.bookings.devices")}
            onChange={(e) => {
              const newId = Number(e.target.value);
              const prevId = deviceIds.length > 0 ? deviceIds[0] : undefined;
              if (prevId && prevId !== newId) {
                onDeviceChange(prevId, false);
              }
              if (!isNaN(newId)) {
                onDeviceChange(newId, true);
              }
            }}
            disabled={isDisabled}
          >
            {allDevices.map((device) => {
              const availability = availabilityMap.get(device.id!);
              const fullyBooked = isDeviceFullyBooked(device.id!);
              // Show availability if we have valid datetime and duration
              const hasValidDateTime = booking.bookingDateTime && booking.duration;
              const showAvailability = hasValidDateTime && availability !== undefined;

              return (
                <MenuItem key={device.id} value={device.id} title={device.description || ""} disabled={fullyBooked}>
                  <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{device.name || `#${device.id}`}</span>
                      {showAvailability && (
                        <Typography
                          variant="caption"
                          sx={{
                            ml: 1,
                            color: availability
                              ? (fullyBooked ? "error.main" : availability.availableQuantity > 0 ? "success.main" : "warning.main")
                              : "text.secondary",
                            fontWeight: "medium"
                          }}
                        >
                          {availability
                            ? (fullyBooked && availability.nextAvailableTime
                              ? t("bookings.deviceNextAvailable", {
                                time: dayjs(availability.nextAvailableTime).format(i18n.language === "en" ? "h:mm A" : "HH.mm"),
                                date: dayjs(availability.nextAvailableTime).format("DD.MM.YYYY")
                              })
                              : t("bookings.deviceAvailable", { available: availability.availableQuantity, total: availability.totalQuantity }))
                            : `${device.quantity ?? 0}/${device.quantity ?? 0}`}
                        </Typography>
                      )}
                    </Box>
                    {device.description && (
                      <Typography variant="caption" color="text.secondary">
                        {device.description}
                      </Typography>
                    )}
                  </Box>
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        {mode === ModalMode.UPDATE ? (
          isCancelled || isCompleted ? (
            <Button variant="contained" color="error" onClick={onDeleteBooking}>
              {t("bookings.deleteBooking")}
            </Button>
          ) : (
            <>
              <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <Button variant="contained" color="error" onClick={onCancelBooking}>
                  {t("bookings.cancelBooking")}
                </Button>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button onClick={onCancel}>{t("common.cancel")}</Button>
                  <Button
                    variant="contained"
                    onClick={onUpdateBooking}
                    disabled={mode === ModalMode.UPDATE && !onFieldChange()}
                    sx={{
                      backgroundColor: "#ffaa00",
                      color: "#000",
                      fontWeight: 600,
                      boxShadow: "0 4px 15px rgba(255, 170, 0, 0.4), 0 0 20px rgba(255, 170, 0, 0.2)",
                      "&:hover": {
                        backgroundColor: "#e69900",
                        boxShadow: "0 6px 20px rgba(255, 170, 0, 0.5), 0 0 25px rgba(255, 170, 0, 0.3)",
                        transform: "translateY(-1px)",
                      },
                      "&:active": {
                        transform: "translateY(0)",
                      },
                      "&:disabled": {
                        backgroundColor: "#ccc",
                        color: "#666",
                        boxShadow: "none",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    {t("common.save")}
                  </Button>
                </Box>
              </Box>
            </>
          )
        ) : (
          <>
            <Button onClick={onCancel}>{t("common.cancel")}</Button>
            <Button
              variant="contained"
              onClick={onSubmit}
              disabled={!checkFieldsValidation()}
              sx={{
                backgroundColor: "#FFC107",
                color: "#000",
                fontWeight: 600,
                boxShadow: "0 4px 15px rgba(255, 193, 7, 0.4), 0 0 20px rgba(255, 193, 7, 0.2)",
                "&:hover": {
                  backgroundColor: "#FFB300",
                  boxShadow: "0 6px 20px rgba(255, 193, 7, 0.5), 0 0 25px rgba(255, 193, 7, 0.3)",
                  transform: "translateY(-1px)",
                },
                "&:active": {
                  transform: "translateY(0)",
                },
                "&:disabled": {
                  backgroundColor: "#ccc",
                  color: "#666",
                  boxShadow: "none",
                },
                transition: "all 0.3s ease",
              }}
            >
              {t("common.create")}
            </Button>
          </>
        )}
      </DialogActions>
    </>
  );
};

export default BookingForm;
