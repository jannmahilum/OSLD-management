import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Bell,
  Building2,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  Moon,
  PanelRight,
  Pin,
  Sun,
  UserCog,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { supabase } from "../lib/supabase";

const loginSchema = z.object({
  organization: z.string().min(1, "Please select an organization"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const organizations = [
  { value: "osld", label: "OFFICE OF STUDENT LEADERSHIP AND DEVELOPMENT" },
  { value: "accredited", label: "ACCREDITED ORGANIZATIONS" },
  { value: "lsg", label: "LOCAL STUDENT GOVERNMENT" },
  { value: "gsc", label: "GRADUATING STUDENT COUNCIL" },
  {
    value: "used",
    label: "UNIVERSITY STUDENT ENTERPRISE DEVELOPMENT",
  },
  { value: "coa", label: "COMMISSION ON AUDIT" },
  { value: "usg", label: "UNIVERSITY STUDENT GOVERNMENT" },
  { value: "lco", label: "LEAGUE OF CAMPUS ORGANIZATION" },
  { value: "tgp", label: "THE GOLD PANICLES" },
];

const portalOrganizations = [
  {
    acronym: "OSLD",
    name: "Office of Student Leadership and Development",
    icon: UserCog,
  },
  { acronym: "AO", name: "Accredited Organizations", icon: Users },
  { acronym: "LSG", name: "Local Student Government", icon: Users },
  { acronym: "GSC", name: "Graduating Student Council", icon: Users },
  {
    acronym: "USED",
    name: "University Student Enterprise Development",
    icon: Building2,
  },
  { acronym: "COA", name: "Commission on Audit", icon: FileText },
  { acronym: "USG", name: "University Student Government", icon: Users },
  { acronym: "LCO",
    name: "League of Campus Organization",
    icon: Users,
  },
  { acronym: "TGP", name: "The Gold Panicles", icon: Users },
];

const sampleAnnouncements = [
  {
    title: "Submission of RLTC due on May 15",
    tag: "Deadline",
    pinned: true,
    dateTime: "May 15 · 5:00 PM",
  },
  {
    title: "Updated liquidation guidelines released",
    tag: "Memo",
    pinned: false,
    dateTime: "May 12 · 9:30 AM",
  },
  {
    title: "USG leadership orientation this Friday",
    tag: "Event",
    pinned: false,
    dateTime: "May 10 · 2:00 PM",
  },
];

const sampleMemos = [
  {
    title: "Revised Liquidation Requirements for Student Organizations",
    memoNo: "OSLD-MEMO-2026-014",
    dateIssued: "May 12, 2026",
  },
  {
    title: "Guidelines on Financial Monitoring and Submission Deadlines",
    memoNo: "OSLD-MEMO-2026-011",
    dateIssued: "May 06, 2026",
  },
  {
    title: "Compliance Checklist Updates for Accredited Organizations",
    memoNo: "OSLD-MEMO-2026-008",
    dateIssued: "Apr 28, 2026",
  },
];

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("osld_theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
      ? "dark"
      : "light";
  });
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      organization: "",
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const selectedOrg = watch("organization");

  const greeting = useMemo(() => {
    const hour = now.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, [now]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("osld_theme", theme);
  }, [theme]);

  const onSubmit = async (data: LoginFormData) => {
    setAuthError(null);
    setIsLoading(true);
    const shouldRemember = !!data.rememberMe;

    try {
      // Check for OSLD account
      if (
        data.organization === "osld" &&
        data.email === "OSLD@carsu.edu.ph" &&
        data.password === "OSLDsite"
      ) {
        console.log("OSLD Login successful", data);
        localStorage.setItem("osld_userEmail", data.email);
        localStorage.setItem("osld_userPassword", data.password);
        localStorage.setItem(
          "userOrganization",
          "Office of Student Leadership and Development",
        );
        if (!shouldRemember) {
          sessionStorage.setItem("osld_session", "1");
        }
        navigate("/dashboard");
        return;
      }

      // Map organization codes to full names
      const orgMap: { [key: string]: string } = {
        osld: "Office of Student Leadership and Development",
        accredited: "Accredited Organizations",
        lsg: "Local Student Government",
        gsc: "Graduating Student Council",
        used: "University Student Enterprise Development",
        coa: "Commission on Audit",
        usg: "University Student Government",
        lco: "League of Campus Organization",
        tgp: "The Gold Panicles",
      };

      const fullOrgName = orgMap[data.organization] || data.organization;

      // Check for organization accounts in database
      const { data: accounts, error } = await supabase
        .from("org_accounts")
        .select("*")
        .eq("email", data.email)
        .eq("organization", fullOrgName)
        .single();

      if (error || !accounts) {
        setAuthError(
          "Invalid credentials. Please check your email and password.",
        );
        setIsLoading(false);
        return;
      }

      // Check if account is active (allow login for all status types)
      // Removed login blocking for "On Hold" status

      // Verify password
      if (accounts.password !== data.password) {
        setAuthError(
          "Invalid credentials. Please check your email and password.",
        );
        setIsLoading(false);
        return;
      }

      // Login successful - store user data in localStorage with organization-specific keys
      console.log("Organization Login successful", data);

      // Map organization codes to shortnames used in dashboards
      const orgShortNameMap: { [key: string]: string } = {
        accredited: "ao",
        lsg: "lsg",
        gsc: "gsc",
        used: "used",
        coa: "coa",
        usg: "usg",
        lco: "lco",
        tgp: "tgp",
      };

      const orgKey =
        orgShortNameMap[data.organization] || data.organization.toLowerCase();
      localStorage.setItem(`${orgKey}_userEmail`, data.email);
      localStorage.setItem(`${orgKey}_userPassword`, data.password);
      localStorage.setItem("userOrganization", fullOrgName);
      if (!shouldRemember) {
        sessionStorage.setItem(`${orgKey}_session`, "1");
      }

      const routeMap: { [key: string]: string } = {
        accredited: "/ao-dashboard",
        lsg: "/lsg-dashboard",
        gsc: "/gsc-dashboard",
        used: "/used-dashboard",
        coa: "/coa-dashboard",
        usg: "/usg-dashboard",
        lco: "/lco-dashboard",
        tgp: "/tgp-dashboard",
      };

      console.log("Organization value:", data.organization);
      console.log("Route mapping:", routeMap[data.organization]);
      const route = routeMap[data.organization] || "/ao-dashboard";
      navigate(route);
    } catch (err: unknown) {
      console.error("Login error:", err);
      setAuthError("An error occurred during login. Please try again.");
      setIsLoading(false);
    }
  };

  const Portal = (
    <div className="space-y-6">
      <Card className="border-white/20 bg-white/50 backdrop-blur-xl shadow-xl dark:bg-slate-950/40 dark:border-white/10">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Empowering Student Organizations Through Digital Governance
              </CardTitle>
              <CardDescription className="text-slate-700 dark:text-slate-300">
                The OSLD Management System streamlines approvals, compliance
                tracking, financial monitoring, and organizational coordination
                across Caraga State University.
              </CardDescription>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="rounded-full border border-white/30 bg-white/40 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200 dark:border-white/10">
                {format(now, "EEE, MMM d")}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/40 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200 dark:border-white/10">
                <Clock className="h-3.5 w-3.5" />
                {format(now, "h:mm:ss a")}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
            <div className="relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-[#014421]/10 via-white/40 to-[#D4AF37]/10 p-4 dark:border-white/10 dark:from-[#014421]/20 dark:via-slate-950/30 dark:to-[#D4AF37]/15">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Portal Snapshot
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/20 bg-white/60 p-3 shadow-sm dark:bg-white/5 dark:border-white/10">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Active Organizations
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    9
                  </div>
                </div>
                <div className="rounded-lg border border-white/20 bg-white/60 p-3 shadow-sm dark:bg-white/5 dark:border-white/10">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Pending Items
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    3
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#D4AF37]/15 blur-2xl dark:bg-[#D4AF37]/10" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-52 w-52 rounded-full bg-[#014421]/15 blur-2xl dark:bg-[#014421]/20" />
            </div>

            <div className="rounded-xl border border-white/20 bg-white/50 p-4 shadow-sm dark:bg-white/5 dark:border-white/10">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Guiding Principle
              </div>
              <div className="mt-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                “Leadership is not about control, but about transparency,
                accountability, and service.”
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Institutional Governance
                </div>
                <div className="rounded-full bg-[#014421]/10 px-2.5 py-1 text-xs font-semibold text-[#014421] dark:bg-[#014421]/20 dark:text-[#D4AF37]">
                  Verified
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/20 bg-white/50 backdrop-blur-xl shadow-xl dark:bg-slate-950/40 dark:border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Main Organizations
          </CardTitle>
          <CardDescription className="text-slate-700 dark:text-slate-300">
            Access and coordinate across core offices and councils.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {portalOrganizations.map((org) => {
            const Icon = org.icon;
            return (
              <motion.div
                key={org.acronym}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className="group relative overflow-hidden rounded-xl border border-white/20 bg-white/60 p-4 shadow-sm transition-colors dark:bg-white/5 dark:border-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {org.acronym}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      {org.name}
                    </div>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#014421]/10 text-[#014421] ring-1 ring-[#D4AF37]/30 transition-colors group-hover:bg-[#014421]/15 dark:bg-[#014421]/20 dark:text-[#D4AF37] dark:ring-[#D4AF37]/25">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="pointer-events-none absolute -right-16 -bottom-16 h-44 w-44 rounded-full bg-gradient-to-br from-[#014421]/0 via-[#014421]/10 to-[#D4AF37]/20 blur-2xl transition-opacity group-hover:opacity-100 dark:via-[#014421]/15 dark:to-[#D4AF37]/15" />
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/20 bg-white/50 backdrop-blur-xl shadow-xl dark:bg-slate-950/40 dark:border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Announcements
                </CardTitle>
                <CardDescription className="text-slate-700 dark:text-slate-300">
                  Important updates and deadlines.
                </CardDescription>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/40 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200 dark:border-white/10">
                <Bell className="h-3.5 w-3.5" />
                3
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-56 space-y-2 overflow-auto pr-1">
              {sampleAnnouncements.map((a) => (
                <div
                  key={a.title}
                  className="flex items-start justify-between gap-3 rounded-xl border border-white/20 bg-white/60 p-3 shadow-sm dark:bg-white/5 dark:border-white/10"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {a.pinned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#D4AF37]/20 px-2 py-0.5 text-[11px] font-semibold text-[#6b4d00] dark:text-[#D4AF37] dark:bg-[#D4AF37]/10">
                          <Pin className="h-3 w-3" />
                          Pinned
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                        {a.tag}
                      </span>
                    </div>
                    <div className="mt-2 truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                      {a.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {a.dateTime}
                    </div>
                  </div>
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#014421]/70 dark:bg-[#D4AF37]/70" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/20 bg-white/50 backdrop-blur-xl shadow-xl dark:bg-slate-950/40 dark:border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Memorandums
            </CardTitle>
            <CardDescription className="text-slate-700 dark:text-slate-300">
              Latest documents and policy updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sampleMemos.map((m) => (
              <div
                key={m.memoNo}
                className="flex items-start justify-between gap-4 rounded-xl border border-white/20 bg-white/60 p-3 shadow-sm dark:bg-white/5 dark:border-white/10"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-50">
                    <FileText className="h-4 w-4 text-[#014421] dark:text-[#D4AF37]" />
                    <span className="truncate">{m.title}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-medium">{m.memoNo}</span>
                    <span>{m.dateIssued}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-white/30 bg-white/40 hover:bg-white/50 dark:bg-white/5 dark:border-white/10"
                >
                  <Download className="mr-2 h-4 w-4" />
                  View
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/20 bg-white/50 backdrop-blur-xl shadow-xl dark:bg-slate-950/40 dark:border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Functional Flow
          </CardTitle>
          <CardDescription className="text-slate-700 dark:text-slate-300">
            Approval and oversight path across key offices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="grid gap-3 sm:grid-cols-9 sm:items-center">
              {[
                {
                  key: "AO",
                  desc: "Submissions and compliance from recognized organizations.",
                },
                { key: "LCO", desc: "Coordination and campus-level consolidation." },
                { key: "USG", desc: "Student government endorsement and routing." },
                { key: "OSLD", desc: "Institutional evaluation and final approval." },
                { key: "COA", desc: "Audit validation and financial oversight." },
              ].map((n, idx, arr) => (
                <div
                  key={n.key}
                  className="contents"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="rounded-xl border border-white/20 bg-white/60 px-4 py-3 text-center text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-white/70 dark:bg-white/5 dark:border-white/10 dark:text-slate-50 dark:hover:bg-white/10">
                        {n.key}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[260px] bg-slate-900 text-slate-50">
                      {n.desc}
                    </TooltipContent>
                  </Tooltip>

                  {idx < arr.length - 1 && (
                    <motion.div
                      aria-hidden
                      className="hidden sm:flex items-center justify-center"
                      initial={{ opacity: 0.6 }}
                      animate={{ opacity: [0.45, 0.95, 0.45] }}
                      transition={{ duration: 2.2, repeat: Infinity }}
                    >
                      <div className="h-px w-full bg-gradient-to-r from-[#014421]/30 via-[#D4AF37]/60 to-[#014421]/30 dark:from-[#D4AF37]/30 dark:via-white/25 dark:to-[#D4AF37]/30" />
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Hover each node for role details.
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-50">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#014421]/15 blur-3xl dark:bg-[#014421]/25"
        animate={{ x: [0, 24, 0], y: [0, 12, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-52 top-10 h-[560px] w-[560px] rounded-full bg-[#D4AF37]/15 blur-3xl dark:bg-[#D4AF37]/10"
        animate={{ x: [0, -18, 0], y: [0, 14, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto w-full max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#014421] shadow-sm">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                OSLD Management System
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                Caraga State University · Office of Student Leadership and
                Development
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="border-white/30 bg-white/40 hover:bg-white/50 dark:bg-white/5 dark:border-white/10"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/40 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200 dark:border-white/10">
              <Clock className="h-3.5 w-3.5" />
              {format(now, "h:mm a")}
            </div>

            <Drawer>
              <DrawerTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/30 bg-white/40 hover:bg-white/50 dark:bg-white/5 dark:border-white/10 lg:hidden"
                >
                  <PanelRight className="mr-2 h-4 w-4" />
                  Portal
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[90vh] overflow-hidden">
                <DrawerHeader className="text-left">
                  <DrawerTitle>Information Portal</DrawerTitle>
                  <DrawerDescription>
                    Announcements, memos, and functional flow.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-6 overflow-auto">{Portal}</div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="lg:sticky lg:top-8 lg:self-start">
            <Card className="border-white/20 bg-white/55 backdrop-blur-xl shadow-2xl dark:bg-slate-950/40 dark:border-white/10">
              <div className="h-1.5 w-full rounded-t-xl bg-gradient-to-r from-[#014421] via-[#D4AF37] to-[#014421]" />
              <CardHeader className="space-y-2 pb-6 pt-7">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      Sign In
                    </CardTitle>
                    <CardDescription className="text-slate-700 dark:text-slate-300">
                      {greeting}. Continue to your organization dashboard.
                    </CardDescription>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#014421]/10 px-3 py-1 text-xs font-semibold text-[#014421] dark:bg-[#014421]/20 dark:text-[#D4AF37]">
                    <Bell className="h-3.5 w-3.5" />
                    3
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-7 pb-7">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {authError && (
                    <Alert
                      variant="destructive"
                      className="animate-in fade-in-50"
                    >
                      <AlertDescription>{authError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="organization" className="font-medium">
                      Organization
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Select
                        value={selectedOrg}
                        onValueChange={(value) =>
                          setValue("organization", value, {
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger
                          className={`h-12 pl-10 ${errors.organization ? "border-red-500" : ""}`}
                        >
                          <SelectValue placeholder="Select your organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.map((org) => (
                            <SelectItem key={org.value} value={org.value}>
                              {org.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {errors.organization && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.organization.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-4 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        className={`h-12 pl-10 ${errors.email ? "border-red-500" : ""}`}
                        {...register("email")}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-4 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className={`h-12 pl-10 pr-10 ${errors.password ? "border-red-500" : ""}`}
                        {...register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-4 text-slate-400 hover:text-slate-600 transition-colors dark:hover:text-slate-200"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-[#014421] focus:ring-[#D4AF37] dark:border-white/15 dark:bg-white/5"
                        {...register("rememberMe")}
                      />
                      Remember me
                    </label>
                    <a
                      href="#"
                      className="text-sm font-medium text-[#014421] hover:underline dark:text-[#D4AF37]"
                    >
                      Forgot Password
                    </a>
                  </div>

                  <Button
                    type="submit"
                    className="h-12 w-full bg-[#014421] text-white shadow-sm transition-transform hover:scale-[1.01] hover:bg-[#014421]/95 active:scale-[0.99]"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-full border-white/30 bg-white/40 hover:bg-white/50 dark:bg-white/5 dark:border-white/10"
                    onClick={() => window.open("mailto:osld@carsu.edu.ph")}
                  >
                    Contact Support
                  </Button>
                </form>

                <div className="mt-6 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <div>© 2026 OSLD Management System</div>
                  <div className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-white/20" />
                    <span>Caraga State University</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="hidden lg:block">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Information Portal
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/40 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200 dark:border-white/10">
                <Bell className="h-3.5 w-3.5" />
                Notifications · 3
              </div>
            </div>
            {Portal}
          </div>
        </div>
      </div>
    </div>
  );
}
