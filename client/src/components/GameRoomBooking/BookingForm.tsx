import React from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Checkbox,
  FormGroup,
  FormControlLabel,
} from "@mui/material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import Autocomplete from "@mui/material/Autocomplete";
import dayjs, { Dayjs } from "dayjs";
import { RoomBookingDto, DeviceDto, BookingStatus } from "../../api";

export enum ModalMode {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
}

export interface BookingFormProps {
  mode: ModalMode;
  booking: RoomBookingDto;
  allDevices: DeviceDto[];
  inputValue: string;
  selectedBooking: RoomBookingDto | null;
  onSelectedBooking: (booking: RoomBookingDto) => void;
  onInputChange: (event: React.SyntheticEvent, value: string) => void;
  onDeviceSelect: (_: React.SyntheticEvent, newValue: DeviceDto[]) => void;
  onBookingDateTimeChange: (newValue: Dayjs | null) => void;
  onDurationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPlayingAloneChange: () => void;
  onWithFellowsChange: () => void;
  onFellowsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  checkFieldsValidation: () => boolean;
  onCancelBooking: () => Promise<void>;
  onDeleteBooking: () => Promise<void>;
  onFieldChange: () => boolean;
  onUpdateBooking: () => Promise<void>;
}

const BookingForm = (props: BookingFormProps) => {
  const {
    mode,
    booking,
    allDevices,
    inputValue,
    selectedBooking,
    onInputChange,
    onDeviceSelect,
    onBookingDateTimeChange,
    onDurationChange,
    onPlayingAloneChange,
    onWithFellowsChange,
    onFellowsChange,
    onSubmit,
    onCancel,
    checkFieldsValidation,
    onCancelBooking,
    onDeleteBooking,
    onFieldChange,
    onUpdateBooking,
    onSelectedBooking,
  } = props;

  const isCancelled = booking.status === BookingStatus.CANCELLED;
  const isCompleted = booking.status === BookingStatus.COMPLETED;
  const isDisabled = isCancelled || isCompleted;

  return (
    <Box sx={styles.form}>
      <Typography sx={styles.bookgGameRoomTitle}>
        {mode === ModalMode.CREATE
          ? "Book Game Room"
          : isCancelled
          ? "Cancelled Booking"
          : isCompleted
          ? "Completed Booking"
          : "Update Booking"}
      </Typography>

      {/* New Pass Code field: display only in update mode */}
      {mode === ModalMode.UPDATE && (
        <Box width="100%" sx={{ mb: 2 }}>
          <TextField
            label="Pass Code"
            value={booking.passCode || ""}
            variant="standard"
            fullWidth
            disabled
            helperText={
              isCancelled || isCompleted || !booking.isPassCodeValid
                ? "Passcode expired."
                : ""
            }
          />
        </Box>
      )}

      <Box sx={{ width: "100%" }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateTimePicker
            orientation="portrait"
            value={
              booking.bookingDateTime ? dayjs(booking.bookingDateTime) : dayjs()
            }
            onChange={onBookingDateTimeChange}
            sx={{ width: "100%" }}
            disabled={isDisabled}
          />
        </LocalizationProvider>
      </Box>
      <Box width="100%">
        <TextField
          id="outlined-helperText"
          label="Duration *"
          type="text"
          defaultValue={booking.duration || ""}
          onChange={onDurationChange}
          variant="standard"
          fullWidth
          inputProps={{ min: 0 }}
          disabled={isDisabled}
        />
      </Box>
      <Box width="100%">
        <Autocomplete
          options={allDevices}
          getOptionLabel={(option) => option.name || ""}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          filterSelectedOptions
          multiple
          value={
            mode === ModalMode.CREATE
              ? booking.devices ?? []
              : selectedBooking?.devices ?? []
          }
          inputValue={inputValue}
          onInputChange={(event, newInputValue) => {
            onInputChange(event, newInputValue);
          }}
          onChange={(event, newValue) => {
            // De-duplicate by id to avoid duplicates in value
            const deduped = newValue.filter(
              (v, idx, arr) => idx === arr.findIndex((x) => x.id === v.id)
            );
            onDeviceSelect(event, deduped);
          }}
          renderTags={() => null}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Devices"
              variant="standard"
              disabled={isDisabled}
            />
          )}
          disabled={isDisabled}
        />
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
          {booking.devices &&
            booking.devices.map((device, idx) => (
              <Chip
                key={`${device.id ?? device.name}-${idx}`}
                label={device.name}
                onDelete={
                  isDisabled
                    ? undefined
                    : () => {
                        onSelectedBooking({
                          ...booking,
                          devices: booking.devices?.filter(
                            (d) => d.id !== device.id
                          ),
                        });
                      }
                }
              />
            ))}
        </Box>
      </Box>
      <Box width="100%">
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={booking.isPlayingAlone}
                onChange={onPlayingAloneChange}
                disabled={isDisabled}
              />
            }
            label="Playing alone"
            sx={{ width: "30%", marginTop: 1 }}
          />
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 2, height: 60 }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={!booking.isPlayingAlone}
                  onChange={onWithFellowsChange}
                  disabled={isDisabled}
                />
              }
              label="With fellows"
            />
            {!booking.isPlayingAlone && (
              <TextField
                id="outlined-helperText"
                label="How many? *"
                type="number"
                value={booking.fellows || ""}
                onChange={onFellowsChange}
                variant="standard"
                sx={{ marginTop: -2 }}
                inputProps={{ min: 1 }}
                disabled={isDisabled}
              />
            )}
          </Box>
        </FormGroup>
      </Box>
      <Box sx={styles.formButtons}>
        {mode === ModalMode.UPDATE ? (
          isCancelled || isCompleted ? (
            <>
              <Button
                variant="contained"
                color="error"
                onClick={onDeleteBooking}
              >
                Delete Booking
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                color="error"
                onClick={onCancelBooking}
              >
                Cancel Booking
              </Button>
              <Button
                variant="contained"
                onClick={onUpdateBooking}
                disabled={mode === ModalMode.UPDATE && !onFieldChange()}
              >
                Save
              </Button>
            </>
          )
        ) : (
          <>
            <Button
              variant="contained"
              onClick={onSubmit}
              disabled={!checkFieldsValidation()}
            >
              Save
            </Button>
          </>
        )}
        <Button
          variant="outlined"
          sx={{ borderColor: "red", color: "red" }}
          onClick={onCancel}
        >
          Close
        </Button>
      </Box>
    </Box>
  );
};

export default BookingForm;

const styles = {
  form: {
    display: "flex",
    flexDirection: "column" as "column",
    gap: 3,
  },
  bookgGameRoomTitle: {
    fontWeight: "bold",
    textTransform: "uppercase",
    fontSize: 32,
    letterSpacing: 1,
  },
  formButtons: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 2,
  },
};
