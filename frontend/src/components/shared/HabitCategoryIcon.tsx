import styles from "./HabitCategoryIcon.module.css";

import { Heart, BookOpen, Briefcase, Brain, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { HabitCategory } from "@/types";

interface HabitCategoryIconProps {
  category: HabitCategory;
  size?: number;
  completed?: boolean;
}

const CATEGORY_ICONS: Record<HabitCategory, LucideIcon> = {
    Health: Heart,
    Study: BookOpen,
    Work: Briefcase,
    Mindfulness: Brain,
    Other: Sparkles,
};

const CATEGORY_CLASSES: Record<HabitCategory, string> = {
    Health: styles.categoryHealth,
    Study: styles.categoryStudy,
    Work: styles.categoryWork,
    Mindfulness: styles.categoryMindfulness,
    Other: styles.categoryOther,
};

interface HabitCategoryIconProps {
    category: HabitCategory;
    size?: number;
}

export default function HabitCategoryIcon({
    category,
    size = 36,
    completed = false,
}: HabitCategoryIconProps) {
    const Icon = CATEGORY_ICONS[category];
    const colorClass = CATEGORY_CLASSES[category];

    return (
        <div
            className={[
                styles.habitIcon,
                completed ? styles.completed : colorClass,
            ].join(" ")}
            style={{
                width: size,
                height: size,
            }}
        >
            <Icon size={Math.round(size * 0.55)} />
        </div>
    );
}