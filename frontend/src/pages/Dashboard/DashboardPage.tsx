import AppLayout from "../../components/layout/AppLayout";
import Footer from "../../components/layout/Footer";
import Navbar from "../../components/layout/Navbar";
import styles from "./DashboardPage.module.css";

const summaryCards = [
  {
    title: "Completed Today",
    value: "85%",
    meta: "/ 100",
    status: "+12% vs last week",
    tone: "blue",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m8.5 12 2.5 2.5L16 9" />
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
  },
  {
    title: "Active Habits",
    value: "14",
    meta: "Current",
    status: "Consistent",
    tone: "green",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 17 17 7M7 7h10v10" />
        <path d="M8 0-7l2-2 4 4-2 2c-2 2-5 2-7 0Z" />
      </svg>
    ),
  },
  {
    title: "Habits at Risk",
    value: "2",
    meta: "Potential break",
    status: "Action needed",
    tone: "red",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 4 9 16H3L12 4Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    ),
  },
];

const habits = [
  {
    category: "Health & Fitness",
    categoryTone: "blue",
    name: "Morning Run",
    time: "Daily - 6:30 AM",
    badge: "12 days",
    badgeIcon: "fire",
    badgeTone: "blue",
    icon: "run",
    stats: ["24d", "148", "92%"],
    labels: ["Longest", "Total", "Rate"],
    bars: [62, 58, 68, 64, 55, 70, 72],
    tone: "blue",
  },
  {
    category: "Health & Fitness",
    categoryTone: "blue",
    name: "Drink Water",
    time: "Hourly - 2L Target",
    badge: "1 day",
    badgeIcon: "down",
    badgeTone: "red",
    icon: "drop",
    stats: ["45d", "312", "78%"],
    labels: ["Longest", "Total", "Rate"],
    bars: [32, 38, 27, 55, 34, 18, 12],
    tone: "mint",
  },
  {
    category: "Mindfulness",
    categoryTone: "brown",
    name: "Meditation",
    time: "Daily - 10 mins",
    badge: "32 days",
    badgeIcon: "fire",
    badgeTone: "amber",
    icon: "mind",
    stats: ["32d", "56", "100%"],
    labels: ["Longest", "Total", "Rate"],
    bars: [72, 72, 74, 74, 75, 76, 78],
    tone: "amber",
  },
];

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 16h16M7 12h10M10 8h4" />
    </svg>
  );
}

function HabitIcon({ type }: { type: string }) {
  if (type === "drop") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11Z" />
        <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
      </svg>
    );
  }

  if (type === "mind") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
        <path d="M7 19c1.8-1.8 3.5-2.7 5-2.7s3.2.9 5 2.7M6 14l3-3 3 3 3-3 3 3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 5 9 9l4 3-3 7M14 12l3 2 2-3M10 9 6 8M15 4h.01" />
    </svg>
  );
}

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className={styles.content}>
        <Navbar />

        <section className={styles.dashboardSection}>
          <div className={styles.summaryGrid}>
            {summaryCards.map((card) => (
              <article className={styles.summaryCard} key={card.title}>
                <div className={styles.cardTop}>
                  <span className={`${styles.summaryIcon} ${styles[card.tone]}`}>
                    {card.icon}
                  </span>
                  <span className={`${styles.statusText} ${styles[`${card.tone}Text`]}`}>
                    {card.status}
                  </span>
                </div>
                <p>{card.title}</p>
                <div className={styles.metric}>
                  <strong>{card.value}</strong>
                  <span>{card.meta}</span>
                </div>
                {card.tone === "blue" && (
                  <div className={styles.progressTrack}>
                    <span />
                  </div>
                )}
                {card.tone === "green" && (
                  <div className={styles.avatarStack} aria-label="Recent habit categories">
                    <span>M</span>
                    <span>H</span>
                    <span>W</span>
                    <span>+11</span>
                  </div>
                )}
                {card.tone === "red" && (
                  <em className={styles.riskList}>"Drink Water" & "Morning Meds"</em>
                )}
              </article>
            ))}
          </div>

          <section className={styles.breakdown}>
            <div className={styles.sectionHeader}>
              <h2>Habit Breakdown</h2>
              <button className={styles.filterButton} aria-label="Filter habits">
                <TrendIcon />
              </button>
            </div>

            <div className={styles.habitGrid}>
              {habits.map((habit, index) => {
                const showCategory =
                  index === 0 || habits[index - 1].category !== habit.category;

                return (
                  <div className={styles.habitGroup} key={habit.name}>
                    {showCategory && (
                      <h3 className={styles.categoryLabel}>
                        <span className={styles[`${habit.categoryTone}Dot`]} />
                        {habit.category}
                      </h3>
                    )}
                    {!showCategory && <div className={styles.categorySpacer} />}
                    <article className={styles.habitCard}>
                      <div className={styles.habitHeader}>
                        <span className={`${styles.habitIcon} ${styles[habit.tone]}`}>
                          <HabitIcon type={habit.icon} />
                        </span>
                        <div>
                          <h4>{habit.name}</h4>
                          <p>{habit.time}</p>
                        </div>
                        <span className={`${styles.badge} ${styles[`${habit.badgeTone}Badge`]}`}>
                          {habit.badge}
                          {habit.badgeIcon === "fire" ? (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12 22c4 0 7-2.8 7-6.8 0-2.7-1.4-5.2-4.2-7.5.1 2.1-.7 3.4-2.1 4.1.2-3.3-1.4-6-4.4-8.1.2 3.3-1 5.4-2.3 7.1A7 7 0 0 0 5 15.2C5 19.2 8 22 12 22Z" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="m7 7 10 10M17 17H9M17 17V9" />
                            </svg>
                          )}
                        </span>
                      </div>

                      <div className={styles.statGrid}>
                        {habit.stats.map((stat, statIndex) => (
                          <div key={habit.labels[statIndex]}>
                            <span>{habit.labels[statIndex]}</span>
                            <strong>{stat}</strong>
                          </div>
                        ))}
                      </div>

                      <p className={styles.chartLabel}>Last 7 Days Activity</p>
                      <div className={`${styles.bars} ${styles[`${habit.tone}Bars`]}`}>
                        {habit.bars.map((height, barIndex) => (
                          <span key={barIndex} style={{ height: `${height}%` }} />
                        ))}
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.banner}>
            <img
              alt=""
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAanMMqLfbMWVb7Jqznbi1GBuGhoSYPAg5AcIJYym-fKC0LCr7UUGsl5wzY5BXjbPfUfUciI2-gVEfD7G_fRsGMYchGPt_i52dYzFAzVZIMc-omSp2-c7QJ5_WqLWLB_ohSOeuap1B2mCJVZgWYLNQLScPRZegzAL00wO2B56jTzFAMpKvnPd9tTNb60TSWA7ztSOxJEo-xkUayNC9o4TfmN2w6_k3UhfKVNXQ90Z8B1LcEHsIv9SxhzD1_IAooJ4YkSomISvwMpqBh"
            />
            <div className={styles.bannerOverlay}>
              <span>Consistency is Key</span>
              <h2>You're on a 5-day total completion streak!</h2>
              <p>The best way to predict the future is to create it, one habit at a time.</p>
            </div>
          </section>
        </section>

        <Footer />
      </div>
    </AppLayout>
  );
}
