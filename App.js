import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const DAILY_HOURS = 8;

const pad = (n) => String(n).padStart(2, "0");

const dateKey = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatTime = (date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

export default function App() {
  const [records, setRecords] = useState({});
  const [activeTab, setActiveTab] = useState("Home");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    loadData();

    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const saved = await AsyncStorage.getItem("myAttendance");
      if (saved) setRecords(JSON.parse(saved));
    } catch (e) {
      console.log(e);
    }
  };

  const saveData = async (data) => {
    setRecords(data);
    await AsyncStorage.setItem("myAttendance", JSON.stringify(data));
  };

  const today = dateKey();
  const todayRecord = records[today];

  const getWorkedMinutes = (record) => {
    if (!record?.clockIn) return 0;

    const start = new Date(record.clockIn).getTime();
    const end = record.clockOut
      ? new Date(record.clockOut).getTime()
      : now.getTime();

    return Math.max(0, Math.floor((end - start) / 60000));
  };

  const workedToday = getWorkedMinutes(todayRecord);
  const overtimeToday = Math.max(0, workedToday - DAILY_HOURS * 60);

  const clockIn = async () => {
    const newRecords = {
      ...records,
      [today]: {
        clockIn: new Date().toISOString(),
        clockOut: null,
        status: "Present",
      },
    };

    await saveData(newRecords);
  };

  const clockOut = async () => {
    if (!todayRecord?.clockIn) return;

    const newRecords = {
      ...records,
      [today]: {
        ...todayRecord,
        clockOut: new Date().toISOString(),
        status: "Completed",
      },
    };

    await saveData(newRecords);
  };

  const markDayOff = async () => {
    Alert.alert(
      "Mark Day Off",
      "Do you want to mark today as a day off?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            const newRecords = {
              ...records,
              [today]: {
                status: "Day Off",
                clockIn: null,
                clockOut: null,
              },
            };

            await saveData(newRecords);
          },
        },
      ]
    );
  };

  const getMonthRecords = () => {
    const month = today.slice(0, 7);

    return Object.entries(records).filter(([key]) =>
      key.startsWith(month)
    );
  };

  const monthRecords = getMonthRecords();

  const attended = monthRecords.filter(
    ([, r]) => r.status === "Present" || r.status === "Completed"
  ).length;

  const daysOff = monthRecords.filter(
    ([, r]) => r.status === "Day Off"
  ).length;

  const totalMinutes = monthRecords.reduce(
    (sum, [, r]) => sum + getWorkedMinutes(r),
    0
  );

  const totalOvertime = monthRecords.reduce(
    (sum, [, r]) =>
      sum + Math.max(0, getWorkedMinutes(r) - DAILY_HOURS * 60),
    0
  );

  const getStatusColor = (status) => {
    if (status === "Completed") return "#16A34A";
    if (status === "Present") return "#2563EB";
    if (status === "Day Off") return "#F59E0B";
    return "#64748B";
  };

  const Home = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good day 👋</Text>
          <Text style={styles.appName}>My Attendance</Text>
        </View>

        <View style={styles.profile}>
          <Text style={styles.profileText}>U</Text>
        </View>
      </View>

      <View style={styles.dateCard}>
        <View>
          <Text style={styles.smallWhite}>TODAY</Text>
          <Text style={styles.dateText}>
            {now.toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>

        <Ionicons name="calendar-outline" size={28} color="#fff" />
      </View>

      <View style={styles.mainCard}>
        <Text style={styles.cardLabel}>TODAY'S WORKING HOURS</Text>

        <Text style={styles.bigHours}>
          {formatDuration(workedToday)}
        </Text>

        <Text style={styles.targetText}>
          Target: {DAILY_HOURS}h 00m
        </Text>

        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progress,
              {
                width: `${Math.min(
                  100,
                  (workedToday / (DAILY_HOURS * 60)) * 100
                )}%`,
              },
            ]}
          />
        </View>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(todayRecord?.status) },
            ]}
          />

          <Text style={styles.statusText}>
            {todayRecord?.status || "Not Started"}
          </Text>
        </View>

        {todayRecord?.clockIn && (
          <View style={styles.timeRow}>
            <View>
              <Text style={styles.timeLabel}>CLOCK IN</Text>
              <Text style={styles.timeValue}>
                {formatTime(new Date(todayRecord.clockIn))}
              </Text>
            </View>

            <View>
              <Text style={styles.timeLabel}>CLOCK OUT</Text>
              <Text style={styles.timeValue}>
                {todayRecord.clockOut
                  ? formatTime(new Date(todayRecord.clockOut))
                  : "--:--"}
              </Text>
            </View>
          </View>
        )}
      </View>

      {!todayRecord?.clockIn && (
        <TouchableOpacity style={styles.primaryButton} onPress={clockIn}>
          <Ionicons name="play-circle" size={25} color="#fff" />
          <Text style={styles.primaryButtonText}>CLOCK IN</Text>
        </TouchableOpacity>
      )}

      {todayRecord?.clockIn && !todayRecord?.clockOut && (
        <TouchableOpacity style={styles.primaryButton} onPress={clockOut}>
          <Ionicons name="stop-circle" size={25} color="#fff" />
          <Text style={styles.primaryButtonText}>CLOCK OUT</Text>
        </TouchableOpacity>
      )}

      {!todayRecord?.clockIn && (
        <TouchableOpacity style={styles.secondaryButton} onPress={markDayOff}>
          <Ionicons name="sunny-outline" size={21} color="#334155" />
          <Text style={styles.secondaryText}>Mark Day Off</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>This Month</Text>

      <View style={styles.statsGrid}>
        <StatCard
          icon="checkmark-circle-outline"
          value={attended}
          label="Days Attended"
        />

        <StatCard
          icon="time-outline"
          value={formatDuration(totalMinutes)}
          label="Total Hours"
        />

        <StatCard
          icon="trending-up-outline"
          value={formatDuration(totalOvertime)}
          label="Overtime"
        />

        <StatCard
          icon="sunny-outline"
          value={daysOff}
          label="Days Off"
        />
      </View>
    </ScrollView>
  );

  const Attendance = () => (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.pageTitle}>Attendance</Text>
      <Text style={styles.pageSubtitle}>Your attendance history</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>
          {now.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          })}
        </Text>

        <View style={styles.summaryRow}>
          <Summary value={attended} label="Present" />
          <Summary value={daysOff} label="Day Off" />
          <Summary
            value={`${Math.round(
              (attended / Math.max(1, monthRecords.length)) * 100
            )}%`}
            label="Attendance"
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Records</Text>

      {monthRecords.length === 0 ? (
        <Empty text="No attendance records yet." />
      ) : (
        monthRecords
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, record]) => (
            <View style={styles.recordCard} key={date}>
              <View style={styles.recordDate}>
                <Text style={styles.recordDay}>
                  {new Date(date + "T00:00:00").getDate()}
                </Text>
                <Text style={styles.recordMonth}>
                  {new Date(date + "T00:00:00").toLocaleDateString(
                    "en-IN",
                    { month: "short" }
                  )}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.recordStatus}>
                  {record.status}
                </Text>

                <Text style={styles.recordTime}>
                  {record.clockIn
                    ? `${formatTime(new Date(record.clockIn))} ${
                        record.clockOut
                          ? "→ " +
                            formatTime(new Date(record.clockOut))
                          : "→ Working"
                      }`
                    : "No working hours"}
                </Text>
              </View>

              <Text style={styles.recordHours}>
                {record.clockIn
                  ? formatDuration(getWorkedMinutes(record))
                  : "-"}
              </Text>
            </View>
          ))
      )}
    </ScrollView>
  );

  const Overtime = () => (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.pageTitle}>Overtime</Text>
      <Text style={styles.pageSubtitle}>
        Track your extra working hours
      </Text>

      <View style={styles.overtimeCard}>
        <Ionicons name="trending-up" size={34} color="#fff" />
        <Text style={styles.overtimeLabel}>TOTAL OVERTIME</Text>
        <Text style={styles.overtimeValue}>
          {formatDuration(totalOvertime)}
        </Text>
        <Text style={styles.overtimeMonth}>
          This month
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Daily Overtime</Text>

      {monthRecords.filter(
        ([, r]) => getWorkedMinutes(r) > DAILY_HOURS * 60
      ).length === 0 ? (
        <Empty text="No overtime recorded this month." />
      ) : (
        monthRecords
          .filter(
            ([, r]) => getWorkedMinutes(r) > DAILY_HOURS * 60
          )
          .map(([date, record]) => (
            <View style={styles.recordCard} key={date}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recordStatus}>{date}</Text>
                <Text style={styles.recordTime}>
                  Working time: {formatDuration(getWorkedMinutes(record))}
                </Text>
              </View>

              <Text style={styles.overtimeSmall}>
                +
                {formatDuration(
                  getWorkedMinutes(record) - DAILY_HOURS * 60
                )}
              </Text>
            </View>
          ))
      )}
    </ScrollView>
  );

  const Reports = () => (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.pageTitle}>Reports</Text>
      <Text style={styles.pageSubtitle}>Monthly overview</Text>

      <View style={styles.reportCard}>
        <ReportRow label="Days Attended" value={`${attended}`} />
        <ReportRow label="Days Off" value={`${daysOff}`} />
        <ReportRow
          label="Total Working Hours"
          value={formatDuration(totalMinutes)}
        />
        <ReportRow
          label="Total Overtime"
          value={formatDuration(totalOvertime)}
        />
        <ReportRow
          label="Attendance Rate"
          value={`${Math.round(
            (attended / Math.max(1, monthRecords.length)) * 100
          )}%`}
        />
      </View>

      <View style={styles.infoCard}>
        <Ionicons
          name="information-circle-outline"
          size={24}
          color="#2563EB"
        />
        <Text style={styles.infoText}>
          Your daily target is currently set to {DAILY_HOURS} hours.
        </Text>
      </View>
    </ScrollView>
  );

  const Settings = () => (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.pageTitle}>Settings</Text>
      <Text style={styles.pageSubtitle}>Manage your attendance</Text>

      <View style={styles.settingCard}>
        <Ionicons name="time-outline" size={25} color="#2563EB" />
        <View style={{ flex: 1 }}>
          <Text style={styles.settingTitle}>
            Daily Working Hours
          </Text>
          <Text style={styles.settingValue}>
            {DAILY_HOURS} hours
          </Text>
        </View>
      </View>

      <View style={styles.settingCard}>
        <Ionicons
          name="phone-portrait-outline"
          size={25}
          color="#2563EB"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.settingTitle}>Storage</Text>
          <Text style={styles.settingValue}>
            Data is stored locally on this phone
          </Text>
        </View>
      </View>

      <View style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>My Attendance</Text>
        <Text style={styles.aboutText}>
          A simple personal attendance and work-hour tracker.
        </Text>
        <Text style={styles.version}>Version 1.0</Text>
      </View>
    </ScrollView>
  );

  const renderScreen = () => {
    if (activeTab === "Attendance") return <Attendance />;
    if (activeTab === "Overtime") return <Overtime />;
    if (activeTab === "Reports") return <Reports />;
    if (activeTab === "Settings") return <Settings />;
    return <Home />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {renderScreen()}

      <View style={styles.bottomNav}>
        <NavItem
          icon="home-outline"
          activeIcon="home"
          label="Home"
          active={activeTab === "Home"}
          onPress={() => setActiveTab("Home")}
        />

        <NavItem
          icon="calendar-outline"
          activeIcon="calendar"
          label="Attendance"
          active={activeTab === "Attendance"}
          onPress={() => setActiveTab("Attendance")}
        />

        <NavItem
          icon="trending-up-outline"
          activeIcon="trending-up"
          label="Overtime"
          active={activeTab === "Overtime"}
          onPress={() => setActiveTab("Overtime")}
        />

        <NavItem
          icon="bar-chart-outline"
          activeIcon="bar-chart"
          label="Reports"
          active={activeTab === "Reports"}
          onPress={() => setActiveTab("Reports")}
        />

        <NavItem
          icon="settings-outline"
          activeIcon="settings"
          label="Settings"
          active={activeTab === "Settings"}
          onPress={() => setActiveTab("Settings")}
        />
      </View>
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={24} color="#2563EB" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Summary({ value, label }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ReportRow({ label, value }) {
  return (
    <View style={styles.reportRow}>
      <Text style={styles.reportLabel}>{label}</Text>
      <Text style={styles.reportValue}>{value}</Text>
    </View>
  );
}

function Empty({ text }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="calendar-outline" size={40} color="#94A3B8" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function NavItem({
  icon,
  activeIcon,
  label,
  active,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.navItem}
      onPress={onPress}
    >
      <Ionicons
        name={active ? activeIcon : icon}
        size={23}
        color={active ? "#2563EB" : "#64748B"}
      />
      <Text
        style={[
          styles.navLabel,
          active && styles.navLabelActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scroll: {
    padding: 20,
    paddingBottom: 110,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  greeting: {
    color: "#64748B",
    fontSize: 14,
  },

  appName: {
    color: "#0F172A",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 3,
  },

  profile: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },

  profileText: {
    color: "#2563EB",
    fontWeight: "800",
    fontSize: 18,
  },

  dateCard: {
    backgroundColor: "#2563EB",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  smallWhite: {
    color: "#BFDBFE",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },

  dateText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 5,
  },

  mainCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 22,
    marginBottom: 15,
    elevation: 2,
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },

  cardLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },

  bigHours: {
    color: "#0F172A",
    fontSize: 42,
    fontWeight: "800",
    marginTop: 8,
  },

  targetText: {
    color: "#64748B",
    marginTop: 3,
  },

  progressBackground: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    marginTop: 20,
    overflow: "hidden",
  },

  progress: {
    height: 8,
    backgroundColor: "#2563EB",
    borderRadius: 10,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },

  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 8,
  },

  statusText: {
    color: "#334155",
    fontWeight: "700",
  },

  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    marginTop: 18,
    paddingTop: 16,
  },

  timeLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
  },

  timeValue: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 3,
  },

  primaryButton: {
    height: 58,
    backgroundColor: "#2563EB",
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },

  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  secondaryButton: {
    height: 54,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  secondaryText: {
    color: "#334155",
    fontWeight: "700",
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 25,
    marginBottom: 13,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    minHeight: 125,
    justifyContent: "space-between",
  },

  statValue: {
    color: "#0F172A",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 10,
  },

  statLabel: {
    color: "#64748B",
    fontSize: 12,
  },

  pageTitle: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "800",
  },

  pageSubtitle: {
    color: "#64748B",
    marginTop: 5,
    marginBottom: 20,
  },

  summaryCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
  },

  summaryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
  },

  summaryItem: {
    alignItems: "center",
    flex: 1,
  },

  summaryValue: {
    fontSize: 23,
    fontWeight: "800",
    color: "#2563EB",
  },

  summaryLabel: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 3,
  },

  recordCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  recordDate: {
    width: 48,
    height: 55,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },

  recordDay: {
    color: "#2563EB",
    fontSize: 20,
    fontWeight: "800",
  },

  recordMonth: {
    color: "#64748B",
    fontSize: 10,
    textTransform: "uppercase",
  },

  recordStatus: {
    color: "#0F172A",
    fontWeight: "800",
  },

  recordTime: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
  },

  recordHours: {
    color: "#2563EB",
    fontWeight: "800",
  },

  overtimeCard: {
    backgroundColor: "#0F172A",
    borderRadius: 22,
    padding: 24,
  },

  overtimeLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 20,
    letterSpacing: 1,
  },

  overtimeValue: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "800",
    marginTop: 5,
  },

  overtimeMonth: {
    color: "#94A3B8",
    marginTop: 4,
  },

  overtimeSmall: {
    color: "#16A34A",
    fontWeight: "800",
  },

  reportCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
  },

  reportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  reportLabel: {
    color: "#64748B",
  },

  reportValue: {
    color: "#0F172A",
    fontWeight: "800",
  },

  infoCard: {
    marginTop: 15,
    padding: 17,
    backgroundColor: "#EFF6FF",
    borderRadius: 17,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  infoText: {
    color: "#1E40AF",
    flex: 1,
    lineHeight: 20,
  },

  settingCard: {
    backgroundColor: "#fff",
    padding: 19,
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },

  settingTitle: {
    color: "#0F172A",
    fontWeight: "800",
  },

  settingValue: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 4,
  },

  aboutCard: {
    marginTop: 15,
    backgroundColor: "#fff",
    padding: 22,
    borderRadius: 20,
  },

  aboutTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  aboutText: {
    color: "#64748B",
    marginTop: 8,
    lineHeight: 20,
  },

  version: {
    color: "#94A3B8",
    marginTop: 15,
    fontSize: 12,
  },

  empty: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 35,
    alignItems: "center",
  },

  emptyText: {
    color: "#64748B",
    marginTop: 10,
  },

  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 9,
  },

  navItem: {
    alignItems: "center",
    justifyContent: "center",
    width: "20%",
  },

  navLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
  },

  navLabelActive: {
    color: "#2563EB",
    fontWeight: "800",
  },
});