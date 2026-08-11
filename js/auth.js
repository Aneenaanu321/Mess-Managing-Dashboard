/* ==========================================================================
   Auth — local accounts + session (browser storage)
   ========================================================================== */

const Auth = (() => {
  const USERS_KEY = "mm-auth-users";
  const SESSION_KEY = "mm-auth-session";
  const DEFAULT_PASSWORD = "Mess@2026";

  const ROLES = {
    admin: { label: "Admin", hint: "Full access to manage mess operations" },
    manager: { label: "Manager", hint: "Manage staff, deliveries, and expenses" },
    user: { label: "User", hint: "Read dashboards and exports" },
  };

  // Fixed team accounts
  const SEED_USERS = [
    { email: "harishdas132@gmail.com", role: "manager", password: DEFAULT_PASSWORD },
    { email: "aneenaantony321@gmail.com", role: "admin", password: DEFAULT_PASSWORD },
  ];

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function ensureSeedUsers() {
    const users = getUsers();
    let changed = false;

    SEED_USERS.forEach((seed) => {
      const email = normalizeEmail(seed.email);
      const existing = users.find((u) => u.email === email);
      if (!existing) {
        users.push({
          email,
          username: email,
          password: seed.password,
          role: seed.role,
          createdAt: new Date().toISOString(),
          seeded: true,
        });
        changed = true;
        return;
      }
      // Keep seeded team accounts in sync
      if (existing.role !== seed.role || existing.password !== seed.password) {
        existing.role = seed.role;
        existing.password = seed.password;
        existing.seeded = true;
        changed = true;
      }
    });

    if (changed) saveUsers(users);
    return users;
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function setSession(user, remember) {
    const session = {
      email: user.email,
      username: user.username || user.email,
      role: user.role || "user",
      loggedInAt: new Date().toISOString(),
    };
    const payload = JSON.stringify(session);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    if (remember) localStorage.setItem(SESSION_KEY, payload);
    else sessionStorage.setItem(SESSION_KEY, payload);
    return session;
  }

  function isLoggedIn() {
    return !!getSession();
  }

  function requireAuth() {
    if (isLoggedIn()) return true;
    const next = encodeURIComponent(window.location.pathname + window.location.hash);
    window.location.href = `login.html?next=${next}`;
    return false;
  }

  function signup({ username, password, confirmPassword, role }) {
    ensureSeedUsers();
    const email = normalizeEmail(username);
    const seed = SEED_USERS.find((u) => normalizeEmail(u.email) === email);

    if (!seed) {
      return { ok: false, error: "Only approved team emails can create an account." };
    }
    if (!password || password.length < 6) {
      return { ok: false, error: "Password must be at least 6 characters." };
    }
    if (password !== confirmPassword) {
      return { ok: false, error: "Passwords do not match." };
    }

    const users = getUsers();
    const existing = users.find((u) => u.email === email);
    if (existing) {
      return { ok: false, error: "This account already exists. Please sign in." };
    }

    // Role is fixed per approved email
    const fixedRole = seed.role;
    if (role && role !== fixedRole) {
      return { ok: false, error: `This email is assigned the ${ROLES[fixedRole].label} role.` };
    }

    users.push({
      email,
      username: email,
      password,
      role: fixedRole,
      createdAt: new Date().toISOString(),
    });
    saveUsers(users);
    setSession(users[users.length - 1], true);
    return { ok: true };
  }

  function login({ email, password, remember }) {
    ensureSeedUsers();
    const normalized = normalizeEmail(email);
    if (!normalized || !password) {
      return { ok: false, error: "Email and password are required." };
    }

    const user = getUsers().find((u) => u.email === normalized && u.password === password);
    if (!user) {
      return { ok: false, error: "Invalid email or password." };
    }

    setSession(user, !!remember);
    return { ok: true };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = "login.html";
  }

  function roleMeta(role) {
    return ROLES[role] || ROLES.user;
  }

  function initials(session) {
    const source = (session && (session.username || session.email)) || "A";
    return source.charAt(0).toUpperCase();
  }

  function displayName(session) {
    if (!session) return "Guest";
    const email = session.username || session.email || "";
    return email.split("@")[0] || "User";
  }

  ensureSeedUsers();

  return {
    ROLES,
    SEED_USERS,
    DEFAULT_PASSWORD,
    getSession,
    isLoggedIn,
    requireAuth,
    signup,
    login,
    logout,
    roleMeta,
    initials,
    displayName,
    ensureSeedUsers,
  };
})();
