import "../expense-ui.css";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpLeft, ChartNoAxesColumn, ChevronLeft, Download, Home as HomeIcon, List, Plus, Search, ShieldCheck, Wallet } from "lucide-react";
import ExpenseForm from "../components/ExpenseForm";
import ExpenseBackup from "../components/ExpenseBackup";
import ExpenseList from "../components/ExpenseList";
import ExpenseReports from "../components/ExpenseReports";
import PwaStatus from "../components/PwaStatus";
import ExpenseSearch from "../components/ExpenseSearch";
import { DateRangePicker, type DateRange } from "../components/ui/date-range-picker";
import { categories } from "../constants/categories";
import { paymentMethods } from "../constants/paymentMethods";
import { JALALI_MONTHS, jalaliMonthLength, toGregorian, toJalali } from "../lib/jalali";
import type { Expense } from "../models/Expense";
import { getExpenses } from "../services/expenseService";
import { getMonthlyReport } from "../utils/expenseReports";
import { exportExpensesToCsv } from "../utils/exportExpensesToCsv";

type Page = "home" | "expenses" | "reports" | "backup" | "form";
type SortOption = "newest" | "oldest" | "highest" | "lowest";
const featuredCategories = ["همه", "🍔 خوراک", "🛒 خرید", "🏠 خانه"];
const money = (amount: number) => amount.toLocaleString("fa-IR");
function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function monthOf(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (dateKey(date) !== value) return null;
  return toJalali(date);
}
function monthComparison(expenses: Expense[], today: Date) {
  const { jy, jm, jd } = toJalali(today);
  const py = jm === 1 ? jy - 1 : jy;
  const pm = jm === 1 ? 12 : jm - 1;
  const lastDate = dateKey(toGregorian(py, pm, Math.min(jd, jalaliMonthLength(py, pm))));
  let current = 0, previous = 0;
  for (const expense of expenses) {
    const month = monthOf(expense.date);
    if (!month) continue;
    if (month.jy === jy && month.jm === jm && expense.date <= dateKey(today)) current += expense.amount;
    if (month.jy === py && month.jm === pm && expense.date <= lastDate) previous += expense.amount;
  }
  return { current, previous, label: `${JALALI_MONTHS[jm - 1]} ${jy.toLocaleString("fa-IR", { useGrouping: false })}` };
}
export default function Home() {
  const [page, setPage] = useState<Page>("home");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [formReturn, setFormReturn] = useState<Page>("home");
  const [formGeneration, setFormGeneration] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("همه");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("همه");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [feedback, setFeedback] = useState("");
  async function loadExpenses() { setExpenses(await getExpenses()); }
  useEffect(() => {
    let active = true;
    getExpenses().then((data) => { if (active) setExpenses(data); }).catch((error) => console.error("بارگذاری هزینه‌ها انجام نشد.", error));
    return () => { active = false; };
  }, []);
  function navigate(next: Page) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function openForm(expense?: Expense) {
    setFormReturn(page);
    setEditingExpense(expense);
    setFormGeneration((value) => value + 1);
    navigate("form");
  }
  function afterSave() {
    setFeedback(editingExpense ? "تغییرات هزینه ذخیره شد." : "هزینه با موفقیت ثبت شد.");
    setEditingExpense(undefined);
    void loadExpenses();
    navigate("home");
  }
  function clearFilters() {
    setSearchText(""); setSelectedCategory("همه"); setSelectedPaymentMethod("همه");
    setSortOption("newest"); setDateRange({ from: null, to: null });
  }
  function afterRestore() {
    setEditingExpense(undefined); setFormGeneration((value) => value + 1);
    clearFilters(); void loadExpenses();
  }
  function quickRange(days: number) {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start.setDate(start.getDate() - days + 1);
    setDateRange({ from: start, to: today });
  }
  const comparison = monthComparison(expenses, new Date());
  const percent = comparison.previous > 0 ? Math.round((comparison.current - comparison.previous) / comparison.previous * 100) : null;
  const from = dateRange.from ? dateKey(dateRange.from) : "";
  const to = dateRange.to ? dateKey(dateRange.to) : "";
  const query = searchText.trim().toLocaleLowerCase("fa");
  const filtered = expenses.filter((item) =>
    (!query || [item.storeName, item.category, item.paymentMethod, item.description ?? ""].some((value) => value.toLocaleLowerCase("fa").includes(query)))
    && (selectedCategory === "همه" || item.category === selectedCategory)
    && (selectedPaymentMethod === "همه" || item.paymentMethod === selectedPaymentMethod)
    && (!from || item.date >= from) && (!to || item.date <= to));
  const sorted = [...filtered].sort((a, b) => {
    if (sortOption === "highest") return b.amount - a.amount;
    if (sortOption === "lowest") return a.amount - b.amount;
    const order = a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0);
    return sortOption === "oldest" ? order : -order;
  });
  const monthly = getMonthlyReport(expenses);
  const monthlyMax = Math.max(1, ...monthly.map((item) => item.amount));
  const categoryChips = <div className="ffos-chip-row" role="group" aria-label="فیلتر دسته‌بندی">{featuredCategories.map((item) =>
    <button key={item} type="button" className={`ffos-chip ${selectedCategory === item ? "is-active" : ""}`}
      onClick={() => setSelectedCategory(item)}>{item === "همه" ? item : item.replace(/^\S+\s/, "")}</button>)}</div>;
  const search = <div className="ffos-search-wrap"><Search size={19} /><ExpenseSearch value={searchText} onSearch={setSearchText} /></div>;
  return <main className="ffos-app" dir="rtl"><div className="ffos-shell">
    {page === "home" && <>
      <header className="ffos-header"><div><p className="ffos-eyebrow">FFOS · فضای مالی شما</p><h1>امور مالی خانواده</h1><p className="ffos-muted">{comparison.label} · با آرامش از هزینه‌ها باخبر باشید</p></div><span className="ffos-header-mark" aria-hidden="true"><Wallet size={27} /></span></header>
      <PwaStatus />{feedback && <p className="ffos-notice" role="status">{feedback}</p>}
      <section className="ffos-hero" aria-label="خلاصه هزینه ماه جاری"><div><span className="ffos-eyebrow">هزینه این ماه تا امروز</span><div className="ffos-hero-total"><strong>{money(comparison.current)}</strong><span>تومان</span></div>
        {percent === null ? <p className="ffos-comparison">برای مقایسه، هزینه‌ای در همین بازه از ماه قبل ندارید.</p>
          : <p className={`ffos-comparison ${percent > 0 ? "is-up" : "is-down"}`}>{percent > 0 ? <ArrowUpLeft size={18} /> : <ArrowDownLeft size={18} />}<strong>{money(Math.abs(percent))}٪ {percent > 0 ? "بیشتر" : percent < 0 ? "کمتر" : "بدون تغییر"}</strong><span>از همین بازه در ماه گذشته</span></p>}
      </div><span className="ffos-hero-icon" aria-hidden="true"><Wallet size={40} /></span></section>
      <button className="ffos-primary ffos-add" type="button" onClick={() => openForm()}><Plus size={22} /> ثبت هزینه</button>
      <section className="ffos-section"><div className="ffos-section-title"><div><span className="ffos-kicker">آنچه تازه ثبت شده</span><h2>هزینه‌های اخیر</h2></div><button className="ffos-text-button" type="button" onClick={() => navigate("expenses")}>مشاهده همه <ChevronLeft size={17} /></button></div>
        {search}{categoryChips}<ExpenseList expenses={sorted.slice(0, 3)} compact onExpenseDeleted={loadExpenses} onExpenseEdit={openForm} /></section>
      <section className="ffos-section"><div className="ffos-section-title"><div><span className="ffos-kicker">نمایی از ماه‌های گذشته</span><h2>روند هزینه‌ها</h2></div><button className="ffos-text-button" type="button" onClick={() => navigate("reports")}>جزئیات <ChevronLeft size={17} /></button></div>
        <div className="ffos-card ffos-mini-chart">{!monthly.some((item) => item.amount > 0) ? <p className="ffos-empty">پس از ثبت هزینه در شش ماه اخیر، نمودار اینجا نمایش داده می‌شود.</p>
          : monthly.map((item) => <div className="ffos-mini-bar" key={item.monthKey} title={`${item.label}: ${money(item.amount)} تومان`}><div className="ffos-mini-bar-area"><span style={{ height: `${Math.max(item.amount ? 12 : 3, item.amount / monthlyMax * 100)}%` }} /></div><small>{item.label.split(" ")[0]}</small></div>)}</div></section>
    </>}
    {page === "form" && <><PageHeader title={editingExpense ? "ویرایش هزینه" : "ثبت هزینه"} subtitle="جزئیات هزینه را وارد کنید" onBack={() => navigate(formReturn)} /><ExpenseForm key={formGeneration} editingExpense={editingExpense} onSaved={afterSave} onCancel={() => navigate(formReturn)} /></>}
    {page === "expenses" && <><PageHeader title="هزینه‌ها" subtitle="مرور، جستجو و مدیریت هزینه‌های ثبت‌شده" />
      <button className="ffos-primary ffos-page-action" type="button" onClick={() => openForm()}><Plus size={20} /> ثبت هزینه</button>
      <div className="ffos-card ffos-filter-panel">{search}{categoryChips}<div className="ffos-filter-grid">
        <label>دسته‌بندی<select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}><option value="همه">همه دسته‌ها</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>روش پرداخت<select value={selectedPaymentMethod} onChange={(e) => setSelectedPaymentMethod(e.target.value)}><option value="همه">همه روش‌ها</option>{paymentMethods.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>مرتب‌سازی<select value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)}><option value="newest">جدیدترین</option><option value="oldest">قدیمی‌ترین</option><option value="highest">بیشترین مبلغ</option><option value="lowest">کمترین مبلغ</option></select></label>
        <div className="ffos-range-field"><span>بازه تاریخ</span><DateRangePicker value={dateRange} onChange={setDateRange} months={1} placeholder="انتخاب بازه" /></div>
      </div><div className="ffos-filter-actions"><button type="button" className="ffos-chip" onClick={() => quickRange(1)}>امروز</button><button type="button" className="ffos-chip" onClick={() => quickRange(7)}>۷ روز اخیر</button><button type="button" className="ffos-chip" onClick={() => quickRange(30)}>۳۰ روز اخیر</button><button type="button" className="ffos-link" onClick={clearFilters}>پاک‌کردن فیلترها</button></div></div>
      <div className="ffos-section-title"><div><span className="ffos-kicker">{money(sorted.length)} مورد</span><h2>فهرست هزینه‌ها</h2></div><button className="ffos-text-button" type="button" onClick={() => exportExpensesToCsv(sorted)}><Download size={17} /> خروجی CSV</button></div>
      <ExpenseList expenses={sorted} onExpenseDeleted={loadExpenses} onExpenseEdit={openForm} /></>}
    {page === "reports" && <><PageHeader title="گزارش هزینه‌ها" subtitle="الگوی هزینه‌ها را در یک نگاه ببینید" /><ExpenseReports expenses={expenses} /></>}
    {page === "backup" && <><PageHeader title="پشتیبان و داده‌ها" subtitle="هزینه‌ها روی همین دستگاه نگهداری می‌شوند" /><div className="ffos-backup-intro"><ShieldCheck size={24} /><p>برای جابه‌جایی داده‌ها یا نگهداری نسخهٔ امن، فایل پشتیبان JSON بگیرید.</p></div><ExpenseBackup currentCount={expenses.length} onRestored={afterRestore} /></>}
  </div>{page !== "form" && <nav className="ffos-bottom-nav" aria-label="بخش‌های برنامه">
    <NavButton icon={<HomeIcon size={21} />} label="خانه" active={page === "home"} onClick={() => navigate("home")} />
    <NavButton icon={<List size={21} />} label="هزینه‌ها" active={page === "expenses"} onClick={() => navigate("expenses")} />
    <NavButton icon={<ChartNoAxesColumn size={21} />} label="گزارش‌ها" active={page === "reports"} onClick={() => navigate("reports")} />
    <NavButton icon={<ShieldCheck size={21} />} label="پشتیبان" active={page === "backup"} onClick={() => navigate("backup")} />
  </nav>}</main>;
}
function PageHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack?: () => void }) {
  return <header className="ffos-page-header"><div><p className="ffos-eyebrow">FFOS · امور مالی خانواده</p><h1>{title}</h1><p className="ffos-muted">{subtitle}</p></div>{onBack && <button type="button" className="ffos-back" onClick={onBack} aria-label="بازگشت به هزینه‌ها"><ChevronLeft size={23} /></button>}</header>;
}
function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button type="button" className={`ffos-nav-button ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined} onClick={onClick}>{icon}<span>{label}</span></button>;
}
