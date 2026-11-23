
import { useState, useEffect } from "react";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_URL = `${API_BASE_URL}/api/expenses`;
const AUTH_URL = `${API_BASE_URL}/api/auth`;

const categories = [
  "Food",
  "Travel",
  "Shopping",
  "Education",
  "Other"
];

const COLORS = [
  "#263b80",
  "#10a36a",
  "#f59e0b",
  "#8b5cf6",
  "#e74c3c"
];

function App() {
  // Authentication states
  const [token, setToken] = useState(
    localStorage.getItem("expenseToken") || ""
  );

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("expenseUser") || "null")
  );

  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Expense states
  const [expenses, setExpenses] = useState([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [editingId, setEditingId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("all");

  // Logout
  const logout = () => {
    localStorage.removeItem("expenseToken");
    localStorage.removeItem("expenseUser");

    setToken("");
    setUser(null);
    setExpenses([]);
    setEditingId(null);
    setTitle("");
    setAmount("");
    setSelectedMonth("all");
  };

  // Authentication headers
  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  // Login and Register
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError("");

    if (!authEmail.trim() || !authPassword) {
      setAuthError("Please enter your email and password.");
      return;
    }

    if (authMode === "register" && !authName.trim()) {
      setAuthError("Please enter your name.");
      return;
    }

    setAuthLoading(true);

    try {
      if (authMode === "register") {
        await axios.post(`${AUTH_URL}/register`, {
          name: authName,
          email: authEmail,
          password: authPassword
        });

        alert("Registration successful! Please login.");
        setAuthMode("login");
        setAuthName("");
        setAuthPassword("");
      } else {
        const response = await axios.post(`${AUTH_URL}/login`, {
          email: authEmail,
          password: authPassword
        });

        localStorage.setItem(
          "expenseToken",
          response.data.token
        );

        localStorage.setItem(
          "expenseUser",
          JSON.stringify(response.data.user)
        );

        setToken(response.data.token);
        setUser(response.data.user);
        setAuthPassword("");
      }
    } catch (error) {
      setAuthError(
        error.response?.data?.message ||
        "Something went wrong. Please try again."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  // Fetch expenses
  const fetchExpenses = async () => {
    try {
      const response = await axios.get(API_URL, authHeaders);
      setExpenses(response.data);
    } catch (error) {
      console.error("Error fetching expenses:", error);

      if (error.response?.status === 401) {
        alert("Your session has expired. Please login again.");
        logout();
      }
    }
  };

  useEffect(() => {
    if (token) {
      fetchExpenses();
    }
  }, [token]);

  // Add expense
  const addExpense = async (e) => {
    e.preventDefault();

    if (!title.trim() || !amount || Number(amount) <= 0) {
      alert("Please enter a valid title and amount.");
      return;
    }

    try {
      await axios.post(
        API_URL,
        {
          title,
          amount: Number(amount),
          category
        },
        authHeaders
      );

      setTitle("");
      setAmount("");
      setCategory("Food");
      fetchExpenses();
    } catch (error) {
      console.error("Error adding expense:", error);
      alert(error.response?.data?.message || "Could not add expense.");
    }
  };

  // Edit expense
  const startEditing = (expense) => {
    setEditingId(expense._id);
    setTitle(expense.title);
    setAmount(expense.amount);
    setCategory(expense.category);
  };

  // Update expense
  const updateExpense = async (e) => {
    e.preventDefault();

    if (!title.trim() || !amount || Number(amount) <= 0) {
      alert("Please enter a valid title and amount.");
      return;
    }

    try {
      await axios.put(
        `${API_URL}/${editingId}`,
        {
          title,
          amount: Number(amount),
          category
        },
        authHeaders
      );

      cancelEditing();
      fetchExpenses();
    } catch (error) {
      console.error("Error updating expense:", error);
      alert(error.response?.data?.message || "Could not update expense.");
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setTitle("");
    setAmount("");
    setCategory("Food");
  };

  // Delete expense
  const deleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/${id}`, authHeaders);
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert(error.response?.data?.message || "Could not delete expense.");
    }
  };

  // Format month
  const formatMonth = (monthKey) => {
    const [year, month] = monthKey.split("-");

    return new Date(Number(year), Number(month) - 1)
      .toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric"
      });
  };

  // Month options
  const monthOptions = [
    ...new Set(
      expenses.map((expense) => {
        const date = new Date(expense.date);

        return `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
      })
    )
  ].sort().reverse();

  // Filter expenses
  const filteredExpenses =
    selectedMonth === "all"
      ? expenses
      : expenses.filter((expense) => {
          const date = new Date(expense.date);

          const monthKey = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}`;

          return monthKey === selectedMonth;
        });

  // Total expenses
  const totalExpense = filteredExpenses.reduce(
    (total, expense) => total + Number(expense.amount),
    0
  );

  // Category totals
  const categoryTotals = categories.map((cat) => ({
    name: cat,
    amount: filteredExpenses
      .filter((expense) => expense.category === cat)
      .reduce(
        (total, expense) => total + Number(expense.amount),
        0
      )
  }));

  const pieData = categoryTotals.filter(
    (item) => item.amount > 0
  );

  // Monthly spending data
  const monthlyTotals = {};

  expenses.forEach((expense) => {
    const date = new Date(expense.date);

    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

    monthlyTotals[monthKey] =
      (monthlyTotals[monthKey] || 0) + Number(expense.amount);
  });

  const monthlyChartData = Object.keys(monthlyTotals)
    .sort()
    .map((monthKey) => ({
      month: formatMonth(monthKey),
      amount: monthlyTotals[monthKey]
    }));

  // Login / Register screen
  if (!token || !user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">ExpenseEase</div>

          <p className="auth-subtitle">
            Manage your money. Take control of your spending.
          </p>

          <div className="auth-tabs">
            <button
              type="button"
              className={authMode === "login" ? "active-tab" : ""}
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
            >
              Login
            </button>

            <button
              type="button"
              className={authMode === "register" ? "active-tab" : ""}
              onClick={() => {
                setAuthMode("register");
                setAuthError("");
              }}
            >
              Register
            </button>
          </div>

          <h2>
            {authMode === "login"
              ? "Welcome Back!"
              : "Create Your Account"}
          </h2>

          <p className="auth-description">
            {authMode === "login"
              ? "Login to continue to your dashboard."
              : "Sign up to start managing your expenses."}
          </p>

          <form onSubmit={handleAuth} className="auth-form">
            {authMode === "register" && (
              <input
                type="text"
                placeholder="Full Name"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                required
              />
            )}

            <input
              type="email"
              placeholder="Email Address"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password (minimum 6 characters)"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              minLength="6"
              required
            />

            {authError && (
              <p className="auth-error">{authError}</p>
            )}

            <button type="submit" disabled={authLoading}>
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                ? "Login"
                : "Create Account"}
            </button>
          </form>

          <p className="auth-switch">
            {authMode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}

            <span
              onClick={() => {
                setAuthMode(
                  authMode === "login" ? "register" : "login"
                );
                setAuthError("");
              }}
            >
              {authMode === "login" ? "Register" : "Login"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="app">

      <header className="header">
        <div>
          <h1>ExpenseEase</h1>
          <p>Manage your expenses smartly and easily</p>
        </div>

        <div className="header-user">
          <span>Welcome, {user.name}!</span>
          <button className="logout-button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="container">

        {/* Total Summary */}
        <section className="summary">
          <h2>Total Expenses</h2>
          <h1>₹{totalExpense.toLocaleString("en-IN")}</h1>
          <p>
            {selectedMonth === "all"
              ? "Your overall spending"
              : `Spending for ${formatMonth(selectedMonth)}`}
          </p>
        </section>

        {/* Monthly Filter */}
        <section className="section month-filter">
          <div>
            <h2>Monthly Overview</h2>
            <p>Choose a month to view your expenses</p>
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="all">All Months</option>

            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {formatMonth(month)}
              </option>
            ))}
          </select>
        </section>

        {/* Add or Edit Expense */}
        <section className="section">
          <h2>
            {editingId ? "Update Expense" : "Add New Expense"}
          </h2>

          <form
            className="expense-form"
            onSubmit={editingId ? updateExpense : addExpense}
          >
            <input
              type="text"
              placeholder="Expense Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <input
              type="number"
              placeholder="Amount (₹)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              required
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <button type="submit">
              {editingId ? "Update Expense" : "Add Expense"}
            </button>

            {editingId && (
              <button
                type="button"
                className="cancel-button"
                onClick={cancelEditing}
              >
                Cancel
              </button>
            )}
          </form>
        </section>

        {/* Category Summary */}
        <section className="section">
          <h2>Category-wise Expenses</h2>

          <div className="category-grid">
            {categoryTotals.map((item, index) => (
              <div className="category-card" key={item.name}>
                <div
                  className="category-dot"
                  style={{ backgroundColor: COLORS[index] }}
                ></div>

                <h3>{item.name}</h3>

                <p>
                  ₹{item.amount.toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Donut Chart */}
        <section className="section chart-section">
          <h2>Expense Distribution</h2>

          {pieData.length > 0 ? (
            <div className="chart-wrapper">
              <PieChart width={500} height={380}>
                <Pie
                  data={pieData}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="48%"
                  innerRadius={85}
                  outerRadius={135}
                  paddingAngle={5}
                  cornerRadius={8}
                  stroke="white"
                  strokeWidth={3}
                  label={({ percent }) =>
                    `${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[categories.indexOf(entry.name)]}
                    />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value) =>
                    `₹${Number(value).toLocaleString("en-IN")}`
                  }
                />

                <Legend verticalAlign="bottom" />

                <text
                  x="250"
                  y="175"
                  textAnchor="middle"
                  fill="#777"
                  fontSize="14"
                >
                  Total Spent
                </text>

                <text
                  x="250"
                  y="200"
                  textAnchor="middle"
                  fill="#263b80"
                  fontSize="22"
                  fontWeight="bold"
                >
                  ₹{totalExpense.toLocaleString("en-IN")}
                </text>
              </PieChart>
            </div>
          ) : (
            <p className="empty-chart">
              No expenses available for this month.
            </p>
          )}
        </section>

        {/* Monthly Bar Chart */}
        <section className="section chart-section">
          <h2>Monthly Spending Trend</h2>

          <p className="chart-description">
            Compare your spending across different months.
          </p>

          {monthlyChartData.length > 0 ? (
            <div className="bar-chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />

                  <Tooltip
                    formatter={(value) =>
                      `₹${Number(value).toLocaleString("en-IN")}`
                    }
                  />

                  <Legend />

                  <Bar
                    dataKey="amount"
                    name="Monthly Expenses"
                    radius={[6, 6, 0, 0]}
                  >
                    {monthlyChartData.map((entry, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="empty-chart">
              Add expenses to see your monthly spending trend.
            </p>
          )}
        </section>

        {/* Transaction History */}
        <section className="section">
          <h2>Transaction History</h2>

          {filteredExpenses.length > 0 ? (
            <div className="transaction-list">
              {filteredExpenses.map((expense) => (
                <div className="expense-item" key={expense._id}>
                  <div>
                    <h3>{expense.title}</h3>
                    <p>Category: {expense.category}</p>

                    <p>
                      Date:{" "}
                      {new Date(expense.date).toLocaleDateString("en-IN")}
                    </p>
                  </div>

                  <div className="expense-actions">
                    <strong>
                      ₹{Number(expense.amount).toLocaleString("en-IN")}
                    </strong>

                    <button
                      className="edit-button"
                      onClick={() => startEditing(expense)}
                    >
                      Edit
                    </button>

                    <button
                      className="delete-button"
                      onClick={() => deleteExpense(expense._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-chart">
              No expenses found. Add your first expense!
            </p>
          )}
        </section>

      </main>
    </div>
  );
}

export default App;
