import React from "react";
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
import dayjs from "dayjs";
import { RoomBookingDto, DeviceDto, BookingStatus } from "../../api";
import { useTranslation } from "react-i18next";

export enum ModalMode {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
}

export interface BookingFormProps {
  mode: ModalMode;
  booking: RoomBookingDto;
  allDevices: DeviceDto[];
  selectedBooking: RoomBookingDto | null;
  onBookingDateTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDurationChange: (e: { target: { value: number } }) => void;
  onPlayingAloneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFellowsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeviceChange: (deviceId: number, checked: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  checkFieldsValidation: () => boolean;
  onCancelBooking: () => Promise<void>;
  onDeleteBooking: () => Promise<void>;
  onFieldChange: () => boolean;
  onUpdateBooking: () => Promise<void>;
}

const BookingForm = (props: BookingFormProps) => {
  const { t } = useTranslation();
  const {
    mode,
    booking,
    allDevices,
    selectedBooking,
    onBookingDateTimeChange,
    onDurationChange,
    onPlayingAloneChange,
    onFellowsChange,
    onDeviceChange,
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
  const deviceIds = currentDevices.map(d => d.id!).filter(Boolean) as number[];

  const formatDateTimeForInput = (dateTime?: string) => {
    if (!dateTime) return "";
    const d = dayjs(dateTime);
    if (!d.isValid()) return "";
    return d.format("YYYY-MM-DDTHH:mm");
  };

  return (
    <>
      <DialogContent>
        {/* Pass Code field: display only in update mode */}
        {mode === ModalMode.UPDATE && (
          <TextField
            fullWidth
            margin="dense"
            label={t("bookings.passCode")}
            value={booking.passCode || ""}
            disabled
            helperText={
              isCancelled || isCompleted || !booking.isPassCodeValid
                ? t("bookings.passcodeExpired")
                : ""
            }
          />
        )}

        <TextField
          fullWidth
          margin="dense"
          type="datetime-local"
          label={t("admin.bookings.start")}
          value={formatDateTimeForInput(booking.bookingDateTime as any)}
          onChange={(e) => {
            const syntheticEvent = e as unknown as React.ChangeEvent<HTMLInputElement>;
            onBookingDateTimeChange(syntheticEvent);
          }}
          InputLabelProps={{ shrink: true }}
          disabled={isDisabled}
        />

        <FormControl fullWidth margin="dense">
          <InputLabel>{t("admin.bookings.durationHours")}</InputLabel>
          <Select
            value={booking.duration || 1}
            label={t("admin.bookings.durationHours")}
            onChange={(e) => onDurationChange({ target: { value: Number(e.target.value) } })}
            disabled={isDisabled}
          >
            <MenuItem value={1}>{t("admin.bookings.duration1Hour")}</MenuItem>
            <MenuItem value={2}>{t("admin.bookings.duration2Hours")}</MenuItem>
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
          value={booking.fellows ?? 0}
          onChange={onFellowsChange}
          disabled={booking.isPlayingAlone || isDisabled}
        />

        <Typography sx={{ mt: 2, mb: 1 }}>{t("admin.bookings.devices")}</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {allDevices.map((d) => (
            <FormControlLabel
              key={d.id}
              control={
                <Checkbox
                  checked={deviceIds.includes(d.id!)}
                  onChange={(e) => onDeviceChange(d.id!, e.target.checked)}
                  disabled={isDisabled}
                />
              }
              label={d.name || `#${d.id}`}
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        {mode === ModalMode.UPDATE ? (
          isCancelled || isCompleted ? (
            <Button variant="contained" color="error" onClick={onDeleteBooking}>
              {t("bookings.deleteBooking")}
            </Button>
          ) : (
            <>
              <Button onClick={onCancel}>{t("common.cancel")}</Button>
              <Button variant="contained" color="error" onClick={onCancelBooking}>
                {t("bookings.cancelBooking")}
              </Button>
              <Button
                variant="contained"
                onClick={onUpdateBooking}
                disabled={mode === ModalMode.UPDATE && !onFieldChange()}
              >
                {t("common.save")}
              </Button>
            </>
          )
        ) : (
          <>
            <Button onClick={onCancel}>{t("common.cancel")}</Button>
            <Button
              variant="contained"
              onClick={onSubmit}
              disabled={!checkFieldsValidation()}
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
