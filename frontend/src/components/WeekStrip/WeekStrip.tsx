import type { WeekStripDay } from "../../types";
import styles from "./WeekStrip.module.css";

interface WeekStripProps {
  days: WeekStripDay[];
  selectedDate: string;
  today: string;
  onSelectDate: (date: string) => void;
}

export default function WeekStrip({
  days,
  selectedDate,
  today,
  onSelectDate,
}: WeekStripProps) {
  return (
    <div className={styles.weekStrip}>
      {days.map(day => {
        const isSelected = selectedDate === day.iso;
        const isFuture = day.iso > today;

        return (
          <button
            key={day.iso}
            type="button"
            onClick={() => onSelectDate(day.iso)}
            disabled={isFuture}
            className={[
              styles.dayBtn,
              isSelected ? styles.dayBtnActive : "",
              isFuture ? styles.dayBtnDisabled : "",
            ].join(" ")}
          >
            <span className={styles.dayLabel}>
              {day.label.toUpperCase()}
            </span>

            <span className={styles.dayDate}>
              {day.date}
            </span>
          </button>
        );
      })}
    </div>
  );
}