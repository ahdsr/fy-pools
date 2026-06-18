"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
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
  showDashboardLink?: boolean;
};

type SiteHeaderNavProps = {
  className?: string;
};

type HeaderBrandWordmarkProps = {
  className?: string;
  variant?: "dark" | "light";
};

export type PublicPoolNavKey =
  | "overview"
  | "leaderboard"
  | "projections"
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
  { key: "overview", label: "Overview", href: "" },
  { key: "leaderboard", label: "Leaderboard", href: "/leaderboard" },
  { key: "projections", label: "Projections", href: "/projections" },
  { key: "locker-room", label: "Locker Room", href: "/locker-room" },
] as const;

const adminNavItems = [
  { label: "Workspace", href: "/dashboard" },
  { label: "Pools", href: "/dashboard/pools" },
  { label: "Templates", href: "/dashboard/templates" },
  { label: "Import", href: "/upload-your-own" },
] as const;

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

  return { user, hydrated };
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
      <nav className="grid min-h-16 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 md:px-[43px]">
        <BrandWordmark
          href={signedIn ? "/dashboard" : "/"}
          variant={signedIn ? "light" : "dark"}
        />
        {showPoolNav ? (
          <div className="flex min-w-0 justify-center overflow-x-auto px-1">
            <div
              className={cn(
                "flex shrink-0 rounded-full border p-1 shadow-sm",
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
        ) : (
          <div />
        )}
        {signedIn ? (
          <HeaderAccountControls />
        ) : (
          <Button asChild variant="primaryGreen">
            <Link href="/sign-up">Create your own</Link>
          </Button>
        )}
      </nav>
    </header>
  );
}

export function MockSignInForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("admin@poolwaffle.com");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    storeUser({
      name: "Pool Admin",
      email,
      role: "Pool admin",
    });
    router.push("/dashboard");
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

export function HeaderAccountControls({
  className,
  showDashboardLink = true,
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
      {showDashboardLink ? (
        <Button asChild variant="primaryGreen">
          <Link href="/dashboard">Workspace</Link>
        </Button>
      ) : null}
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
