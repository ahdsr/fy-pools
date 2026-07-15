"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Moon, Plus, Sun, UserRound } from "lucide-react";
import * as React from "react";

import { BrandWordmark } from "@/components/app/brand";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { type AuthUser, authUserFromSupabase } from "@/lib/auth/user";
import { authCallbackUrlFor } from "@/lib/auth/callback";
import { cn } from "@/lib/utils";
import {
  DEFAULT_AUTH_REDIRECT,
  forgotPasswordPathFor,
  postAuthRedirectPath,
  safeNextPath,
  signInPathFor,
  signUpPathFor,
} from "@/lib/auth/paths";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  requestPasswordResetAction,
  resendConfirmationEmailAction,
  signInWithPasswordAction,
  signUpWithPasswordAction,
  updatePasswordAction,
} from "@/lib/auth/actions";

type HeaderAccountControlsProps = {
  className?: string;
};

type SiteHeaderNavProps = {
  className?: string;
  variant?: "default" | "minimal";
};

type MobileSiteHeaderNavProps = {
  className?: string;
};

type HeaderBrandWordmarkProps = {
  className?: string;
  variant?: "dark" | "light";
};

type MockAuthFormProps = {
  nextPath?: string | null;
  initialMessage?: string;
};

export type PublicPoolNavKey =
  | "overview"
  | "rules"
  | "projections"
  | "heatmap"
  | "bracket"
  | "locker-room"
  | "entry";

type PublicPoolHeaderProps = {
  poolSlug?: string;
  active?: PublicPoolNavKey;
};

const signedOutNavItems = [
  { label: "Pools", href: "/dashboard/pools" },
  { label: "Templates", href: "/templates" },
  { label: "Upload", href: "/upload-your-own" },
] as const;

const publicPoolNavItems = [
  { key: "overview", label: "Pool", href: "" },
  { key: "rules", label: "Rules", href: "/rules" },
  { key: "projections", label: "Projections", href: "/projections" },
  { key: "heatmap", label: "Heatmap", href: "/heatmap" },
  { key: "bracket", label: "Bracket", href: "/bracket" },
  { key: "locker-room", label: "On the Pitch", href: "/locker-room" },
] as const;

const adminNavItems = [
  { label: "Workspace", href: "/dashboard" },
  { label: "Pools", href: "/dashboard/pools" },
  { label: "Templates", href: "/dashboard/templates" },
  { label: "Import", href: "/upload-your-own" },
] as const;

type MockAuthContextValue = {
  user: AuthUser | null;
  hydrated: boolean;
};

const MockAuthContext = React.createContext<MockAuthContextValue | null>(null);

function useMockUser() {
  const context = React.useContext(MockAuthContext);

  if (!context) {
    throw new Error("useMockUser must be used within MockAuthProvider");
  }

  return context;
}

export function MockAuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: AuthUser | null;
}) {
  const pathname = usePathname();
  const [supabase] = React.useState<ReturnType<
    typeof createSupabaseBrowserClient
  > | null>(() => {
    if (typeof window === "undefined") return null;

    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  });
  const [user, setUser] = React.useState<AuthUser | null>(initialUser);
  const [hydrated, setHydrated] = React.useState(true);

  const refreshUser = React.useCallback(async () => {
    if (!supabase) return;

    try {
      const { data } = await supabase.auth.getUser();
      setUser(authUserFromSupabase(data.user));
    } finally {
      setHydrated(true);
    }
  }, [supabase]);

  React.useEffect(() => {
    void refreshUser();
  }, [pathname, refreshUser]);

  React.useEffect(() => {
    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(authUserFromSupabase(session?.user));
      setHydrated(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <MockAuthContext.Provider value={{ user, hydrated }}>
      {children}
    </MockAuthContext.Provider>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isActiveRoute(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderBrandWordmark({
  className,
  variant = "dark",
}: HeaderBrandWordmarkProps) {
  const { user, hydrated } = useMockUser();

  return (
    <BrandWordmark
      className={className}
      href={hydrated && user ? "/dashboard" : "/"}
      variant={variant}
    />
  );
}

const THEME_STORAGE_KEY = "poolwaffle-theme";
const THEME_CHANGE_EVENT = "poolwaffle-theme-change";
const LIGHT_THEME = "premium-pools";
const DARK_THEME = "dark-pools";

function readStoredTheme() {
  return window.localStorage.getItem(THEME_STORAGE_KEY) === DARK_THEME
    ? DARK_THEME
    : LIGHT_THEME;
}

function subscribeToTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
  };
}

export function ThemeToggle() {
  const theme = React.useSyncExternalStore(
    subscribeToTheme,
    readStoredTheme,
    () => LIGHT_THEME,
  );

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const isDark = theme === DARK_THEME;

  function toggleTheme() {
    const nextTheme = isDark ? LIGHT_THEME : DARK_THEME;
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={isDark ? "Use light theme" : "Use dark theme"}
      title={isDark ? "Use light theme" : "Use dark theme"}
      onClick={toggleTheme}
    >
      {isDark ? <Sun /> : <Moon />}
      <span className="sr-only">
        {isDark ? "Use light theme" : "Use dark theme"}
      </span>
    </Button>
  );
}

export function DashboardHeader() {
  return <LandingPageHeader />;
}

export function LandingPageHeader({ solid = false }: { solid?: boolean }) {
  const [hasScrolled, setHasScrolled] = React.useState(false);

  React.useEffect(() => {
    const updateScrolledState = () => setHasScrolled(window.scrollY > 16);

    updateScrolledState();
    window.addEventListener("scroll", updateScrolledState, { passive: true });

    return () => window.removeEventListener("scroll", updateScrolledState);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full text-foreground transition-[background-color,border-color,box-shadow] duration-300",
        solid && "border-b border-border/70 bg-surface-paper",
        hasScrolled &&
          "border-b border-border/70 bg-surface-paper/95 shadow-[0_1px_0_rgb(0_0_0_/_0.08)] backdrop-blur-sm",
      )}
    >
      <nav className="relative flex h-20 w-full items-center justify-between gap-4 px-4 sm:px-5 lg:px-[43px]">
        <div className="flex min-w-0 items-center lg:block">
          <MobileSiteHeaderNav className="text-foreground hover:bg-muted hover:text-foreground" />
          <HeaderBrandWordmark className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0" />
        </div>
        <SiteHeaderNav variant="minimal" />
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <HeaderAccountControls />
        </div>
      </nav>
    </header>
  );
}

function getPublicPoolActiveRoute(pathname: string): PublicPoolNavKey {
  if (pathname.includes("/rules")) return "rules";
  if (pathname.includes("/projections")) return "projections";
  if (pathname.includes("/heatmap")) return "heatmap";
  if (pathname.includes("/bracket")) return "bracket";
  if (pathname.includes("/locker-room")) return "locker-room";
  if (pathname.includes("/entry/")) return "entry";
  return "overview";
}

export function PublicPoolRouteHeader() {
  const pathname = usePathname();
  const poolSlug = pathname.match(/^\/pools\/([^/]+)/)?.[1];

  if (!poolSlug) {
    return null;
  }

  return (
    <PublicPoolHeader
      poolSlug={decodeURIComponent(poolSlug)}
      active={getPublicPoolActiveRoute(pathname)}
    />
  );
}

export function PublicPoolHeader({ poolSlug, active }: PublicPoolHeaderProps) {
  const { user, hydrated } = useMockUser();
  const signedIn = hydrated && user;
  const showPoolNav = Boolean(poolSlug && active);
  const poolBaseHref = poolSlug ? `/pools/${poolSlug}` : "";

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-border bg-surface-paper text-foreground"
    >
      <nav className="relative flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-5 lg:grid lg:h-auto lg:min-h-16 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-3 lg:px-[43px] lg:py-3">
        <div className="flex min-w-0 items-center lg:contents">
          {showPoolNav ? (
            <MobilePublicPoolNav
              active={active}
              poolBaseHref={poolBaseHref}
            />
          ) : null}
          <BrandWordmark
            href={signedIn ? "/dashboard" : "/"}
            variant="dark"
            className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0"
          />
        </div>
        {showPoolNav ? (
            <PublicPoolNavLinks
              active={active}
              poolBaseHref={poolBaseHref}
            />
        ) : (
          <div className="hidden lg:block" />
        )}
        <div className="flex shrink-0 items-center justify-end gap-2 lg:col-start-3">
          <ThemeToggle />
          {signedIn ? (
            <HeaderAccountControls />
          ) : (
            <Button
              asChild
              variant="primaryGreen"
              className="size-11 px-0 min-[480px]:w-auto min-[480px]:px-3"
            >
              <Link href="/sign-up">
                <Plus className="size-4 min-[480px]:hidden" aria-hidden="true" />
                <span className="sr-only min-[480px]:not-sr-only">Create your own</span>
              </Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}

function PublicPoolNavLinks({
  active,
  poolBaseHref,
}: {
  active?: PublicPoolNavKey;
  poolBaseHref: string;
}) {
  return (
    <div className="hidden min-w-0 lg:col-start-2 lg:row-start-1 lg:flex lg:justify-center lg:overflow-visible lg:px-1">
      <div
        className={cn(
          "inline-flex min-w-max border p-1 shadow-none",
          "border-border bg-surface-paper",
        )}
      >
        {publicPoolNavItems.map((item) => (
          <Link
            key={item.key}
            href={`${poolBaseHref}${item.href}`}
            aria-current={active === item.key ? "page" : undefined}
            className={cn(
              "rounded-none px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 sm:py-2",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
              active === item.key &&
                "bg-primary text-primary-foreground shadow-none hover:bg-primary hover:text-primary-foreground",
            )}
          >
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MobilePublicPoolNav({
  active,
  poolBaseHref,
}: {
  active?: PublicPoolNavKey;
  poolBaseHref: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label="Open pool navigation menu"
          className={cn(
            "lg:hidden size-11",
            "text-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Menu />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Pool navigation</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {publicPoolNavItems.map((item) => (
          <DropdownMenuItem key={item.key} asChild>
            <Link
              href={`${poolBaseHref}${item.href}`}
              aria-current={active === item.key ? "page" : undefined}
              className={cn(
                active === item.key && "bg-accent text-accent-foreground",
              )}
            >
              <span>{item.label}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GoogleAuthButton({ nextPath }: { nextPath: string }) {
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function signInWithGoogle() {
    setPending(true);
    setMessage(null);

    try {
      const callbackUrl = authCallbackUrlFor(window.location.origin, nextPath);

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
        },
      });

      if (error) {
        setMessage("Google sign-in could not be started. Please try again.");
        setPending(false);
      }
    } catch {
      setMessage("Google sign-in is not available right now.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => void signInWithGoogle()}
      >
        {pending ? "Connecting to Google..." : "Continue with Google"}
      </Button>
      {message ? (
        <p className="text-sm font-medium leading-5 text-destructive" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function AuthMethodDivider() {
  return (
    <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
      <Separator className="flex-1" />
      <span>or</span>
      <Separator className="flex-1" />
    </div>
  );
}

export function MockSignInForm({
  nextPath,
  initialMessage,
}: MockAuthFormProps) {
  const redirectPath = postAuthRedirectPath(nextPath);
  const [email, setEmail] = React.useState("");
  const [state, formAction, pending] = React.useActionState(
    signInWithPasswordAction,
    {},
  );

  return (
    <form className="space-y-5" action={formAction}>
      <input type="hidden" name="next" value={redirectPath} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
        />
      </div>
      {state.message ?? initialMessage ? (
        <p className="text-sm font-medium leading-5 text-destructive" role="alert">
          {state.message ?? initialMessage}
        </p>
      ) : null}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
      <AuthMethodDivider />
      <GoogleAuthButton nextPath={redirectPath} />
      <Button asChild variant="ghost" className="w-full">
        <Link href={forgotPasswordPathFor(redirectPath)}>
          Forgot your password?
        </Link>
      </Button>
      <Button asChild variant="ghost" className="w-full">
        <Link href={signUpPathFor(redirectPath)}>Create an account</Link>
      </Button>
    </form>
  );
}

export function MockForgotPasswordForm({ nextPath }: MockAuthFormProps) {
  const redirectPath = safeNextPath(nextPath);
  const [email, setEmail] = React.useState("");
  const [state, formAction, pending] = React.useActionState(
    requestPasswordResetAction,
    {},
  );

  return (
    <form className="space-y-5" action={formAction}>
      <input type="hidden" name="next" value={redirectPath} />
      <div className="space-y-2">
        <Label htmlFor="recovery-email">Email</Label>
        <Input
          id="recovery-email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      {state.message ? (
        <p
          className="text-sm font-medium leading-5 text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Sending reset link..." : "Send reset link"}
      </Button>
      <Button asChild variant="ghost" className="w-full">
        <Link href={signInPathFor(redirectPath)}>Back to sign in</Link>
      </Button>
    </form>
  );
}

export function ResendConfirmationForm() {
  const [state, formAction, pending] = React.useActionState(
    resendConfirmationEmailAction,
    {},
  );

  return (
    <form className="space-y-3" action={formAction}>
      <Button className="w-full" type="submit" variant="outline" disabled={pending}>
        {pending ? "Sending confirmation..." : "Resend confirmation email"}
      </Button>
      {state.message ? (
        <p
          className="text-sm leading-5 text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function MockResetPasswordForm({ nextPath }: MockAuthFormProps) {
  const redirectPath = safeNextPath(nextPath);
  const [state, formAction, pending] = React.useActionState(
    updatePasswordAction,
    {},
  );

  return (
    <form className="space-y-5" action={formAction}>
      <input type="hidden" name="next" value={redirectPath} />
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          minLength={8}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm password</Label>
        <Input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          minLength={8}
          required
        />
      </div>
      {state.message ? (
        <p className="text-sm font-medium leading-5 text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      <Button
        className="w-full"
        type="submit"
        variant="primaryGreen"
        disabled={pending}
      >
        {pending ? "Updating password..." : "Update password"}
      </Button>
      <Button asChild variant="ghost" className="w-full">
        <Link href={signInPathFor(redirectPath)}>Back to sign in</Link>
      </Button>
    </form>
  );
}

export function MockSignUpForm({ nextPath }: MockAuthFormProps) {
  const redirectPath = postAuthRedirectPath(nextPath);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [state, formAction, pending] = React.useActionState(
    signUpWithPasswordAction,
    {},
  );

  return (
    <form className="space-y-5" action={formAction}>
      <input type="hidden" name="next" value={redirectPath} />
      <GoogleAuthButton nextPath={redirectPath} />
      <AuthMethodDivider />
      <div className="space-y-2">
        <Label htmlFor="signup-name">Name</Label>
        <Input
          id="signup-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          minLength={8}
          required
        />
      </div>
      {state.message ? (
        <p
          className="text-sm font-medium leading-5 text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}
      <Button
        className="w-full"
        type="submit"
        variant="primaryGreen"
        disabled={pending}
      >
        {pending ? "Creating account..." : "Create account"}
      </Button>
      <Button asChild variant="ghost" className="w-full">
        <Link href={signInPathFor(redirectPath)}>Already have an account?</Link>
      </Button>
    </form>
  );
}

export function SiteHeaderNav({
  className,
  variant = "default",
}: SiteHeaderNavProps) {
  const pathname = usePathname();
  const { user, hydrated } = useMockUser();
  const items = hydrated && user ? adminNavItems : signedOutNavItems;

  return (
    <div
      className={cn(
        "absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center lg:flex",
        variant === "default" && "gap-0.5 border border-border bg-surface-paper p-0.5",
        variant === "minimal" && "gap-7",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = isActiveRoute(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-none text-[0.8125rem] font-medium leading-none transition-colors",
              variant === "default" &&
                "px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground",
              variant === "default" &&
                isActive &&
                "bg-primary text-primary-foreground shadow-none hover:bg-primary hover:text-primary-foreground",
              variant === "minimal" &&
                "py-2 text-muted-foreground hover:text-foreground",
              variant === "minimal" && isActive && "text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function MobileSiteHeaderNav({ className }: MobileSiteHeaderNavProps) {
  const pathname = usePathname();
  const { user, hydrated } = useMockUser();
  const items = hydrated && user ? adminNavItems : signedOutNavItems;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label="Open navigation menu"
          className={cn(
            "size-11 text-white hover:bg-white/10 hover:text-white lg:hidden",
            className,
          )}
        >
          <Menu />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Navigation</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => {
          const isActive = isActiveRoute(pathname, item.href);

          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(isActive && "bg-accent text-accent-foreground")}
              >
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function HeaderAccountControls({
  className,
}: HeaderAccountControlsProps) {
  const router = useRouter();
  const { user, hydrated } = useMockUser();

  if (!hydrated) {
    return (
      <div className={cn("flex items-center gap-2", className)} aria-busy="true">
        <span
          aria-label="Checking account"
          className="grid size-9 place-items-center rounded-full border border-border bg-surface-paper"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          asChild
          variant="ghost"
          className="text-foreground hover:bg-muted hover:text-foreground"
        >
          <Link href={signInPathFor(DEFAULT_AUTH_REDIRECT)}>Sign in</Link>
        </Button>
      </div>
    );
  }

  async function handleSignOut() {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // Missing Supabase config should not trap the user in the UI shell.
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Open profile menu"
            className="grid size-9 place-items-center rounded-full border bg-surface-paper text-sm font-semibold text-foreground shadow-sm transition-transform hover:scale-[1.03] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
          >
            {getInitials(user.name)}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <span className="block text-sm font-semibold text-foreground">
              {user.name}
            </span>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <UserRound />
              Workspace
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleSignOut}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
