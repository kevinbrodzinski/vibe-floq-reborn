
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format } from "date-fns";
import { useState } from "react";

export const DateTimePicker = ({
  value,
  onChange,
  min,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
  min: Date;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full text-left rounded-lg border px-4 py-2 hover:bg-accent/30">
          {value ? format(value, "PPP 'at' p") : "Pick a date & time"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-auto">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(d) => d && onChange(d)}
          disabled={(d) => d < min}
          initialFocus
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  );
};
