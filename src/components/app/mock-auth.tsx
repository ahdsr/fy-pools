"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, UserRound } from "lucide-react";
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
import { cn } from "@/lib/utils";

const MOCK_USER_KEY = "poolwaffle.mockUser";

type MockUser = {
  name: string;
  email: string;
  role: string;
};

type HeaderAccountControlsProps = {
  className?: string;
};

type SiteHeaderNavProps = {
  className?: string;
};

type HeaderBrandWordmarkProps = {
  className?: string;
  variant?: "dark" | "light";
};

type MockAuthFormProps = {
  nextPath?: string | null;
};

export type PublicPoolNavKey =
  | "overview"
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
  { label: "Templates", href: "/dashboard/templates" },
  { label: "Upload", href: "/upload-your-own" },
] as const;

const publicPoolNavItems = [
  { key: "overview", label: "Pool", href: "" },
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

const DEFAULT_AUTH_REDIRECT = "/dashboard";

type MockAuthContextValue = {
  user: MockUser | null;
  hydrated: boolean;
};

const MockAuthContext = React.createContext<MockAuthContextValue | null>(null);

function getStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(MOCK_USER_KEY);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as MockUser;
  } catch {
    window.localStorage.removeItem(MOCK_USER_KEY);
    return null;
  }
}

function storeUser(user: MockUser | null) {
  if (user) {
    window.localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(MOCK_USER_KEY);
  }

  window.dispatchEvent(new Event("poolwaffle-auth-change"));
}

function useMockUser() {
  const context = React.useContext(MockAuthContext);

  if (!context) {
    throw new Error("useMockUser must be used within MockAuthProvider");
  }

  return context;
}

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<MockUser | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const syncUser = () => {
      setUser(getStoredUser());
      setHydrated(true);
    };

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("poolwaffle-auth-change", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("poolwaffle-auth-change", syncUser);
    };
  }, []);

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

function getSafeNextPath(nextPath?: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  try {
    const url = new URL(nextPath, "https://poolwaffle.local");

    if (
      url.origin !== "https://poolwaffle.local" ||
      url.pathname === "/sign-in" ||
      url.pathname === "/sign-up"
    ) {
      return DEFAULT_AUTH_REDIRECT;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}

function getAuthLink(pathname: "/sign-in" | "/sign-up", nextPath: string) {
  return nextPath === DEFAULT_AUTH_REDIRECT
    ? pathname
    : `${pathname}?next=${encodeURIComponent(nextPath)}`;
}

export function HeaderBrandWordmark({
  className,
  variant = "light",
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

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-accent text-accent-foreground">
      <nav className="relative flex h-20 w-full items-center justify-between gap-4 px-5 md:px-[43px]">
        <div className="flex min-w-0 items-center md:block">
          <MobileSiteHeaderNav />
          <HeaderBrandWordmark className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0" />
        </div>
        <SiteHeaderNav />
        <div className="flex items-center gap-2">
          <HeaderAccountControls />
        </div>
      </nav>
    </header>
  );
}

function getPublicPoolActiveRoute(pathname: string): PublicPoolNavKey {
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
      className={cn(
        "sticky top-0 z-50 w-full border-b",
        signedIn
          ? "border-white/10 bg-accent text-accent-foreground"
          : "border-border/70 bg-white text-foreground",
        )}
    >
      <nav className="relative flex h-20 w-full items-center justify-between gap-4 px-5 md:grid md:h-auto md:min-h-16 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-3 md:px-[43px] md:py-3">
        <div className="flex min-w-0 items-center md:contents">
          {showPoolNav ? (
            <MobilePublicPoolNav
              active={active}
              poolBaseHref={poolBaseHref}
              signedIn={Boolean(signedIn)}
            />
          ) : null}
          <BrandWordmark
            href={signedIn ? "/dashboard" : "/"}
            variant={signedIn ? "light" : "dark"}
            className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0"
          />
        </div>
        {showPoolNav ? (
          <PublicPoolNavLinks
            active={active}
            poolBaseHref={poolBaseHref}
            signedIn={Boolean(signedIn)}
          />
        ) : (
          <div className="hidden md:block" />
        )}
        <div className="flex shrink-0 items-center justify-end gap-2 md:col-start-3">
          {signedIn ? (
            <HeaderAccountControls />
          ) : (
            <Button
              asChild
              variant="primaryGreen"
              className="h-9 px-3 text-[0.8125rem] sm:text-sm"
            >
              <Link href="/sign-up">Create your own</Link>
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
  signedIn,
}: {
  active?: PublicPoolNavKey;
  poolBaseHref: string;
  signedIn: boolean;
}) {
  return (
    <div className="hidden min-w-0 md:col-start-2 md:row-start-1 md:flex md:justify-center md:overflow-visible md:px-1">
      <div
        className={cn(
          "inline-flex min-w-max rounded-full border p-1 shadow-sm",
          signedIn
            ? "border-white/12 bg-white/8"
            : "border-border/80 bg-surface-paper/95",
        )}
      >
        {publicPoolNavItems.map((item) => (
          <Link
            key={item.key}
            href={`${poolBaseHref}${item.href}`}
            aria-current={active === item.key ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 sm:py-2",
              signedIn
                ? "text-white/72 hover:bg-white/10 hover:text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              active === item.key &&
                (signedIn
                  ? "bg-white text-accent shadow-sm hover:bg-white hover:text-accent"
                  : "bg-accent text-accent-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"),
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function MobilePublicPoolNav({
  active,
  poolBaseHref,
  signedIn,
}: {
  active?: PublicPoolNavKey;
  poolBaseHref: string;
  signedIn: boolean;
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
            "md:hidden",
            signedIn
              ? "text-white hover:bg-white/10 hover:text-white"
              : "text-foreground hover:bg-muted hover:text-foreground",
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
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MockSignInForm({ nextPath }: MockAuthFormProps) {
  const router = useRouter();
  const redirectPath = getSafeNextPath(nextPath);
  const [email, setEmail] = React.useState("admin@poolwaffle.com");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    storeUser({
      name: "Pool Admin",
      email,
      role: "Pool admin",
    });
    router.push(redirectPath);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
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
          type="password"
          value="mock-password"
          readOnly
        />
      </div>
      <Button className="w-full" type="submit">
        Sign in as pool admin
      </Button>
      <Button asChild variant="ghost" className="w-full">
        <Link href={getAuthLink("/sign-up", redirectPath)}>
          Create a mock account
        </Link>
      </Button>
    </form>
  );
}

export function MockSignUpForm({ nextPath }: MockAuthFormProps) {
  const router = useRouter();
  const { user, hydrated } = useMockUser();
  const redirectPath = getSafeNextPath(nextPath);
  const [name, setName] = React.useState("Pool Commissioner");
  const [email, setEmail] = React.useState("commissioner@poolwaffle.com");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    storeUser({
      name,
      email,
      role: "Pool commissioner",
    });
    router.push(redirectPath);
  }

  function handleContinue() {
    router.push(redirectPath);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="signup-name">Name</Label>
        <Input
          id="signup-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
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
          type="password"
          value="mock-password"
          readOnly
        />
      </div>
      <Button className="w-full" type="submit" variant="primaryGreen">
        Create mock account
      </Button>
      {hydrated && user ? (
        <Button
          className="w-full"
          type="button"
          variant="outline"
          onClick={handleContinue}
        >
          Continue to setup
        </Button>
      ) : null}
      <Button asChild variant="ghost" className="w-full">
        <Link href={getAuthLink("/sign-in", redirectPath)}>
          Already have a mock account?
        </Link>
      </Button>
    </form>
  );
}

export function SiteHeaderNav({ className }: SiteHeaderNavProps) {
  const pathname = usePathname();
  const { user, hydrated } = useMockUser();
  const items = hydrated && user ? adminNavItems : signedOutNavItems;

  return (
    <div
      className={cn(
        "absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 rounded-full border border-white/12 bg-white/9 p-0.5 md:flex",
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
              "rounded-full px-3 py-1.5 text-[0.8125rem] font-medium leading-none text-white/78 transition-colors hover:bg-white/12 hover:text-white",
              isActive && "bg-white text-accent shadow-sm hover:bg-white hover:text-accent",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function MobileSiteHeaderNav() {
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
          className="text-white hover:bg-white/10 hover:text-white md:hidden"
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

  if (!hydrated || !user) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          asChild
          variant="ghost"
          className="text-white hover:bg-white/10 hover:text-white"
        >
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  function handleSignOut() {
    storeUser(null);
    router.push("/");
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Open profile menu"
            className="grid size-9 place-items-center rounded-full border border-white/18 bg-white text-sm font-semibold text-accent shadow-sm transition-transform hover:scale-[1.03] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-white/25"
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
