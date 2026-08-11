/* ==========================================================================
   Data Store — Supabase cloud when configured, else Firebase, else localStorage
   ========================================================================== */

const Store = (() => {
  const STORAGE_KEY = "messDashboard_v1";
  const SETTINGS_KEY = "messDashboard_settings";
  const CLOUD_STATE_PATH = "messDashboard/state";
  const CLOUD_SETTINGS_PATH = "messDashboard/settings";
  const SB_STATE_ID = "state";
  const SB_SETTINGS_ID = "settings";
  const listeners = [];
  let state = null;
  let settings = {};
  let db = null;
  let sb = null;
  let cloudEnabled = false;
  let cloudProvider = "local"; // local | supabase | firebase
  let applyingRemote = false;
  let saveTimer = null;
  let readyResolve;
  const readyPromise = new Promise((resolve) => { readyResolve = resolve; });

  function emptyData() {
    return {
      employees: [],
      salaries: [],
      deliveryStaff: [],
      deliveries: [],
      customers: [],
      food: [],
      expenses: [],
      activity: [],
    };
  }

  function normalizeState(raw) {
    const base = emptyData();
    if (!raw || typeof raw !== "object") return base;
    Object.keys(base).forEach((key) => {
      base[key] = Array.isArray(raw[key]) ? raw[key] : [];
    });
    return base;
  }

  function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }
  function daysFromNow(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function isoNowMinus(hours) {
    const d = new Date();
    d.setHours(d.getHours() - hours);
    return d.toISOString();
  }

  function buildDemoData() {
    const employees = [
      { id: "e1", employeeId: "EMP001", name: "Ramesh Iyer", phone: "9876543210", email: "ramesh.iyer@messmail.com", address: "12 MG Road, Chennai", designation: "Head Chef", department: "Kitchen", joiningDate: "2022-03-01", salary: 32000, salaryDate: "5", bankAccount: "XXXX1234", status: "Active" },
      { id: "e2", employeeId: "EMP002", name: "Suresh Kumar", phone: "9876543211", email: "suresh.kumar@messmail.com", address: "45 Anna Nagar, Chennai", designation: "Cook", department: "Kitchen", joiningDate: "2022-06-15", salary: 22000, salaryDate: "5", bankAccount: "XXXX2234", status: "Active" },
      { id: "e3", employeeId: "EMP003", name: "Lakshmi Priya", phone: "9876543212", email: "lakshmi.priya@messmail.com", address: "7 T Nagar, Chennai", designation: "Cook", department: "Kitchen", joiningDate: "2023-01-10", salary: 21000, salaryDate: "5", bankAccount: "XXXX3234", status: "Active" },
      { id: "e4", employeeId: "EMP004", name: "Anitha Raj", phone: "9876543213", email: "anitha.raj@messmail.com", address: "9 Velachery, Chennai", designation: "Helper", department: "Kitchen", joiningDate: "2023-04-20", salary: 15000, salaryDate: "5", bankAccount: "", status: "Active" },
      { id: "e5", employeeId: "EMP005", name: "Manoj Verma", phone: "9876543214", email: "manoj.verma@messmail.com", address: "22 Adyar, Chennai", designation: "Manager", department: "Management", joiningDate: "2021-11-05", salary: 38000, salaryDate: "1", bankAccount: "XXXX4234", status: "Active" },
      { id: "e6", employeeId: "EMP006", name: "Divya Shree", phone: "9876543215", email: "divya.shree@messmail.com", address: "3 Nungambakkam, Chennai", designation: "Accountant", department: "Accounts", joiningDate: "2022-09-12", salary: 26000, salaryDate: "1", bankAccount: "XXXX5234", status: "Active" },
      { id: "e7", employeeId: "EMP007", name: "Karthik Subramaniam", phone: "9876543216", email: "karthik.s@messmail.com", address: "18 Porur, Chennai", designation: "Delivery Executive", department: "Delivery", joiningDate: "2023-02-18", salary: 18000, salaryDate: "5", bankAccount: "XXXX6234", status: "Active" },
      { id: "e8", employeeId: "EMP008", name: "Farhan Ahmed", phone: "9876543217", email: "farhan.ahmed@messmail.com", address: "31 Guindy, Chennai", designation: "Delivery Executive", department: "Delivery", joiningDate: "2023-05-22", salary: 18000, salaryDate: "5", bankAccount: "XXXX7234", status: "Active" },
      { id: "e9", employeeId: "EMP009", name: "Meena Kumari", phone: "9876543218", email: "meena.kumari@messmail.com", address: "5 Kodambakkam, Chennai", designation: "Cleaner", department: "Housekeeping", joiningDate: "2022-12-01", salary: 13000, salaryDate: "5", bankAccount: "", status: "Inactive" },
      { id: "e10", employeeId: "EMP010", name: "Vikram Singh", phone: "9876543219", email: "vikram.singh@messmail.com", address: "14 Mylapore, Chennai", designation: "Supervisor", department: "Kitchen", joiningDate: "2021-07-19", salary: 24000, salaryDate: "5", bankAccount: "XXXX8234", status: "Active" },
    ];

    const deliveryStaff = [
      { id: "d1", deliveryStaffId: "DS001", name: "Karthik Subramaniam", phone: "9876543216", vehicleNumber: "TN09 AB 1234", vehicleType: "Bike", assignedArea: "Adyar", currentLocation: { name: "Adyar Signal", lat: 13.0067, lng: 80.2570 }, status: "On Delivery", lastUpdated: isoNowMinus(0.5) },
      { id: "d2", deliveryStaffId: "DS002", name: "Farhan Ahmed", phone: "9876543217", vehicleNumber: "TN09 CD 5678", vehicleType: "Scooter", assignedArea: "Velachery", currentLocation: { name: "Velachery Main Road", lat: 12.9791, lng: 80.2210 }, status: "Available", lastUpdated: isoNowMinus(2) },
      { id: "d3", deliveryStaffId: "DS003", name: "Prakash Nair", phone: "9876500111", vehicleNumber: "TN09 EF 9012", vehicleType: "Bike", assignedArea: "T Nagar", currentLocation: { name: "T Nagar Bus Stand", lat: 13.0418, lng: 80.2341 }, status: "Offline", lastUpdated: isoNowMinus(20) },
      { id: "d4", deliveryStaffId: "DS004", name: "Selvam Raju", phone: "9876500112", vehicleNumber: "TN09 GH 3456", vehicleType: "Van", assignedArea: "Anna Nagar", currentLocation: { name: "Anna Nagar Tower", lat: 13.0850, lng: 80.2101 }, status: "On Delivery", lastUpdated: isoNowMinus(1) },
      { id: "d5", deliveryStaffId: "DS005", name: "Yuvaraj Pandi", phone: "9876500113", vehicleNumber: "TN09 IJ 7890", vehicleType: "Bike", assignedArea: "Porur", currentLocation: { name: "Porur Junction", lat: 13.0381, lng: 80.1564 }, status: "Available", lastUpdated: isoNowMinus(3) },
    ];

    const salaries = [];
    let salSeq = 1;
    const activeEmps = employees.slice(0, 8);
    ["2026-06", "2026-07"].forEach((month) => {
      activeEmps.forEach((emp, idx) => {
        const allowance = Math.round(emp.salary * 0.1);
        const deduction = Math.round(emp.salary * 0.03);
        const net = emp.salary + allowance - deduction;
        const isPastMonth = month === "2026-06";
        salaries.push({
          id: "s" + salSeq,
          salaryId: "SAL" + String(salSeq).padStart(3, "0"),
          employeeId: emp.employeeId,
          employeeName: emp.name,
          designation: emp.designation,
          basicSalary: emp.salary,
          allowance,
          deduction,
          netSalary: net,
          salaryMonth: month,
          paymentDate: isPastMonth ? month + "-05" : (idx < 5 ? "2026-08-05" : ""),
          paymentStatus: isPastMonth ? "Paid" : (idx < 5 ? "Paid" : "Pending"),
        });
        salSeq++;
      });
    });

    const deliveries = [
      { id: "dl1", deliveryId: "DLV001", customerName: "Ashok Kumar", customerPhone: "9840011122", deliveryAddress: "14 Besant Nagar, Chennai", assignedStaffId: "DS001", orderDate: daysAgo(0), deliveryTime: "12:30", status: "Out for Delivery", notes: "Extra spicy" },
      { id: "dl2", deliveryId: "DLV002", customerName: "Priya Menon", customerPhone: "9840011123", deliveryAddress: "22 Velachery Main Rd, Chennai", assignedStaffId: "DS002", orderDate: daysAgo(0), deliveryTime: "13:00", status: "Delivered", notes: "" },
      { id: "dl3", deliveryId: "DLV003", customerName: "Ravi Shankar", customerPhone: "9840011124", deliveryAddress: "5 T Nagar, Chennai", assignedStaffId: "DS003", orderDate: daysAgo(0), deliveryTime: "13:15", status: "Pending", notes: "Call before delivery" },
      { id: "dl4", deliveryId: "DLV004", customerName: "Deepa Sundar", customerPhone: "9840011125", deliveryAddress: "18 Anna Nagar, Chennai", assignedStaffId: "DS004", orderDate: daysAgo(0), deliveryTime: "13:30", status: "Assigned", notes: "" },
      { id: "dl5", deliveryId: "DLV005", customerName: "Mohammed Yasin", customerPhone: "9840011126", deliveryAddress: "9 Porur, Chennai", assignedStaffId: "DS005", orderDate: daysAgo(1), deliveryTime: "12:45", status: "Delivered", notes: "" },
      { id: "dl6", deliveryId: "DLV006", customerName: "Kavitha Rajan", customerPhone: "9840011127", deliveryAddress: "31 Adyar, Chennai", assignedStaffId: "DS001", orderDate: daysAgo(1), deliveryTime: "19:00", status: "Delivered", notes: "" },
      { id: "dl7", deliveryId: "DLV007", customerName: "Ganesh Babu", customerPhone: "9840011128", deliveryAddress: "6 Velachery, Chennai", assignedStaffId: "DS002", orderDate: daysAgo(1), deliveryTime: "19:15", status: "Cancelled", notes: "Customer unavailable" },
      { id: "dl8", deliveryId: "DLV008", customerName: "Swathi Iyer", customerPhone: "9840011129", deliveryAddress: "27 T Nagar, Chennai", assignedStaffId: "DS003", orderDate: daysAgo(2), deliveryTime: "12:30", status: "Delivered", notes: "" },
      { id: "dl9", deliveryId: "DLV009", customerName: "Naveen Kumar", customerPhone: "9840011130", deliveryAddress: "11 Anna Nagar, Chennai", assignedStaffId: "DS004", orderDate: daysAgo(2), deliveryTime: "13:00", status: "Delivered", notes: "" },
      { id: "dl10", deliveryId: "DLV010", customerName: "Revathi Prakash", customerPhone: "9840011131", deliveryAddress: "40 Porur, Chennai", assignedStaffId: "DS005", orderDate: daysAgo(2), deliveryTime: "19:30", status: "Delivered", notes: "" },
      { id: "dl11", deliveryId: "DLV011", customerName: "Balaji Ramanathan", customerPhone: "9840011132", deliveryAddress: "3 Besant Nagar, Chennai", assignedStaffId: "DS001", orderDate: daysAgo(3), deliveryTime: "12:30", status: "Delivered", notes: "" },
      { id: "dl12", deliveryId: "DLV012", customerName: "Sowmya Narayan", customerPhone: "9840011133", deliveryAddress: "16 Velachery, Chennai", assignedStaffId: "DS002", orderDate: daysAgo(3), deliveryTime: "13:00", status: "Delivered", notes: "" },
      { id: "dl13", deliveryId: "DLV013", customerName: "Arun Prasad", customerPhone: "9840011134", deliveryAddress: "8 T Nagar, Chennai", assignedStaffId: "DS003", orderDate: daysAgo(4), deliveryTime: "19:00", status: "Delivered", notes: "" },
      { id: "dl14", deliveryId: "DLV014", customerName: "Nithya Sree", customerPhone: "9840011135", deliveryAddress: "20 Anna Nagar, Chennai", assignedStaffId: "DS004", orderDate: daysAgo(4), deliveryTime: "19:15", status: "Cancelled", notes: "Wrong address" },
      { id: "dl15", deliveryId: "DLV015", customerName: "Harish Chandra", customerPhone: "9840011136", deliveryAddress: "33 Porur, Chennai", assignedStaffId: "DS005", orderDate: daysAgo(5), deliveryTime: "12:45", status: "Delivered", notes: "" },
    ];

    const customers = [
      { id: "c1", customerId: "CUST001", name: "Ashok Kumar", phone: "9840011122", email: "ashok.kumar@example.com", address: "14 Besant Nagar, Chennai", area: "Besant Nagar", subscriptionType: "Monthly", startDate: "2026-06-01", endDate: "2026-08-31", status: "Active" },
      { id: "c2", customerId: "CUST002", name: "Priya Menon", phone: "9840011123", email: "priya.menon@example.com", address: "22 Velachery Main Rd, Chennai", area: "Velachery", subscriptionType: "Monthly", startDate: "2026-07-01", endDate: "2026-08-31", status: "Active" },
      { id: "c3", customerId: "CUST003", name: "Ravi Shankar", phone: "9840011124", email: "ravi.shankar@example.com", address: "5 T Nagar, Chennai", area: "T Nagar", subscriptionType: "Weekly", startDate: "2026-08-04", endDate: "2026-08-11", status: "Active" },
      { id: "c4", customerId: "CUST004", name: "Deepa Sundar", phone: "9840011125", email: "deepa.sundar@example.com", address: "18 Anna Nagar, Chennai", area: "Anna Nagar", subscriptionType: "Monthly", startDate: "2026-07-15", endDate: "2026-08-14", status: "Active" },
      { id: "c5", customerId: "CUST005", name: "Mohammed Yasin", phone: "9840011126", email: "m.yasin@example.com", address: "9 Porur, Chennai", area: "Porur", subscriptionType: "Daily", startDate: "2026-08-09", endDate: "2026-08-10", status: "Expired" },
      { id: "c6", customerId: "CUST006", name: "Kavitha Rajan", phone: "9840011127", email: "kavitha.rajan@example.com", address: "31 Adyar, Chennai", area: "Adyar", subscriptionType: "Monthly", startDate: "2026-05-01", endDate: "2026-05-31", status: "Expired" },
      { id: "c7", customerId: "CUST007", name: "Ganesh Babu", phone: "9840011128", email: "ganesh.babu@example.com", address: "6 Velachery, Chennai", area: "Velachery", subscriptionType: "Weekly", startDate: "2026-07-20", endDate: "2026-07-27", status: "Cancelled" },
      { id: "c8", customerId: "CUST008", name: "Swathi Iyer", phone: "9840011129", email: "swathi.iyer@example.com", address: "27 T Nagar, Chennai", area: "T Nagar", subscriptionType: "Monthly", startDate: "2026-08-01", endDate: "2026-08-31", status: "Active" },
      { id: "c9", customerId: "CUST009", name: "Naveen Kumar", phone: "9840011130", email: "naveen.kumar@example.com", address: "11 Anna Nagar, Chennai", area: "Anna Nagar", subscriptionType: "Monthly", startDate: "2026-08-01", endDate: "2026-08-31", status: "Active" },
      { id: "c10", customerId: "CUST010", name: "Revathi Prakash", phone: "9840011131", email: "revathi.p@example.com", address: "40 Porur, Chennai", area: "Porur", subscriptionType: "Weekly", startDate: "2026-08-03", endDate: "2026-08-10", status: "Active" },
    ];

    const food = [
      { id: "f1", foodId: "FOOD001", name: "Idli Sambar", category: "Breakfast", price: 40, quantity: 50, status: "Available" },
      { id: "f2", foodId: "FOOD002", name: "Masala Dosa", category: "Breakfast", price: 60, quantity: 35, status: "Available" },
      { id: "f3", foodId: "FOOD003", name: "Veg Thali", category: "Lunch", price: 90, quantity: 40, status: "Available" },
      { id: "f4", foodId: "FOOD004", name: "Chicken Biryani", category: "Lunch", price: 150, quantity: 25, status: "Available" },
      { id: "f5", foodId: "FOOD005", name: "Chapati with Curry", category: "Dinner", price: 80, quantity: 30, status: "Available" },
      { id: "f6", foodId: "FOOD006", name: "Curd Rice", category: "Dinner", price: 50, quantity: 20, status: "Available" },
      { id: "f7", foodId: "FOOD007", name: "Samosa", category: "Snacks", price: 20, quantity: 60, status: "Available" },
      { id: "f8", foodId: "FOOD008", name: "Veg Cutlet", category: "Snacks", price: 25, quantity: 0, status: "Unavailable" },
      { id: "f9", foodId: "FOOD009", name: "Filter Coffee", category: "Drinks", price: 15, quantity: 100, status: "Available" },
      { id: "f10", foodId: "FOOD010", name: "Buttermilk", category: "Drinks", price: 12, quantity: 45, status: "Available" },
    ];

    const expenses = [
      { id: "ex1", expenseId: "EXP001", date: daysAgo(1), category: "Food", description: "Vegetables & groceries", amount: 8500, paidBy: "Manoj Verma", paymentMethod: "Cash", notes: "Weekly stock" },
      { id: "ex2", expenseId: "EXP002", date: daysAgo(2), category: "Gas", description: "LPG cylinder refill x3", amount: 3200, paidBy: "Manoj Verma", paymentMethod: "UPI", notes: "" },
      { id: "ex3", expenseId: "EXP003", date: daysAgo(3), category: "Transport", description: "Vegetable delivery van rent", amount: 1200, paidBy: "Divya Shree", paymentMethod: "Cash", notes: "" },
      { id: "ex4", expenseId: "EXP004", date: daysAgo(4), category: "Fuel", description: "Petrol for delivery bikes", amount: 2400, paidBy: "Karthik Subramaniam", paymentMethod: "Cash", notes: "" },
      { id: "ex5", expenseId: "EXP005", date: daysAgo(5), category: "Electricity", description: "Monthly EB bill", amount: 6800, paidBy: "Divya Shree", paymentMethod: "Bank Transfer", notes: "" },
      { id: "ex6", expenseId: "EXP006", date: daysAgo(6), category: "Maintenance", description: "Kitchen exhaust fan repair", amount: 1500, paidBy: "Manoj Verma", paymentMethod: "Cash", notes: "" },
      { id: "ex7", expenseId: "EXP007", date: daysAgo(7), category: "Rent", description: "Mess premises rent - August", amount: 25000, paidBy: "Divya Shree", paymentMethod: "Bank Transfer", notes: "" },
      { id: "ex8", expenseId: "EXP008", date: daysAgo(8), category: "Food", description: "Rice & grains bulk purchase", amount: 12000, paidBy: "Ramesh Iyer", paymentMethod: "Cash", notes: "" },
      { id: "ex9", expenseId: "EXP009", date: daysAgo(9), category: "Other", description: "Cleaning supplies", amount: 900, paidBy: "Meena Kumari", paymentMethod: "Cash", notes: "" },
      { id: "ex10", expenseId: "EXP010", date: daysAgo(10), category: "Fuel", description: "Diesel for delivery van", amount: 1800, paidBy: "Selvam Raju", paymentMethod: "Cash", notes: "" },
      { id: "ex11", expenseId: "EXP011", date: daysAgo(12), category: "Food", description: "Dairy products", amount: 4200, paidBy: "Ramesh Iyer", paymentMethod: "UPI", notes: "" },
      { id: "ex12", expenseId: "EXP012", date: daysAgo(15), category: "Maintenance", description: "Plumbing repair", amount: 2100, paidBy: "Manoj Verma", paymentMethod: "Cash", notes: "" },
      { id: "ex13", expenseId: "EXP013", date: daysAgo(18), category: "Transport", description: "Market pickup auto fare", amount: 600, paidBy: "Lakshmi Priya", paymentMethod: "Cash", notes: "" },
      { id: "ex14", expenseId: "EXP014", date: daysAgo(20), category: "Other", description: "Staff uniforms", amount: 3500, paidBy: "Divya Shree", paymentMethod: "Card", notes: "" },
      { id: "ex15", expenseId: "EXP015", date: daysAgo(25), category: "Food", description: "Spices & condiments", amount: 3100, paidBy: "Suresh Kumar", paymentMethod: "Cash", notes: "" },
    ];

    const activity = [
      { id: "a1", type: "employee", message: "New employee Vikram Singh added to Kitchen department", timestamp: isoNowMinus(3) },
      { id: "a2", type: "salary", message: "Salary updated for Ramesh Iyer - August 2026", timestamp: isoNowMinus(5) },
      { id: "a3", type: "delivery", message: "Delivery DLV010 marked as Delivered", timestamp: isoNowMinus(8) },
      { id: "a4", type: "location", message: "Karthik Subramaniam updated location to Adyar Signal", timestamp: isoNowMinus(0.5) },
      { id: "a5", type: "expense", message: "Expense added: Vegetables & groceries - ₹8,500", timestamp: isoNowMinus(24) },
      { id: "a6", type: "delivery", message: "Delivery staff Farhan Ahmed set to Available", timestamp: isoNowMinus(30) },
      { id: "a7", type: "customer", message: "New customer Naveen Kumar subscribed (Monthly)", timestamp: isoNowMinus(48) },
      { id: "a8", type: "expense", message: "Expense added: LPG cylinder refill - ₹3,200", timestamp: isoNowMinus(50) },
    ];

    return { employees, salaries, deliveryStaff, deliveries, customers, food, expenses, activity };
  }

  function notify() {
    listeners.forEach((fn) => {
      try { fn(); } catch (e) { console.error(e); }
    });
  }

  function cacheLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* ignore quota */ }
  }

  function saveLocalOnly() {
    cacheLocal();
    notify();
  }

  function save() {
    if (applyingRemote) return;
    cacheLocal();
    notify();

    if (!cloudEnabled) return;

    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      persistCloudState().catch((e) => {
        console.error("Failed to save to cloud", e);
        if (typeof UI !== "undefined" && UI.toast) {
          UI.toast("Cloud save failed — data kept on this device", "error");
        }
      });
    }, 350);
  }

  async function persistCloudState() {
    if (cloudProvider === "supabase" && sb) {
      const { error } = await sb.from("app_data").upsert({
        id: SB_STATE_ID,
        payload: state,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return;
    }
    if (cloudProvider === "firebase" && db) {
      await db.ref(CLOUD_STATE_PATH).set(state);
    }
  }

  async function persistCloudSettings() {
    if (cloudProvider === "supabase" && sb) {
      const { error } = await sb.from("app_data").upsert({
        id: SB_SETTINGS_ID,
        payload: settings,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return;
    }
    if (cloudProvider === "firebase" && db) {
      await db.ref(CLOUD_SETTINGS_PATH).set(settings);
    }
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state = normalizeState(JSON.parse(raw));
        // Auto-seed demo data if all collections are empty (fresh install)
        const isEmpty = Object.values(state).every((v) => !Array.isArray(v) || v.length === 0);
        if (isEmpty) {
          state = buildDemoData();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
        return true;
      }
    } catch (e) { /* ignore */ }
    // No saved data at all — seed demo data
    state = buildDemoData();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    return true;
  }

  function loadSettingsLocal() {
    try {
      settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    } catch (e) {
      settings = {};
    }
  }

  function getSettings() {
    return { ...settings };
  }

  function saveSettings(obj) {
    settings = { ...obj };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) { /* ignore */ }

    if (cloudEnabled) {
      persistCloudSettings().catch((e) => {
        console.error("Failed to save settings to cloud", e);
      });
    }
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }

  function getAll(collection) {
    return state[collection] || [];
  }
  function getById(collection, id) {
    return (state[collection] || []).find((x) => x.id === id);
  }
  function add(collection, record) {
    if (!record.id) record.id = Utils.uid(collection.slice(0, 3));
    state[collection].push(record);
    save();
    return record;
  }
  function update(collection, id, patch) {
    const idx = state[collection].findIndex((x) => x.id === id);
    if (idx === -1) return null;
    state[collection][idx] = { ...state[collection][idx], ...patch };
    save();
    return state[collection][idx];
  }
  function remove(collection, id) {
    state[collection] = state[collection].filter((x) => x.id !== id);
    save();
  }

  function logActivity(type, message) {
    state.activity.unshift({ id: Utils.uid("a"), type, message, timestamp: new Date().toISOString() });
    state.activity = state.activity.slice(0, 30);
    save();
  }

  function resetDemoData() {
    state = buildDemoData();
    save();
  }

  function clearAllData() {
    state = emptyData();
    save();
  }

  function isCloudEnabled() {
    return cloudEnabled;
  }

  function getCloudProvider() {
    return cloudProvider;
  }

  function ready() {
    return readyPromise;
  }

  function bootLocal() {
    if (!loadLocal()) state = emptyData();
    saveLocalOnly();
  }

  async function clearDemoSeedOnce() {
    // Keep existing data (including demo staff/locations) so the map has pins.
    return false;
  }

  function finishReady() {
    if (!state) bootLocal();
    readyResolve();
  }

  function initSupabaseClient() {
    if (typeof supabase === "undefined" || typeof isSupabaseConfigured !== "function" || !isSupabaseConfigured()) {
      return false;
    }
    try {
      const createClient = supabase.createClient || (window.supabase && window.supabase.createClient);
      if (!createClient) return false;
      sb = createClient(SupabaseConfig.url, SupabaseConfig.anonKey);
      cloudProvider = "supabase";
      cloudEnabled = true;
      return true;
    } catch (e) {
      console.error("Supabase init failed", e);
      sb = null;
      return false;
    }
  }

  async function initFirebaseClient() {
    if (typeof firebase === "undefined" || typeof isFirebaseConfigured !== "function" || !isFirebaseConfigured()) {
      return false;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(FirebaseConfig);
      db = firebase.database();
      cloudProvider = "firebase";
      cloudEnabled = true;
      return true;
    } catch (e) {
      console.error("Firebase init failed", e);
      db = null;
      return false;
    }
  }

  function payloadFromRow(row) {
    if (!row) return null;
    const p = row.payload;
    if (p == null) return null;
    if (typeof p === "string") {
      try { return JSON.parse(p); } catch (_) { return null; }
    }
    return p;
  }

  async function bootSupabase() {
    const { data: stateRow, error: stateErr } = await Promise.race([
      sb.from("app_data").select("payload").eq("id", SB_STATE_ID).maybeSingle(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Cloud timeout")), 6000)),
    ]);
    if (stateErr) throw stateErr;

    // One-time wipe of sample/demo data for real client use (after cloud is connected)
    const cleared = await clearDemoSeedOnce();
    if (!cleared) {
      const remote = payloadFromRow(stateRow);
      const hasRemoteCollections = remote && typeof remote === "object" && Object.keys(remote).some((k) => Array.isArray(remote[k]));

      if (hasRemoteCollections) {
        state = normalizeState(remote);
      } else if (loadLocal()) {
        await persistCloudState();
      } else {
        state = emptyData();
        await persistCloudState();
      }
      cacheLocal();
    }

    if (!cleared) {
      try {
        const { data: settingsRow, error: settingsErr } = await sb
          .from("app_data")
          .select("payload")
          .eq("id", SB_SETTINGS_ID)
          .maybeSingle();
        if (settingsErr) throw settingsErr;
        const remoteSettings = payloadFromRow(settingsRow);
        if (remoteSettings && typeof remoteSettings === "object" && Object.keys(remoteSettings).length) {
          settings = remoteSettings;
          try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) {}
        } else if (Object.keys(settings).length) {
          await persistCloudSettings();
        }
      } catch (e) {
        console.warn("Cloud settings load skipped", e);
      }
    }

    // Live updates across browsers
    try {
      sb.channel("app_data_changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "app_data" }, (payload) => {
          const row = payload.new;
          if (!row || !row.id) return;
          if (row.id === SB_STATE_ID) {
            const next = payloadFromRow(row);
            if (!next) return;
            applyingRemote = true;
            state = normalizeState(next);
            cacheLocal();
            notify();
            applyingRemote = false;
          } else if (row.id === SB_SETTINGS_ID) {
            const nextSettings = payloadFromRow(row);
            if (!nextSettings || typeof nextSettings !== "object") return;
            settings = nextSettings;
            try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) {}
          }
        })
        .subscribe();
    } catch (e) {
      console.warn("Realtime subscribe skipped", e);
    }
  }

  async function bootFirebase() {
    const snap = await Promise.race([
      db.ref(CLOUD_STATE_PATH).once("value"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Cloud timeout")), 4000)),
    ]);
    const remote = snap.val();
    if (remote) {
      state = normalizeState(remote);
    } else if (loadLocal()) {
      await db.ref(CLOUD_STATE_PATH).set(state);
    } else {
      state = emptyData();
      await db.ref(CLOUD_STATE_PATH).set(state);
    }
    cacheLocal();

    try {
      const settingsSnap = await Promise.race([
        db.ref(CLOUD_SETTINGS_PATH).once("value"),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Settings timeout")), 4000)),
      ]);
      const remoteSettings = settingsSnap.val();
      if (remoteSettings && typeof remoteSettings === "object") {
        settings = remoteSettings;
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) {}
      } else if (Object.keys(settings).length) {
        await db.ref(CLOUD_SETTINGS_PATH).set(settings);
      }
    } catch (e) {
      console.warn("Cloud settings load skipped", e);
    }

    db.ref(CLOUD_STATE_PATH).on("value", (snapVal) => {
      const remoteVal = snapVal.val();
      if (!remoteVal) return;
      applyingRemote = true;
      state = normalizeState(remoteVal);
      cacheLocal();
      notify();
      applyingRemote = false;
    });

    db.ref(CLOUD_SETTINGS_PATH).on("value", (snapVal) => {
      const remoteSettings = snapVal.val();
      if (!remoteSettings || typeof remoteSettings !== "object") return;
      settings = remoteSettings;
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) {}
    });
  }

  async function bootCloud() {
    loadSettingsLocal();

    if (initSupabaseClient()) {
      try {
        await bootSupabase();
        finishReady();
        return;
      } catch (e) {
        console.error("Supabase load failed, trying fallback", e);
        cloudEnabled = false;
        cloudProvider = "local";
        sb = null;
      }
    }

    const fbOk = await initFirebaseClient();
    if (fbOk) {
      try {
        await bootFirebase();
        finishReady();
        return;
      } catch (e) {
        console.error("Firebase load failed, using local data", e);
        cloudEnabled = false;
        cloudProvider = "local";
      }
    }

    await clearDemoSeedOnce();
    if (!state) bootLocal();
    finishReady();
  }

  loadSettingsLocal();
  bootCloud().catch((e) => {
    console.error("Store boot failed", e);
    cloudEnabled = false;
    cloudProvider = "local";
    clearDemoSeedOnce().finally(() => {
      if (!state) bootLocal();
      finishReady();
    });
  });

  setTimeout(() => {
    if (!state) bootLocal();
    readyResolve();
  }, 7000);

  return {
    getAll, getById, add, update, remove, subscribe, logActivity, resetDemoData, clearAllData,
    ready, isCloudEnabled, getCloudProvider, getSettings, saveSettings,
    get state() { return state; },
  };
})();
